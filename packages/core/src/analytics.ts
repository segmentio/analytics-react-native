import type { Unsubscribe } from '@reduxjs/toolkit';
import { AppState, AppStateStatus } from 'react-native';
import type { Persistor } from 'redux-persist';

import { applyRawEventData } from './events';
import checkInstalledVersion from './internal/checkInstalledVersion';
import flushRetry from './internal/flushRetry';
import getSettings from './internal/getSettings';
import handleAppStateChange from './internal/handleAppStateChange';
import trackDeepLinks from './internal/trackDeepLinks';
import type { Logger } from './logger';
import alias from './methods/alias';
import flush from './methods/flush';
import group from './methods/group';
import identify from './methods/identify';
import screen from './methods/screen';
import track from './methods/track';
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
import type {
  Config,
  GroupTraits,
  JsonMap,
  SegmentAPISettings,
  SegmentEvent,
  UserTraits,
} from './types';

export class SegmentClient {
  // the config parameters for the client - a merge of user provided and default options
  config: Config;

  // redux store
  store: Store;

  // redux actions
  actions: typeof ReduxActions;

  // persistor for the redux store
  persistor: Persistor;

  // how many seconds has elapsed since the last time events were sent
  secondsElapsed: number = 0;

  // current app state
  appState: AppStateStatus | 'unknown' = 'unknown';

  // subscription for propagating changes to appState
  appStateSubscription: any;

  // logger
  logger: Logger;

  // timeout for refreshing the failed events queue
  refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  // internal time to know when to flush, ticks every second
  interval: ReturnType<typeof setTimeout> | null = null;

  // unsubscribe watchers for the redux store
  watchers: Unsubscribe[] = [];

  // whether the user has called cleanup
  destroyed: boolean = false;

  // has a pending upload to respond
  isPendingUpload: boolean = false;

  // has a pending upload of the events to retry upload
  isPendingRetryUpload: boolean = false;

  isAddingPlugins: boolean = false;

  timeline: Timeline;

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

  settings() {
    let settings: SegmentAPISettings | undefined;
    const { system } = this.store.getState();
    if (system.settings) {
      settings = system.settings;
    }
    return settings;
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

  async getSettings() {
    await getSettings.bind(this)();
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
    if (this.interval) {
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
     Adds a new plugin to the currently loaded set.

     - Parameter plugin: The plugin to be added.
     - Returns: Returns the name of the supplied plugin.

  */
  add({ plugin }: { plugin: Plugin }) {
    // plugins can either be added immediately or
    // can be cached and added later during the next state update
    // this is to avoid adding plugins before network requests made as part of setup have resolved
    if (!this.isReady) {
      this.pluginsToAdd.push(plugin);
    } else {
      this.addPlugin(plugin);
      const isIntegration = this.isNonSegmentDestinationPlugin(plugin);
      if (isIntegration) {
        // need to maintain the list of integrations to inject into payload
        this.store.dispatch(
          this.actions.system.addIntegrations([
            { key: (plugin as DestinationPlugin).key },
          ])
        );
      }
    }
  }

  private addPlugin(plugin: Plugin) {
    plugin.configure(this);
    this.timeline.add(plugin);
  }

  private isNonSegmentDestinationPlugin(plugin: Plugin) {
    const isSegmentDestination =
      Object.getPrototypeOf(plugin).constructor.name === 'SegmentDestination';
    if (!isSegmentDestination) {
      const destPlugin = plugin as DestinationPlugin;
      if (destPlugin.key) {
        return true;
      }
    }
    return false;
  }

  /**
     Removes and unloads plugins with a matching name from the system.

     - Parameter pluginName: An plugin name.
  */
  remove({ plugin }: { plugin: Plugin }) {
    this.timeline.remove(plugin);
    const isIntegration = this.isNonSegmentDestinationPlugin(plugin);
    if (isIntegration) {
      this.store.dispatch(
        this.actions.system.removeIntegration({
          key: (plugin as DestinationPlugin).key,
        })
      );
    }
  }

  process(incomingEvent: SegmentEvent) {
    const event = applyRawEventData(incomingEvent, this.store);
    this.timeline.process(event);
  }

  async trackDeepLinks() {
    await trackDeepLinks.bind(this)();
  }

  onUpdateStore() {
    if (this.pluginsToAdd.length > 0 && !this.isAddingPlugins) {
      this.isAddingPlugins = true;
      try {
        // start by adding the plugins
        this.pluginsToAdd.forEach((plugin) => {
          this.addPlugin(plugin);
        });

        // filter to see if we need to register any
        const destPlugins = this.pluginsToAdd.filter(
          this.isNonSegmentDestinationPlugin
        );

        // now that they're all added, clear the cache
        // this prevents this block running for every update
        this.pluginsToAdd = [];

        // if we do have destPlugins, bulk-register them with the system
        // this isn't done as part of addPlugin to avoid dispatching an update as part of an update
        // which can lead to an infinite loop
        // this is safe to fire & forget here as we've cleared pluginsToAdd
        if (destPlugins.length > 0) {
          this.store.dispatch(
            this.actions.system.addIntegrations(
              (destPlugins as DestinationPlugin[]).map(({ key }) => ({ key }))
            )
          );
        }

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
            await flushRetry.bind(this)();
            this.isPendingRetryUpload = false;
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
        await flush.bind(this)();
      } finally {
        this.isPendingUpload = false;
      }
    }
  }

  screen(name: string, options?: JsonMap) {
    screen.bind(this)({ name, options });
  }

  track(eventName: string, options?: JsonMap) {
    track.bind(this)({ eventName, options });
  }

  identify(userId: string, userTraits?: UserTraits) {
    identify.bind(this)({ userId, userTraits });
  }

  group(groupId: string, groupTraits?: GroupTraits) {
    group.bind(this)({ groupId, groupTraits });
  }

  alias(newUserId: string) {
    alias.bind(this)({ newUserId });
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
    await checkInstalledVersion.bind(this)();
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
    handleAppStateChange.bind(this)({ nextAppState });
  }

  reset() {
    this.store.dispatch(this.actions.userInfo.reset());
    this.logger.info('Client has been reset');
  }
}
