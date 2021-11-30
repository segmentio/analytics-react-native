import type { Unsubscribe } from '@reduxjs/toolkit';
import { AppState, AppStateStatus, Linking } from 'react-native';
import type { Persistor } from 'redux-persist';
import { sendEvents } from './api';
import { getContext } from './context';

import {
  applyRawEventData,
  createAliasEvent,
  createGroupEvent,
  createIdentifyEvent,
  createScreenEvent,
  createTrackEvent,
} from './events';
import type { Logger } from './logger';
import type { DestinationPlugin, PlatformPlugin, Plugin } from './plugin';
import { InjectContext } from './plugins/Context';
import { SegmentDestination } from './plugins/SegmentDestination';
import {
  actions as ReduxActions,
  getEvents,
  getEventsToRetry,
  getStoreWatcher,
  Store,
} from './store';
import { Timeline } from './timeline';
import {
  Config,
  Context,
  DeepPartial,
  GroupTraits,
  JsonMap,
  PluginType,
  SegmentAPISettings,
  SegmentEvent,
  UserTraits,
} from './types';
import { chunk, getPluginsWithFlush } from './util';

export class SegmentClient {
  // the config parameters for the client - a merge of user provided and default options
  private config: Config;

  // redux store
  private store: Store;

  // redux actions
  private actions: typeof ReduxActions;

  // persistor for the redux store
  private persistor: Persistor;

  // how many seconds has elapsed since the last time events were sent
  private secondsElapsed: number = 0;

  // current app state
  private appState: AppStateStatus | 'unknown' = 'unknown';

  // subscription for propagating changes to appState
  private appStateSubscription: any;

  // logger
  public logger: Logger;

  // timeout for refreshing the failed events queue
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  // internal time to know when to flush, ticks every second
  private interval: ReturnType<typeof setTimeout> | null = null;

  // unsubscribe watchers for the redux store
  private watchers: Unsubscribe[] = [];

  // whether the user has called cleanup
  private destroyed: boolean = false;

  // has a pending upload to respond
  private isPendingUpload: boolean = false;

  // has a pending upload of the events to retry upload
  private isPendingRetryUpload: boolean = false;

  private isAddingPlugins: boolean = false;

  private timeline: Timeline;

  /**
   * Watches changes to redux store
   */
  watch: ReturnType<typeof getStoreWatcher>;

  // mechanism to prevent adding plugins before we are fully initalised
  private isReady = false;
  private pluginsToAdd: Plugin[] = [];

  get platformPlugins() {
    const plugins: PlatformPlugin[] = [];

    // add context plugin as well as it's platform specific internally.
    // this must come first.
    plugins.push(new InjectContext());

    // setup lifecycle if desired
    if (this.config.trackAppLifecycleEvents) {
      // todo: more plugins!
    }

    return plugins;
  }

  /**
   * Retrieves a copy of the settings
   * @returns Configuration object for all plugins
   */
  getSettings() {
    const { system } = this.store.getState();
    return { integrations: { ...system.settings?.integrations } };
  }

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

  getContext() {
    return { ...this.store.getState().main.context };
  }

  updateContext(context: DeepPartial<Context>) {
    this.store.dispatch(this.actions.main.updateContext({ context }));
  }

  getConfig() {
    return { ...this.config };
  }

  getUserInfo() {
    return { ...this.store.getState().userInfo };
  }

  getEvents() {
    return [...getEvents(this.store.getState())];
  }

  getEventsToRetry() {
    return [...getEventsToRetry(this.store.getState())];
  }

  getPersistor() {
    return this.persistor;
  }

  constructor({
    config,
    logger,
    store,
    actions,
    persistor,
  }: {
    config: Config;
    logger: Logger;
    store: any;
    persistor: Persistor;
    actions: any;
  }) {
    this.logger = logger;
    this.config = config;
    this.store = store;
    this.actions = actions;
    this.persistor = persistor;
    this.timeline = new Timeline();

    this.watch = getStoreWatcher(this.store);

    // Get everything running
    this.platformStartup();
  }

  platformStartup() {
    // add segment destination plugin unless
    // asked not to via configuration.
    if (this.config.autoAddSegmentDestination) {
      const segmentDestination = new SegmentDestination();
      this.add({ plugin: segmentDestination });
    }

    // Setup platform specific plugins
    this.platformPlugins.forEach((plugin) => this.add({ plugin: plugin }));
  }

  configure() {
    this.store.dispatch(
      this.actions.system.init({ configuration: this.config })
    );
  }

  async fetchSettings() {
    const settingsEndpoint = `https://cdn-settings.segment.com/v1/projects/${this.config.writeKey}/settings`;

    try {
      const res = await fetch(settingsEndpoint);
      const resJson = await res.json();
      this.logger.info(`Received settings from Segment succesfully.`);
      this.store.dispatch(
        this.actions.system.updateSettings({ settings: resJson })
      );
    } catch {
      this.logger.warn(
        `Could not receive settings from Segment. ${
          this.config.defaultSettings
            ? 'Will use the default settings.'
            : 'Device mode destinations will be ignored unless you specify default settings in the client config.'
        }`
      );
      if (this.config.defaultSettings) {
        this.store.dispatch(
          this.actions.system.updateSettings({
            settings: this.config.defaultSettings,
          })
        );
      }
    }
  }

