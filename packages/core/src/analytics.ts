import type { Rule } from '@segment/tsub/dist/store';
import deepmerge from 'deepmerge';
import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import type {
  DeviceInfoProvider,
  SegmentAPIConsentSettings,
  UUIDProvider,
} from '.';
import {
  defaultFlushAt,
  defaultFlushInterval,
  settingsCDN,
  workspaceDestinationFilterKey,
} from './constants';
import { defaultContext, getContext } from './context';
import {
  ErrorType,
  SegmentError,
  checkResponseForErrors,
  translateHTTPError,
} from './errors';
import {
  createAliasEvent,
  createGroupEvent,
  createIdentifyEvent,
  createScreenEvent,
  createTrackEvent,
} from './events';
import type { FlushPolicy } from './flushPolicies';
import {
  CountFlushPolicy,
  Observable,
  TimerFlushPolicy,
} from './flushPolicies';
import { FlushPolicyExecuter } from './flushPolicies/flush-policy-executer';
import { AnalyticsReactNativeModule } from './native-module';
import type { DestinationPlugin, PlatformPlugin, Plugin } from './plugin';
import { SegmentDestination } from './plugins/SegmentDestination';
import {
  DeepLinkData,
  Settable,
  Storage,
  Watchable,
  createGetter,
} from './storage';
import { Timeline } from './timeline';
import {
  Config,
  Context,
  DeepPartial,
  DestinationFilters,
  EventType,
  GroupTraits,
  IntegrationSettings,
  JsonMap,
  LoggerType,
  PluginType,
  SegmentAPIIntegrations,
  SegmentAPISettings,
  SegmentEvent,
  UserInfoState,
  UserTraits,
} from './types';
import { allSettled, getPluginsWithFlush, getPluginsWithReset } from './util';

type OnPluginAddedCallback = (plugin: Plugin) => void;

export class SegmentClient {
  // the config parameters for the client - a merge of user provided and default options
  private config: Config;

  // Storage
  private store: Storage;

  // current app state
  private appState: AppStateStatus | 'unknown' = 'unknown';

  // subscription for propagating changes to appState
  private appStateSubscription?: NativeEventSubscription;

  // logger
  public logger: LoggerType;

  // whether the user has called cleanup
  private destroyed = false;

  private isAddingPlugins = false;

  private timeline: Timeline;

  private pluginsToAdd: Plugin[] = [];

  private flushPolicyExecuter!: FlushPolicyExecuter;

  private onPluginAddedObservers: OnPluginAddedCallback[] = [];

  private readonly platformPlugins: PlatformPlugin[] = [];

  // Watchables
  /**
   * Observable to know when the client is fully initialized and ready to send events to destination
   */
  readonly isReady = new Observable<boolean>(false);
  /**
   * Access or subscribe to client context
   */
  readonly context: Watchable<DeepPartial<Context> | undefined> &
    Settable<DeepPartial<Context>>;

  /**
   * Access or subscribe to adTrackingEnabled (also accesible from context)
   */
  readonly adTrackingEnabled: Watchable<boolean>;

  /**
   * Access or subscribe to integration settings
   */
  readonly settings: Watchable<SegmentAPIIntegrations | undefined>;

  /**
   * Access or subscribe to integration settings
   */
  readonly consentSettings: Watchable<SegmentAPIConsentSettings | undefined>;

  /**
   * Access or subscribe to destination filter settings
   */
  readonly filters: Watchable<DestinationFilters | undefined>;

  /**
   * Access or subscribe to user info (anonymousId, userId, traits)
   */
  readonly userInfo: Watchable<UserInfoState> & Settable<UserInfoState>;

  readonly deepLinkData: Watchable<DeepLinkData>;

  readonly deviceInfoProvider: DeviceInfoProvider;
  readonly uuidProvider: UUIDProvider;
  // private telemetry?: Telemetry;

