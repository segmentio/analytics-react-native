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
import { createGetter } from './helpers';
import type {
  Storage,
  StorageConfig,
  DeepLinkData,
  getStateFunc,
  Watchable,
  Settable,
  Dictionary,
} from './types';

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

function createStoreGetter<
  U,
  Z extends keyof U | undefined = undefined,
  V = undefined
>(store: Store<U>, key?: Z): getStateFunc<Z extends keyof U ? V : U> {
  type X = Z extends keyof U ? V : U;
  return createGetter(
    () => {
      const state = store.getState();
      if (key !== undefined) {
        return state[key!] as unknown as X;
      }
      return state as X;
    },
    async () => {
      const promise = await store.getState(true);
      console.log(
        '[sovranStorage]',
        'createStoreGetter',
        'async',
        key,
        promise
      );

      if (key !== undefined) {
        return promise[key!] as unknown as X;
        // return promise.then((state) => state[key!]) as Promise<X>;
      }
      return promise as unknown as X;
    }
  );
}

export class SovranStorage implements Storage {
  private storeId: string;
  private storePersistor?: Persistor;
  private readinessStore: Store<ReadinessStore>;
  private contextStore: Store<{ context: DeepPartial<Context> }>;
  private settingsStore: Store<{ settings: SegmentAPIIntegrations }>;
  private userInfoStore: Store<{ userInfo: UserInfoState }>;
  private deepLinkStore: Store<DeepLinkData> = deepLinkStore;

  readonly isReady: Watchable<boolean>;

  readonly context: Watchable<DeepPartial<Context> | undefined> &
    Settable<DeepPartial<Context>>;

  readonly settings: Watchable<SegmentAPIIntegrations | undefined> &
    Settable<SegmentAPIIntegrations> &
    Dictionary<string, IntegrationSettings>;

  readonly userInfo: Watchable<UserInfoState> & Settable<UserInfoState>;

  readonly deepLinkData: Watchable<DeepLinkData>;

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

    this.isReady = {
      get: createStoreGetter(this.readinessStore, 'hasLoadedContext'),
      onChange: (callback: (value: boolean) => void) => {
        return this.readinessStore.subscribe((store) => {
          if (store.hasLoadedContext) {
            callback(true);
          }
        });
      },
    };

    this.contextStore = createStore(
      { context: INITIAL_VALUES.context },
      {
        persist: {
          storeId: `${this.storeId}-context`,
          persistor: this.storePersistor,
        },
      }
    );
    this.context = {
      get: createStoreGetter(this.contextStore, 'context'),
      onChange: (callback: (value?: DeepPartial<Context>) => void) =>
        this.contextStore.subscribe((store) => callback(store.context)),
      set: async (value) => {
        const { context } = await this.contextStore.dispatch((state) => {
          let newState: typeof state.context;
          if (value instanceof Function) {
            newState = value(state.context);
          } else {
            newState = deepmerge(state.context, value);
          }
          return { context: newState };
        });
        return context;
      },
    };

    this.settingsStore = createStore(
      { settings: INITIAL_VALUES.settings },
      {
        persist: {
          storeId: `${this.storeId}-settings`,
          persistor: this.storePersistor,
        },
      }
    );

    this.settings = {
      get: createStoreGetter(this.settingsStore, 'settings'),
      onChange: (
        callback: (value?: SegmentAPIIntegrations | undefined) => void
      ) => this.settingsStore.subscribe((store) => callback(store.settings)),
      set: async (value) => {
        const { settings } = await this.settingsStore.dispatch((state) => {
          let newState: typeof state.settings;
          if (value instanceof Function) {
            newState = value(state.settings);
          } else {
            newState = { ...state.settings, ...value };
          }
          return { settings: newState };
        });
        return settings;
      },
      add: (key: string, value: IntegrationSettings) => {
        this.settingsStore.dispatch((state) => ({
          settings: { ...state.settings, [key]: value },
        }));
      },
    };

    this.userInfoStore = createStore(
      { userInfo: INITIAL_VALUES.userInfo },
      {
        persist: {
          storeId: `${this.storeId}-userInfo`,
          persistor: this.storePersistor,
        },
      }
    );

    this.userInfo = {
      get: createStoreGetter(this.userInfoStore, 'userInfo'),
      onChange: (callback: (value: UserInfoState) => void) =>
        this.userInfoStore.subscribe((store) => callback(store.userInfo)),
      set: async (value) => {
        const { userInfo } = await this.userInfoStore.dispatch((state) => {
          let newState: typeof state.userInfo;
          if (value instanceof Function) {
            newState = value(state.userInfo);
          } else {
            newState = deepmerge(state.userInfo, value);
          }
          return { userInfo: newState };
        });
        return userInfo;
      },
    };

    this.deepLinkData = {
      get: createStoreGetter(this.deepLinkStore),
      onChange: (callback: (value: DeepLinkData) => void) =>
        this.deepLinkStore.subscribe(callback),
    };

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
}