  /**
   * Clears all subscriptions to the redux store
   */
  private unsubscribeWatchers() {
    if (this.watchers.length > 0) {
      for (const unsubscribe of this.watchers) {
        try {
          unsubscribe();
        } catch (e) {
          this.logger.error(e);
        }
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
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.unsubscribeWatchers();

    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.appStateSubscription?.remove();

    this.destroyed = true;
  }

  async bootstrapStore() {
    return new Promise<void>((resolve) => {
      if (this.persistor.getState().bootstrapped) {
        resolve();
      } else {
        this.persistor.subscribe(() => {
          const { bootstrapped } = this.persistor.getState();
          if (bootstrapped) {
            resolve();
          }
        });
      }
    });
  }

  setupInterval() {
    if (this.interval !== null && this.interval !== undefined) {
      clearInterval(this.interval);
    }
    this.interval = setInterval(() => this.tick(), 1000) as any;
  }

  setupStoreSubscribe() {
    this.unsubscribeWatchers();
    this.watchers.push(this.store.subscribe(() => this.onUpdateStore()));

    this.watchers.push(
      this.watch(getEvents, (events: SegmentEvent[]) => {
        if (events.length >= this.config.flushAt!) {
          this.flush();
        }
      })
    );

    this.watchers.push(
      this.watch(getEventsToRetry, (events: SegmentEvent[]) => {
        if (events.length >= 0) {
          this.flushRetry();
        }
      })
    );
  }

  setupLifecycleEvents() {
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
   * @param {{ plugin: Plugin, settings?: SegmentAPISettings }} Plugin to be added. Settings are optional if you want to force a configuration instead of the Segment Cloud received one
   */
  add({
    plugin,
    settings,
  }: {
    plugin: Plugin;
    settings?: Plugin extends DestinationPlugin ? SegmentAPISettings : never;
  }) {
    // plugins can either be added immediately or
    // can be cached and added later during the next state update
    // this is to avoid adding plugins before network requests made as part of setup have resolved
    if (settings !== undefined && plugin.type === PluginType.destination) {
      this.store.dispatch(
        this.actions.system.addDestination({
          destination: {
            key: (plugin as DestinationPlugin).key,
            settings,
          },
        })
      );
    }

    if (!this.isReady) {
      this.pluginsToAdd.push(plugin);
    } else {
      this.addPlugin(plugin);
    }
  }

  private addPlugin(plugin: Plugin) {
    plugin.configure(this);
    this.timeline.add(plugin);
  }

  /**
     Removes and unloads plugins with a matching name from the system.

     - Parameter pluginName: An plugin name.
  */
  remove({ plugin }: { plugin: Plugin }) {
    this.timeline.remove(plugin);
  }

  process(incomingEvent: SegmentEvent) {
    const event = applyRawEventData(incomingEvent, this.store);
    this.timeline.process(event);
  }

  async trackDeepLinks() {
    const url = await Linking.getInitialURL();

    Linking.addEventListener('url', (e) => {
      console.log('URL', e.url);

      if (this.config.trackDeepLinks === true) {
        const trackEvent = createTrackEvent({
          event: 'Deep Link Opened',
          properties: {
            url,
          },
        });
        this.process(trackEvent);
        if (
          this.config.trackAppLifecycleEvents === true &&
          this.appState !== 'active'
        ) {
          const context = this.getContext();

          const event = createTrackEvent({
            event: 'Application Opened',
            properties: {
              from_background: true,
              version: context?.app?.version,
              build: context?.app?.build,
              referring_application: e.url,
            },
          });

          this.process(event);
        }
      }
    });

    if (url && this.getConfig().trackDeepLinks) {
      const event = createTrackEvent({
        event: 'Deep Link Opened',
        properties: {
          url,
        },
      });
      this.process(event);
      this.logger.info('TRACK (Deep Link Opened) event saved', event);
    }
  }

  onUpdateStore() {
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

        // finally set the flag which means plugins will be added + registered immediately in future
        this.isReady = true;
      } finally {
        this.isAddingPlugins = false;
      }
    }
  }

  async flushRetry() {
    if (this.refreshTimeout === null) {
      const retryIntervalMs = this.config.retryInterval! * 1000;
      this.refreshTimeout = setTimeout(() => {
        (async () => {
          if (!this.isPendingRetryUpload) {
            this.isPendingRetryUpload = true;
            try {
              if (this.destroyed) {
                return;
              }

              const state = this.store.getState();
              const { eventsToRetry } = state.main;

              if (!eventsToRetry.length) {
                this.refreshTimeout = null;
                return;
              }

              const chunkedEvents = chunk(
                eventsToRetry,
                this.config.maxBatchSize!
              );

              let numFailedEvents = 0;
              let numSentEvents = 0;

              await Promise.all(
                chunkedEvents.map(async (events) => {
                  try {
                    await sendEvents({
                      config: this.config,
                      events,
                    });
                    const messageIds = events.map(
                      (evt: SegmentEvent) => evt.messageId
                    );
                    this.store.dispatch(
                      this.actions.main.deleteEventsToRetryByMessageId({
                        ids: messageIds,
                      })
                    );
                    numSentEvents += events.length;
                  } catch (e) {
                    numFailedEvents += events.length;
                  }
                })
              );

              if (numFailedEvents) {
                this.logger.error(
                  `Failed to send ${numFailedEvents} events. Retrying in ${this
                    .config.retryInterval!} seconds (via retry)`
                );
                this.refreshTimeout = setTimeout(
                  () => this.flushRetry(), // TODO: Fix this and add test
                  retryIntervalMs
                ) as any;
              } else {
                this.refreshTimeout = null;
              }

              if (numSentEvents) {
                this.logger.warn(
                  `Sent ${eventsToRetry.length} events (via retry)`
                );
              }
            } finally {
              this.isPendingRetryUpload = false;
            }
          }
        })();
      }, retryIntervalMs);
    }
  }

  private tick() {
    if (this.secondsElapsed + 1 >= this.config.flushInterval!) {
      this.flush();
    } else {
      this.secondsElapsed += 1;
    }
  }

  async flush() {
    if (!this.isPendingUpload) {
      this.isPendingUpload = true;
      try {
        if (this.destroyed) {
          return;
        }

        this.secondsElapsed = 0;
        const state = this.store.getState();

        if (state.main.events.length > 0) {
          getPluginsWithFlush(this.timeline).forEach((plugin) =>
            plugin.flush()
          );
        }
      } finally {
        this.isPendingUpload = false;
      }
    }
  }

  screen(name: string, options?: JsonMap) {
    const event = createScreenEvent({
      name,
      properties: options,
    });

    this.process(event);
    this.logger.info('SCREEN event saved', event);
  }

  track(eventName: string, options?: JsonMap) {
    const event = createTrackEvent({
      event: eventName,
      properties: options,
    });

    this.process(event);
    this.logger.info('TRACK event saved', event);
  }

  identify(userId: string, userTraits?: UserTraits) {
    const { traits: currentUserTraits } = this.store.getState().userInfo;

    const event = createIdentifyEvent({
      userTraits: {
        ...currentUserTraits,
        ...(userTraits || {}),
      },
    });

    this.store.dispatch(this.actions.userInfo.setUserId({ userId }));

    if (userTraits) {
      this.store.dispatch(
        this.actions.userInfo.setTraits({ traits: userTraits })
      );
    }

    this.process(event);
    this.logger.info('IDENTIFY event saved', event);
  }

  group(groupId: string, groupTraits?: GroupTraits) {
    const event = createGroupEvent({
      groupId,
      groupTraits,
    });

    this.process(event);
    this.logger.info('GROUP event saved', event);
  }

  alias(newUserId: string) {
    const { anonymousId, userId } = this.getUserInfo();
    const event = createAliasEvent({
      anonymousId,
      userId,
      newUserId,
    });

    this.process(event);
    this.logger.info('ALIAS event saved', event);
  }

  queueEvent(event: SegmentEvent) {
    this.store.dispatch(
      this.actions.main.addEvent({ event: event as unknown as SegmentEvent })
    );
  }

  removeEvents(eventIds: string[]) {
    this.store.dispatch(
      this.actions.main.deleteEventsByMessageId({
        ids: eventIds,
      })
    );
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
  async checkInstalledVersion() {
    const context = await getContext(undefined);
    const previousContext = this.store.getState().main.context;

    const referringURL = await Linking.getInitialURL().then((url) => {
      this.logger.info('Referring url', url);
      return url;
    });

    this.store.dispatch(this.actions.main.updateContext({ context }));

    if (!this.config.trackAppLifecycleEvents) {
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
      this.process(event);
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
      this.process(event);
      this.logger.info('TRACK (Application Updated) event saved', event);
    }

    const event = createTrackEvent({
      event: 'Application Opened',
      properties: {
        from_background: false,
        version: context.app.version,
        build: context.app.build,
        referring_url: referringURL,
      },
    });
    this.process(event);
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
  handleAppStateChange(nextAppState: AppStateStatus) {
    if (this.config.trackAppLifecycleEvents) {
      if (
        this.config.trackDeepLinks !== true &&
        ['inactive', 'background'].includes(this.appState) &&
        nextAppState === 'active'
      ) {
        const { context } = this.store.getState().main;
        const event = createTrackEvent({
          event: 'Application Opened',
          properties: {
            from_background: true,
            version: context?.app?.version,
            build: context?.app?.build,
          },
        });
        this.process(event);
        this.logger.info('TRACK (Application Opened) event saved', event);
      } else if (
        this.appState === 'active' &&
        ['inactive', 'background'].includes(nextAppState)
      ) {
        const event = createTrackEvent({
          event: 'Application Backgrounded',
        });
        this.process(event);
        this.logger.info('TRACK (Application Backgrounded) event saved', event);
      }
    }

    this.appState = nextAppState;
  }

  reset() {
    this.store.dispatch(this.actions.userInfo.reset());
    this.logger.info('Client has been reset');
  }
}
