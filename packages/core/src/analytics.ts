import type { Rule } from '@segment/tsub/dist/store';
import deepmerge from 'deepmerge';
import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import {
  settingsCDN,
  workspaceDestinationFilterKey,
  defaultFlushInterval,
  defaultFlushAt,
  maxPendingEvents,
} from './constants';
import { getContext } from './context';
import {
  createAliasEvent,
  createGroupEvent,
  createIdentifyEvent,
  createScreenEvent,
  createTrackEvent,
} from './events';
import {
  CountFlushPolicy,
  Observable,
  TimerFlushPolicy,
} from './flushPolicies';
import { FlushPolicyExecuter } from './flushPolicies/flush-policy-executer';
import { DestinationPlugin, PlatformPlugin, Plugin } from './plugin';
import { SegmentDestination } from './plugins/SegmentDestination';
import {
  createGetter,
  DeepLinkData,
  Settable,
  Storage,
  Watchable,
} from './storage';
import { Timeline } from './timeline';
import {
  DestinationFilters,
  EventType,
  SegmentAPISettings,
  SegmentAPIConsentSettings,
  EdgeFunctionSettings,
  EnrichmentClosure,
} from './types';
import {
  Config,
  Context,
  DeepPartial,
  GroupTraits,
  IntegrationSettings,
  JsonMap,
  LoggerType,
  PluginType,
  SegmentAPIIntegrations,
  SegmentEvent,
  UserInfoState,
  UserTraits,
} from './types';
import {
  allSettled,
  getPluginsWithFlush,
  getPluginsWithReset,
  getURL,
} from './util';
import { getUUID } from './uuid';
import type { FlushPolicy } from './flushPolicies';
import {
  checkResponseForErrors,
  ErrorType,
  SegmentError,
  translateHTTPError,
} from './errors';
import { QueueFlushingPlugin } from './plugins/QueueFlushingPlugin';
import { WaitingPlugin } from './plugin';

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

  private flushPolicyExecuter: FlushPolicyExecuter = new FlushPolicyExecuter(
    [],
    () => {
      void this.flush();
    }
  );

  private onPluginAddedObservers: OnPluginAddedCallback[] = [];

  private readonly platformPlugins: PlatformPlugin[] = [];

  // Watchables
  /**
   * Observable to know when the client is fully initialized and ready to send events to destination
   */
  readonly isReady = new Observable<boolean>(false);
  /**
   * Access or subscribe to client enabled
   */
  readonly enabled: Watchable<boolean> & Settable<boolean>;
  /**
   * Access or subscribe to running state (controls event processing)
   */
  readonly running: Watchable<boolean> & Settable<boolean>;
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
   * Access or subscribe to edge functions settings
   */
  readonly edgeFunctionSettings: Watchable<EdgeFunctionSettings | undefined>;

  /**
   * Access or subscribe to destination filter settings
   */
  readonly filters: Watchable<DestinationFilters | undefined>;

  /**
   * Access or subscribe to user info (anonymousId, userId, traits)
   */
  readonly userInfo: Watchable<UserInfoState> & Settable<UserInfoState>;

  readonly deepLinkData: Watchable<DeepLinkData>;

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
    return [
      ...this.getPlugins(PluginType.before),
      ...this.getPlugins(PluginType.enrichment),
      ...this.getPlugins(PluginType.utility),
      ...this.getPlugins(PluginType.destination),
      ...this.getPlugins(PluginType.after),
    ];
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
  }: {
    config: Config;
    logger: LoggerType;
    store: Storage;
  }) {
    this.logger = logger;
    this.config = config;
    this.store = store;
    this.timeline = new Timeline();

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

    this.edgeFunctionSettings = {
      get: this.store.edgeFunctionSettings.get,
      onChange: this.store.edgeFunctionSettings.onChange,
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

    this.enabled = {
      get: this.store.enabled.get,
      set: this.store.enabled.set,
      onChange: this.store.enabled.onChange,
    };

    this.running = {
      get: this.store.running.get,
      set: this.store.running.set,
      onChange: this.store.running.onChange,
    };

    // add segment destination plugin unless
    // asked not to via configuration.
    if (this.config.autoAddSegmentDestination === true) {
      const segmentDestination = new SegmentDestination();
      this.add({ plugin: segmentDestination });
    }

    // Setup platform specific plugins
    this.platformPlugins.forEach((plugin) => this.add({ plugin: plugin }));

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
      // Set running to true to start event processing
      await this.store.running.set(true);
      // Process all pending events
      await this.processPendingEvents();
      // Trigger manual flush
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
  private getEndpointForSettings(): string {
    let settingsPrefix = '';
    let settingsEndpoint = '';
    const hasProxy = !!(this.config?.cdnProxy ?? '');
    const useSegmentEndpoints = Boolean(this.config?.useSegmentEndpoints);

    if (hasProxy) {
      settingsPrefix = this.config.cdnProxy ?? '';
      if (useSegmentEndpoints) {
        const isCdnProxyEndsWithSlash = settingsPrefix.endsWith('/');
        settingsEndpoint = isCdnProxyEndsWithSlash
          ? `projects/${this.config.writeKey}/settings`
          : `/projects/${this.config.writeKey}/settings`;
      }
    } else {
      settingsPrefix = settingsCDN;
      settingsEndpoint = `/${this.config.writeKey}/settings`;
    }
    try {
      return getURL(settingsPrefix, settingsEndpoint);
    } catch (error) {
      console.error(
        'Error in getEndpointForSettings:',
        `fallback to ${settingsCDN}/${this.config.writeKey}/settings`
      );
      return `${settingsCDN}/${this.config.writeKey}/settings`;
    }
  }

  async fetchSettings() {
    const settingsURL = this.getEndpointForSettings();
    try {
      const res = await fetch(settingsURL, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      checkResponseForErrors(res);

      const resJson: SegmentAPISettings =
        (await res.json()) as SegmentAPISettings;
      const integrations = resJson.integrations;
      const consentSettings = resJson.consentSettings;
      const edgeFunctionSettings = resJson.edgeFunction;
      const filters = this.generateFiltersMap(
        resJson.middlewareSettings?.routingRules ?? []
      );
      this.logger.info('Received settings from Segment succesfully.');
      await Promise.all([
        this.store.settings.set(integrations),
        this.store.consentSettings.set(consentSettings),
        this.store.edgeFunctionSettings.set(edgeFunctionSettings),
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
    //check for waiting plugin here
    if (plugin instanceof WaitingPlugin) {
      this.pauseEventProcessingForPlugin(plugin);
    }

    this.triggerOnPluginLoaded(plugin);
  }

  /**
     Removes and unloads plugins with a matching name from the system.

     - Parameter pluginName: An plugin name.
  */
  remove({ plugin }: { plugin: Plugin }) {
    this.timeline.remove(plugin);
  }

  async process(incomingEvent: SegmentEvent, enrichment?: EnrichmentClosure) {
    const event = this.applyRawEventData(incomingEvent);
    event.enrichment = enrichment;
    if (this.enabled.get() === false) {
      return;
    }
    if (this.running.get() && this.isReady.value) {
      return this.startTimelineProcessing(event);
    } else {
      this.store.pendingEvents.set((events) => {
        if (events.length >= maxPendingEvents) {
          return [...events.slice(1), event];
        }
        return [...events, event];
      });
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

    // Start flush policies
    // This should be done before any pending events are added to the queue so that any policies that rely on events queued can trigger accordingly
    this.setupFlushPolicies();
  }
  private async processPendingEvents() {
    const pending = await this.store.pendingEvents.get(true);
    for (const event of pending) {
      await this.startTimelineProcessing(event);
      await this.store.pendingEvents.remove(event);
    }
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

  async screen(
    name: string,
    options?: JsonMap,
    enrichment?: EnrichmentClosure
  ) {
    const event = createScreenEvent({
      name,
      properties: options,
    });

    await this.process(event, enrichment);
    this.logger.info('SCREEN event saved', event);
  }

  async track(
    eventName: string,
    options?: JsonMap,
    enrichment?: EnrichmentClosure
  ) {
    const event = createTrackEvent({
      event: eventName,
      properties: options,
    });

    await this.process(event, enrichment);
    this.logger.info('TRACK event saved', event);
  }

  async identify(
    userId?: string,
    userTraits?: UserTraits,
    enrichment?: EnrichmentClosure
  ) {
    const event = createIdentifyEvent({
      userId: userId,
      userTraits: userTraits,
    });

    await this.process(event, enrichment);
    this.logger.info('IDENTIFY event saved', event);
  }

  async group(
    groupId: string,
    groupTraits?: GroupTraits,
    enrichment?: EnrichmentClosure
  ) {
    const event = createGroupEvent({
      groupId,
      groupTraits,
    });

    await this.process(event, enrichment);
    this.logger.info('GROUP event saved', event);
  }

  async alias(newUserId: string, enrichment?: EnrichmentClosure) {
    // We don't use a concurrency safe version of get here as we don't want to lock the values yet,
    // we will update the values correctly when InjectUserInfo processes the change
    const { anonymousId, userId: previousUserId } = this.store.userInfo.get();

    const event = createAliasEvent({
      anonymousId,
      userId: previousUserId,
      newUserId,
    });

    await this.process(event, enrichment);
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
    const context = await getContext(undefined, this.config);

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
        (this.appState === 'active' || this.appState === 'unknown') && // Check if appState is 'active' or 'unknown'
        ['inactive', 'background'].includes(nextAppState)
      ) {
        // Check if next app state is 'inactive' or 'background'
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
      const anonymousId = resetAnonymousId === true ? getUUID() : currentId;

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
    const i = this.onPluginAddedObservers.push(callback);

    return () => {
      this.onPluginAddedObservers.splice(i, 1);
    };
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

    for (const fp of flushPolicies) {
      this.flushPolicyExecuter.add(fp);
    }
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
      messageId: getUUID(),
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
  /* Method for clearing flush queue */
  clear() {
    const plugins = this.getPlugins();

    plugins.forEach(async (plugin) => {
      if (plugin instanceof SegmentDestination) {
        const timelinePlugins = plugin.timeline?.plugins?.after ?? [];

        for (const subPlugin of timelinePlugins) {
          if (subPlugin instanceof QueueFlushingPlugin) {
            await subPlugin.dequeueEvents();
          }
        }
      }
    });

    this.flushPolicyExecuter.reset();
  }

  /**
   * Method to get count of events in flush queue.
   */
  async pendingEvents() {
    const plugins = this.getPlugins();
    let totalEventsCount = 0;

    for (const plugin of plugins) {
      // We're looking inside SegmentDestination's `after` plugins
      if (plugin instanceof SegmentDestination) {
        const timelinePlugins = plugin.timeline?.plugins?.after ?? [];

        for (const subPlugin of timelinePlugins) {
          if (subPlugin instanceof QueueFlushingPlugin) {
            const eventsCount = await subPlugin.pendingEvents();
            totalEventsCount += eventsCount;
          }
        }
      }
    }

    return totalEventsCount;
  }
  private resumeTimeoutId?: ReturnType<typeof setTimeout>;
  private waitingPlugins = new Set<WaitingPlugin>();

  /**
   * Pause event processing for a specific WaitingPlugin.
   * Events will be buffered until all waiting plugins resume.
   *
   * @param plugin - The WaitingPlugin requesting the pause
   * @internal This is called automatically when a WaitingPlugin is added
   */
  pauseEventProcessingForPlugin(plugin?: WaitingPlugin) {
    if (plugin) {
      this.waitingPlugins.add(plugin);
    }
    this.pauseEventProcessing();
  }

  /**
   * Resume event processing for a specific WaitingPlugin.
   * If all waiting plugins have resumed, buffered events will be processed.
   *
   * @param plugin - The WaitingPlugin that has completed its async work
   * @internal This is called automatically when a WaitingPlugin calls resume()
   */
  async resumeEventProcessingForPlugin(plugin?: WaitingPlugin) {
    if (plugin) {
      this.waitingPlugins.delete(plugin);
    }
    if (this.waitingPlugins.size > 0) {
      return; // still blocked by other waiting plugins
    }

    await this.resumeEventProcessing();
  }

  /**
   * Pause event processing globally.
   * New events will be buffered in memory until resumeEventProcessing() is called.
   * Automatically resumes after the specified timeout to prevent permanent blocking.
   *
   * @param timeout - Milliseconds to wait before auto-resuming (default: 30000)
   */
  pauseEventProcessing(timeout = 30000) {
    // IMPORTANT: ignore repeated pauses
    const running = this.store.running.get();
    if (!running) {
      return;
    }

    // Fire-and-forget: state is updated synchronously in-memory, persistence happens async
    void this.store.running.set(false);

    // Only set timeout if not already set (prevents multiple waiting plugins from overwriting)
    if (!this.resumeTimeoutId) {
      this.resumeTimeoutId = setTimeout(async () => {
        await this.resumeEventProcessing();
      }, timeout);
    }
  }

  /**
   * Resume event processing and process all buffered events.
   * This is called automatically by WaitingPlugins when they complete,
   * or after the timeout expires.
   */
  async resumeEventProcessing() {
    const running = this.store.running.get();
    if (running) {
      return;
    }

    if (this.resumeTimeoutId) {
      clearTimeout(this.resumeTimeoutId);
      this.resumeTimeoutId = undefined;
    }
    await this.store.running.set(true);
    await this.processPendingEvents();
  }
}