  /**
   * Returns the plugins currently loaded in the timeline
   * @param ofType Type of plugins, defaults to all
   * @returns List of Plugin objects
   */
  getPlugins(ofType?: PluginType): readonly Plugin[] {
    const plugins = { ...this.timeline.plugins };
    if (ofType !== undefined) {
      return [...(plugins[ofType] ?? [])];
    }
    return (
      [
        ...this.getPlugins(PluginType.before),
        ...this.getPlugins(PluginType.enrichment),
        ...this.getPlugins(PluginType.utility),
        ...this.getPlugins(PluginType.destination),
        ...this.getPlugins(PluginType.after),
      ] ?? []
    );
  }

  /**
   * Retrieves a copy of the current client configuration
   */
  getConfig() {
    return { ...this.config };
  }

  constructor({
    config,
    logger,
    store,
    uuidProvider,
  }: {
    config: Config;
    logger: LoggerType;
    store: Storage;
    uuidProvider?: UUIDProvider;
  }) {
    this.logger = logger;
    this.config = config;
    this.store = store;
    this.timeline = new Timeline();

    this.deviceInfoProvider =
      this.config.deviceInfoProvider ??
      AnalyticsReactNativeModule?.getContextInfo ??
      (() => Promise.resolve({ ...defaultContext }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.uuidProvider = uuidProvider ?? require('./uuid').getUUID;

    // Initialize the watchables
    this.context = {
      get: this.store.context.get,
      set: this.store.context.set,
      onChange: this.store.context.onChange,
    };

    this.adTrackingEnabled = {
      get: createGetter(
        () => this.store.context.get()?.device?.adTrackingEnabled ?? false,
        async () => {
          const context = await this.store.context.get(true);
          return context?.device?.adTrackingEnabled ?? false;
        }
      ),
      onChange: (callback: (value: boolean) => void) =>
        this.store.context.onChange((context?: DeepPartial<Context>) => {
          callback(context?.device?.adTrackingEnabled ?? false);
        }),
    };

    this.settings = {
      get: this.store.settings.get,
      onChange: this.store.settings.onChange,
    };

    this.consentSettings = {
      get: this.store.consentSettings.get,
      onChange: this.store.consentSettings.onChange,
    };

    this.filters = {
      get: this.store.filters.get,
      onChange: this.store.filters.onChange,
    };

    this.userInfo = {
      get: this.store.userInfo.get,
      set: this.store.userInfo.set,
      onChange: this.store.userInfo.onChange,
    };

    this.deepLinkData = {
      get: this.store.deepLinkData.get,
      onChange: this.store.deepLinkData.onChange,
    };

    // add segment destination plugin unless
    // asked not to via configuration.
    if (this.config.autoAddSegmentDestination === true) {
      const segmentDestination = new SegmentDestination();
      this.add({ plugin: segmentDestination });
    }

    // Setup platform specific plugins
    this.platformPlugins.forEach((plugin) => this.add({ plugin: plugin }));

    // Start flush policies
    this.setupFlushPolicies();

    // set up tracking for lifecycle events
    this.setupLifecycleEvents();
  }

  // Watch for isReady so that we can handle any pending events
  private async storageReady(): Promise<boolean> {
    return new Promise((resolve) => {
      this.store.isReady.onChange((value) => {
        resolve(value);
      });
    });
  }

  /**
   * Initializes the client plugins, settings and subscribers.
   * Can only be called once.
   */
  async init() {
    try {
      if (this.isReady.value) {
        this.logger.warn('SegmentClient already initialized');
        return;
      }

      if ((await this.store.isReady.get(true)) === false) {
        await this.storageReady();
      }

      // Get new settings from segment
      // It's important to run this before checkInstalledVersion and trackDeeplinks to give time for destination plugins
      // which make use of the settings object to initialize
      await this.fetchSettings();

      await allSettled([
        // save the current installed version
        this.checkInstalledVersion(),
        // check if the app was opened from a deep link
        this.trackDeepLinks(),
      ]);

      await this.onReady();
      this.isReady.value = true;

      // flush any stored events
      this.flushPolicyExecuter.manualFlush();
    } catch (error) {
      this.reportInternalError(
        new SegmentError(
          ErrorType.InitializationError,
          'Client did not initialize correctly',
          error
        )
      );
    }
  }

  private generateFiltersMap(rules: Rule[]): DestinationFilters {
    const map: DestinationFilters = {};

    for (const r of rules) {
      const key = r.destinationName ?? workspaceDestinationFilterKey;
      map[key] = r;
    }

    return map;
  }

  async fetchSettings() {
    const settingsPrefix: string = this.config.cdnProxy ?? settingsCDN;
    const settingsEndpoint = `${settingsPrefix}/${this.config.writeKey}/settings`;

    try {
      const res = await fetch(settingsEndpoint);
      checkResponseForErrors(res);

      const resJson: SegmentAPISettings =
        (await res.json()) as SegmentAPISettings;
      const integrations = resJson.integrations;
      const consentSettings = resJson.consentSettings;
      const filters = this.generateFiltersMap(
        resJson.middlewareSettings?.routingRules ?? []
      );
      this.logger.info('Received settings from Segment succesfully.');
      await Promise.all([
        this.store.settings.set(integrations),
        this.store.consentSettings.set(consentSettings),
        this.store.filters.set(filters),
      ]);
    } catch (e) {
      this.reportInternalError(translateHTTPError(e));

      this.logger.warn(
        `Could not receive settings from Segment. ${
          this.config.defaultSettings
            ? 'Will use the default settings.'
            : 'Device mode destinations will be ignored unless you specify default settings in the client config.'
        }`
      );

      if (this.config.defaultSettings) {
        await this.store.settings.set(this.config.defaultSettings.integrations);
      }
    }
  }

  /**
   * There is no garbage collection in JS, which means that any listeners, timeouts and subscriptions
   * would run until the application closes
   *
   * This method exists in case the user for some reason needs to recreate the class instance during runtime.
   * In this case, they should run client.cleanup() to destroy the listeners in the old client before creating a new one.
   *
   * There is a Stage 3 EMCAScript proposal to add a user-defined finalizer, which we could potentially switch to if
   * it gets approved: https://github.com/tc39/proposal-weakrefs#finalizers
   */
  cleanup() {
    this.flushPolicyExecuter.cleanup();
    this.appStateSubscription?.remove();

    this.destroyed = true;
  }

  private setupLifecycleEvents() {
    this.appStateSubscription?.remove();

    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        this.handleAppStateChange(nextAppState);
      }
    );
  }

