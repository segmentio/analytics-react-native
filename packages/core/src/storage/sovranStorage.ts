import {
  createStore,
  registerBridgeStore,
  Store,
  Persistor,
} from '@segment/sovran-react-native';
import deepmerge from 'deepmerge';
import type {
  SegmentAPIIntegrations,
  IntegrationSettings,
  SegmentEvent,
  DeepPartial,
  Context,
  UserInfoState,
} from '..';
import { getUUID } from '../uuid';
import type { Storage, StorageConfig, DeepLinkData } from './types';

// NOTE: Not exported from @segment/sovran-react-native. Must explicitly declare here.
// Also this fallback is used in store.ts in @segment/sovran-react-native yet "storeId" is required.
const DEFAULT_STORE_NAME = 'default';

type Data = {
  isReady: boolean;
  events: SegmentEvent[];
  eventsToRetry: SegmentEvent[];
  context: DeepPartial<Context>;
  settings: SegmentAPIIntegrations;
  userInfo: UserInfoState;
};
const INITIAL_VALUES: Data = {
  isReady: true,
  events: [],
  eventsToRetry: [],
  context: {},
  settings: {},
  userInfo: {
    anonymousId: getUUID(),
    userId: undefined,
    traits: undefined,
  },
};

interface ReadinessStore {
  hasLoadedContext: boolean;
}

/**
 * Global store for deeplink information
 * A single instance is needed for all SovranStorage objects since only one deeplink data exists at a time
 * No need to persist this information
 */
const deepLinkStore = createStore<DeepLinkData>({
  referring_application: '',
  url: '',
});

/**
 * Action to set the referring app and link url
 * @param deepLinkData referring app and link url
 */
const addDeepLinkData = (deepLinkData: DeepLinkData) => () => {
  return {
    referring_application: deepLinkData.referring_application,
    url: deepLinkData.url,
  };
};

/**
 * Registers the deeplink store to listen to native events
 */
registerBridgeStore({
  store: deepLinkStore,
  actions: {
    'add-deepLink-data': addDeepLinkData,
  },
});

export class SovranStorage implements Storage {
  private storeId: string;
  private storePersistor?: Persistor;
  private readinessStore: Store<ReadinessStore>;
  private contextStore: Store<{ context: DeepPartial<Context> }>;
  private settingsStore: Store<{ settings: SegmentAPIIntegrations }>;
  private eventsStore: Store<{ events: SegmentEvent[] }>;
  private userInfoStore: Store<{ userInfo: UserInfoState }>;
  private deepLinkStore: Store<DeepLinkData> = deepLinkStore;

  constructor(config: StorageConfig) {
    this.storeId = config.storeId;
    this.storePersistor = config.storePersistor;
    this.readinessStore = createStore<ReadinessStore>(
      {
        hasLoadedContext: false,
      },
      {
        persist: {
          storeId: DEFAULT_STORE_NAME,
          persistor: this.storePersistor,
        },
      }
    );
    this.contextStore = createStore(
      { context: INITIAL_VALUES.context },
      {
        persist: {
          storeId: `${this.storeId}-context`,
          persistor: this.storePersistor,
        },
      }
    );
    this.settingsStore = createStore(
      { settings: INITIAL_VALUES.settings },
      {
        persist: {
          storeId: `${this.storeId}-settings`,
          persistor: this.storePersistor,
        },
      }
    );
    this.eventsStore = createStore(
      { events: INITIAL_VALUES.events },
      {
        persist: {
          storeId: `${this.storeId}-events`,
          persistor: this.storePersistor,
        },
      }
    );
    this.userInfoStore = createStore(
      { userInfo: INITIAL_VALUES.userInfo },
      {
        persist: {
          storeId: `${this.storeId}-userInfo`,
          persistor: this.storePersistor,
        },
      }
    );

    this.fixAnonymousId();

    // Wait for context to be loaded
    const unsubscribeContext = this.contextStore.subscribe((store) => {
      if (store.context !== INITIAL_VALUES.context) {
        this.readinessStore.dispatch((state) => ({
          ...state,
          hasLoadedContext: true,
        }));
        unsubscribeContext();
      }
    });
  }

  /**
   * This is a fix for users that have started the app with the anonymousId set to 'anonymousId' bug
   */
  private fixAnonymousId = () => {
    const fixUnsubscribe = this.userInfoStore.subscribe((store) => {
      if (store.userInfo.anonymousId === 'anonymousId') {
        this.userInfoStore.dispatch((state) => {
          return {
            userInfo: { ...state.userInfo, anonymousId: getUUID() },
          };
        });
      }
      fixUnsubscribe();
    });
  };

  // Check for all things that need to be ready before sending events through the timeline
  readonly isReady = {
    get: () => {
      const ready = this.readinessStore.getState();
      return ready.hasLoadedContext;
    },
    onChange: (callback: (value: boolean) => void) => {
      return this.readinessStore.subscribe((store) => {
        if (store.hasLoadedContext) {
          callback(true);
        }
      });
    },
  };

  readonly context = {
    get: () => this.contextStore.getState().context,
    onChange: (callback: (value?: DeepPartial<Context>) => void) =>
      this.contextStore.subscribe((store) => callback(store.context)),
    set: async (value: DeepPartial<Context>) => {
      const { context } = await this.contextStore.dispatch((state) => {
        return { context: deepmerge(state.context, value) };
      });
      return context;
    },
  };
  readonly settings = {
    get: () => this.settingsStore.getState().settings,
    onChange: (
      callback: (value?: SegmentAPIIntegrations | undefined) => void
    ) => this.settingsStore.subscribe((store) => callback(store.settings)),
    set: async (value: SegmentAPIIntegrations) => {
      const { settings } = await this.settingsStore.dispatch((state) => {
        return { settings: { ...state.settings, ...value } };
      });
      return settings;
    },
    add: (key: string, value: IntegrationSettings) => {
      this.settingsStore.dispatch((state) => ({
        settings: { ...state.settings, [key]: value },
      }));
    },
  };
  readonly events = {
    get: () => this.eventsStore.getState().events,
    onChange: (callback: (value: SegmentEvent[]) => void) =>
      this.eventsStore.subscribe((store) => callback(store.events)),
    add: (event: SegmentEvent | SegmentEvent[]) => {
      const eventsToAdd = Array.isArray(event) ? event : [event];
      this.eventsStore.dispatch((state) => ({
        events: [...state.events, ...eventsToAdd],
      }));
    },
    remove: (event: SegmentEvent | SegmentEvent[]) => {
      this.eventsStore.dispatch((state) => {
        const eventsToRemove = Array.isArray(event) ? event : [event];
        if (eventsToRemove.length === 0 || state.events.length === 0) {
          return state;
        }
        const setToRemove = new Set(eventsToRemove);
        const filteredEvents = state.events.filter((e) => !setToRemove.has(e));
        return { events: filteredEvents };
      });
    },
  };

  readonly userInfo = {
    get: () => this.userInfoStore.getState().userInfo,
    onChange: (callback: (value: UserInfoState) => void) =>
      this.userInfoStore.subscribe((store) => callback(store.userInfo)),
    set: async (value: UserInfoState) => {
      const { userInfo } = await this.userInfoStore.dispatch((state) => ({
        userInfo: { ...state.userInfo, ...value },
      }));
      return userInfo;
    },
  };

  readonly deepLinkData = {
    get: () => this.deepLinkStore.getState(),
    onChange: (callback: (value: DeepLinkData) => void) =>
      this.deepLinkStore.subscribe(callback),
  };
}