  /**
     Applies the supplied closure to the currently loaded set of plugins.
     NOTE: This does not apply to plugins contained within DestinationPlugins.

     - Parameter closure: A closure that takes an plugin to be operated on as a parameter.

  */
  apply(closure: (plugin: Plugin) => void) {
    this.timeline.apply(closure);
  }

  /**
   * Adds a new plugin to the currently loaded set.
   * @param {{ plugin: Plugin, settings?: IntegrationSettings }} Plugin to be added. Settings are optional if you want to force a configuration instead of the Segment Cloud received one
   */
  add<P extends Plugin>({
    plugin,
    settings,
  }: {
    plugin: P;
    settings?: P extends DestinationPlugin ? IntegrationSettings : never;
  }) {
    // plugins can either be added immediately or
    // can be cached and added later during the next state update
    // this is to avoid adding plugins before network requests made as part of setup have resolved
    if (settings !== undefined && plugin.type === PluginType.destination) {
      void this.store.settings.add(
        (plugin as unknown as DestinationPlugin).key,
        settings
      );
    }

    if (!this.isReady.value) {
      this.pluginsToAdd.push(plugin);
    } else {
      this.addPlugin(plugin);
    }
  }

  private addPlugin(plugin: Plugin) {
    plugin.configure(this);
    this.timeline.add(plugin);
    this.triggerOnPluginLoaded(plugin);
  }

  /**
     Removes and unloads plugins with a matching name from the system.

     - Parameter pluginName: An plugin name.
  */
  remove({ plugin }: { plugin: Plugin }) {
    this.timeline.remove(plugin);
  }

  async process(incomingEvent: SegmentEvent) {
    const event = this.applyRawEventData(incomingEvent);

    if (this.isReady.value) {
      return this.startTimelineProcessing(event);
    } else {
      this.store.pendingEvents.add(event);
      return event;
    }
  }

  /**
   * Starts timeline processing
   * @param incomingEvent Segment Event
   * @returns Segment Event
   */
  private async startTimelineProcessing(
    incomingEvent: SegmentEvent
  ): Promise<SegmentEvent | undefined> {
    const event = await this.applyContextData(incomingEvent);
    this.flushPolicyExecuter.notify(event);
    return this.timeline.process(event);
  }

  private async trackDeepLinks() {
    if (this.getConfig().trackDeepLinks === true) {
      const deepLinkProperties = await this.store.deepLinkData.get(true);
      this.trackDeepLinkEvent(deepLinkProperties);

      this.store.deepLinkData.onChange((data) => {
        this.trackDeepLinkEvent(data);
      });
    }
  }

  private trackDeepLinkEvent(deepLinkProperties: DeepLinkData) {
    if (deepLinkProperties.url !== '') {
      const event = createTrackEvent({
        event: 'Deep Link Opened',
        properties: {
          ...deepLinkProperties,
        },
      });

      void this.process(event);
      this.logger.info('TRACK (Deep Link Opened) event saved', event);
    }
  }

  /**
   * Executes when everything in the client is ready for sending events
   * @param isReady
   */
  private async onReady() {
    // Add all plugins awaiting store
    if (this.pluginsToAdd.length > 0 && !this.isAddingPlugins) {
      this.isAddingPlugins = true;
      try {
        // start by adding the plugins
        this.pluginsToAdd.forEach((plugin) => {
          this.addPlugin(plugin);
        });

        // now that they're all added, clear the cache
        // this prevents this block running for every update
        this.pluginsToAdd = [];
      } finally {
        this.isAddingPlugins = false;
      }
    }

    // Send all events in the queue
    const pending = await this.store.pendingEvents.get(true);
    for (const e of pending) {
      await this.startTimelineProcessing(e);
      await this.store.pendingEvents.remove(e);
    }
    // this.store.pendingEvents.set([]);
  }

  async flush(): Promise<void> {
    try {
      if (this.destroyed) {
        return;
      }

      this.flushPolicyExecuter.reset();

      const promises: (void | Promise<void>)[] = [];
      getPluginsWithFlush(this.timeline).forEach((plugin) => {
        promises.push(plugin.flush());
      });

      const results = await allSettled(promises);
      for (const r of results) {
        if (r.status === 'rejected') {
          this.reportInternalError(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            new SegmentError(ErrorType.FlushError, `Flush failed: ${r.reason}`)
          );
        }
      }
    } catch (error) {
      this.reportInternalError(
        new SegmentError(ErrorType.FlushError, 'Flush failed', error)
      );
    }
  }

  async screen(name: string, options?: JsonMap) {
    const event = createScreenEvent({
      name,
      properties: options,
    });

    await this.process(event);
    this.logger.info('SCREEN event saved', event);
  }

  async track(eventName: string, options?: JsonMap) {
    const event = createTrackEvent({
      event: eventName,
      properties: options,
    });

    await this.process(event);
    this.logger.info('TRACK event saved', event);
  }

  async identify(userId?: string, userTraits?: UserTraits) {
    const event = createIdentifyEvent({
      userId: userId,
      userTraits: userTraits,
    });

    await this.process(event);
    this.logger.info('IDENTIFY event saved', event);
  }

  async group(groupId: string, groupTraits?: GroupTraits) {
    const event = createGroupEvent({
      groupId,
      groupTraits,
    });

    await this.process(event);
    this.logger.info('GROUP event saved', event);
  }

  async alias(newUserId: string) {
    // We don't use a concurrency safe version of get here as we don't want to lock the values yet,
    // we will update the values correctly when InjectUserInfo processes the change
    const { anonymousId, userId: previousUserId } = this.store.userInfo.get();

    const event = createAliasEvent({
      anonymousId,
      userId: previousUserId,
      newUserId,
    });

    await this.process(event);
    this.logger.info('ALIAS event saved', event);
  }

  /**
   * Called once when the client is first created
   *
   * Detect and save the the currently installed application version
   * Send application lifecycle events if trackAppLifecycleEvents is enabled
   *
   * Exactly one of these events will be sent, depending on the current and previous version:s
   * Application Installed - no information on the previous version, so it's a fresh install
   * Application Updated - the previous detected version is different from the current version
   * Application Opened - the previously detected version is same as the current version
   */
  private async checkInstalledVersion() {
    const context = await getContext({
      collectDeviceId: this.config?.collectDeviceId ?? false,
      deviceInfoProvider: this.deviceInfoProvider,
      uuidProvider: this.uuidProvider,
    });

    const previousContext = this.store.context.get();

    // Only overwrite the previous context values to preserve any values that are added by enrichment plugins like IDFA
    await this.store.context.set(deepmerge(previousContext ?? {}, context));

    if (this.config.trackAppLifecycleEvents !== true) {
      return;
    }

    if (previousContext?.app === undefined) {
      const event = createTrackEvent({
        event: 'Application Installed',
        properties: {
          version: context.app.version,
          build: context.app.build,
        },
      });
      void this.process(event);
      this.logger.info('TRACK (Application Installed) event saved', event);
    } else if (context.app.version !== previousContext.app.version) {
      const event = createTrackEvent({
        event: 'Application Updated',
        properties: {
          version: context.app.version,
          build: context.app.build,
          previous_version: previousContext.app.version,
          previous_build: previousContext.app.build,
        },
      });
      void this.process(event);
      this.logger.info('TRACK (Application Updated) event saved', event);
    }

    const event = createTrackEvent({
      event: 'Application Opened',
      properties: {
        from_background: false,
        version: context.app.version,
        build: context.app.build,
      },
    });
    void this.process(event);
    this.logger.info('TRACK (Application Opened) event saved', event);
  }

  /**
   * AppState event listener. Called whenever the app state changes.
   *
   * Send application lifecycle events if trackAppLifecycleEvents is enabled.
   *
   * Application Opened - only when the app state changes from 'inactive' or 'background' to 'active'
   *   The initial event from 'unknown' to 'active' is handled on launch in checkInstalledVersion
   * Application Backgrounded - when the app state changes from 'inactive' or 'background' to 'active
   *
   * @param nextAppState 'active', 'inactive', 'background' or 'unknown'
   */
  private handleAppStateChange(nextAppState: AppStateStatus) {
    if (this.config.trackAppLifecycleEvents === true) {
      if (
        ['inactive', 'background'].includes(this.appState) &&
        nextAppState === 'active'
      ) {
        const context = this.store.context.get();
        const event = createTrackEvent({
          event: 'Application Opened',
          properties: {
            from_background: true,
            version: context?.app?.version,
            build: context?.app?.build,
          },
        });
        void this.process(event);
        this.logger.info('TRACK (Application Opened) event saved', event);
      } else if (
        this.appState === 'active' &&
        ['inactive', 'background'].includes(nextAppState)
      ) {
        const event = createTrackEvent({
          event: 'Application Backgrounded',
        });
        void this.process(event);
        this.logger.info('TRACK (Application Backgrounded) event saved', event);
      }
    }

    this.appState = nextAppState;
  }

  async reset(resetAnonymousId = true) {
    try {
      const { anonymousId: currentId } = await this.store.userInfo.get(true);
      const anonymousId =
        resetAnonymousId === true ? this.uuidProvider() : currentId;

      await this.store.userInfo.set({
        anonymousId,
        userId: undefined,
        traits: undefined,
      });

      await allSettled(
        getPluginsWithReset(this.timeline).map((plugin) => plugin.reset())
      );

      this.logger.info('Client has been reset');
    } catch (error) {
      this.reportInternalError(
        new SegmentError(ErrorType.ResetError, 'Error during reset', error)
      );
    }
  }

  /**
   * Registers a callback for each plugin that gets added to the analytics client.
   * @param callback Function to call
   */
  onPluginLoaded(callback: OnPluginAddedCallback) {
    this.onPluginAddedObservers.push(callback);
  }

  private triggerOnPluginLoaded(plugin: Plugin) {
    this.onPluginAddedObservers.map((f) => f?.(plugin));
  }

  /**
   * Initializes the flush policies from config and subscribes to updates to
   * trigger flush
   */
  private setupFlushPolicies() {
    const flushPolicies = [];

    // If there are zero policies or flushAt/flushInterval use the defaults:
    if (this.config.flushPolicies !== undefined) {
      flushPolicies.push(...this.config.flushPolicies);
    } else {
      if (
        this.config.flushAt === undefined ||
        (this.config.flushAt !== null && this.config.flushAt > 0)
      ) {
        flushPolicies.push(
          new CountFlushPolicy(this.config.flushAt ?? defaultFlushAt)
        );
      }

      if (
        this.config.flushInterval === undefined ||
        (this.config.flushInterval !== null && this.config.flushInterval > 0)
      ) {
        flushPolicies.push(
          new TimerFlushPolicy(
            (this.config.flushInterval ?? defaultFlushInterval) * 1000
          )
        );
      }
    }

    this.flushPolicyExecuter = new FlushPolicyExecuter(flushPolicies, () => {
      void this.flush();
    });
  }

  /**
   * Adds a FlushPolicy to the list
   * @param policies policies to add
   */
  addFlushPolicy(...policies: FlushPolicy[]) {
    for (const policy of policies) {
      this.flushPolicyExecuter.add(policy);
    }
  }

  /**
   * Removes a FlushPolicy from the execution
   *
   * @param policies policies to remove
   * @returns true if the value was removed, false if not found
   */
  removeFlushPolicy(...policies: FlushPolicy[]) {
    for (const policy of policies) {
      this.flushPolicyExecuter.remove(policy);
    }
  }

  /**
   * Returns the current enabled flush policies
   */
  getFlushPolicies() {
    return this.flushPolicyExecuter.policies;
  }

  reportInternalError(error: SegmentError, fatal = false) {
    if (fatal) {
      this.logger.error('A critical error ocurred: ', error);
    } else {
      this.logger.warn('An internal error occurred: ', error);
    }
    this.config.errorHandler?.(error);
  }

  /**
   * Sets the messageId and timestamp
   * @param event Segment Event
   * @returns event with data injected
   */
  private applyRawEventData = (event: SegmentEvent): SegmentEvent => {
    return {
      ...event,
      messageId: this.uuidProvider(),
      timestamp: new Date().toISOString(),
      integrations: event.integrations ?? {},
    } as SegmentEvent;
  };

  /**
   * Injects context and userInfo data into the event
   * This is handled outside of the timeline to prevent concurrency issues between plugins
   * This is only added after the client is ready to let the client restore values from storage
   * @param event Segment Event
   * @returns event with data injected
   */
  private applyContextData = async (
    event: SegmentEvent
  ): Promise<SegmentEvent> => {
    const userInfo = await this.processUserInfo(event);
    const context = await this.context.get(true);

    return {
      ...event,
      ...userInfo,
      context: {
        ...event.context,
        ...context,
      },
    } as SegmentEvent;
  };

  /**
   * Processes the userInfo to add to an event.
   * For Identify and Alias: it saves the new userId and traits into the storage
   * For all: set the userId and anonymousId from the current values
   * @param event segment event
   * @returns userInfo to inject to an event
   */
  private processUserInfo = async (
    event: SegmentEvent
  ): Promise<Partial<SegmentEvent>> => {
    // Order here is IMPORTANT!
    // Identify and Alias userInfo set operations have to come as soon as possible
    // Do not block the set by doing a safe get first as it might cause a race condition
    // within events procesing in the timeline asyncronously
    if (event.type === EventType.IdentifyEvent) {
      const userInfo = await this.userInfo.set((state) => ({
        ...state,
        userId: event.userId ?? state.userId,
        traits: {
          ...state.traits,
          ...event.traits,
        },
      }));

      return {
        anonymousId: userInfo.anonymousId,
        userId: event.userId ?? userInfo.userId,
        traits: {
          ...userInfo.traits,
          ...event.traits,
        },
      };
    } else if (event.type === EventType.AliasEvent) {
      let previousUserId: string;

      const userInfo = await this.userInfo.set((state) => {
        previousUserId = state.userId ?? state.anonymousId;

        return {
          ...state,
          userId: event.userId,
        };
      });

      return {
        anonymousId: userInfo.anonymousId,
        userId: event.userId,
        previousId: previousUserId!,
      };
    }

    const userInfo = await this.userInfo.get(true);
    return {
      anonymousId: userInfo.anonymousId,
      userId: userInfo.userId,
    };
  };
}
