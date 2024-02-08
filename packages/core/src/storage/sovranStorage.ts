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
  RoutingRule,
  DestinationFilters,
  SegmentAPIConsentSettings,
} from '..';
import { getUUID } from '../uuid';
import { createGetter } from './helpers';
import { isObject, isString } from '../util';
import type {
  Storage,
  StorageConfig,
  DeepLinkData,
  getStateFunc,
  Watchable,
  Settable,
  Dictionary,
  ReadinessStore,
  Queue,
} from './types';

type Data = {
  context: DeepPartial<Context>;
  settings: SegmentAPIIntegrations;
  consentSettings: SegmentAPIConsentSettings | undefined;
  userInfo: UserInfoState;
  filters: DestinationFilters;
  pendingEvents: SegmentEvent[];
};

const INITIAL_VALUES: Data = {
  context: {},
  settings: {},
  consentSettings: undefined,
  filters: {},
  userInfo: {
    anonymousId: getUUID(),
    userId: undefined,
    traits: undefined,
  },
  pendingEvents: [],
};

const isEverythingReady = (state: ReadinessStore) =>
  Object.values(state).every((v) => v === true);

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
const addDeepLinkData = (deepLinkData: unknown) => (state: DeepLinkData) => {
  if (!isObject(deepLinkData)) {
    return state;
  }

  return {
    referring_application: deepLinkData.referring_application,
    url: deepLinkData.url,
  } as DeepLinkData;
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

/**
 * Action to set the anonymousId from native
 * @param anonymousId native anonymousId string
 */

const addAnonymousId =
  (payload: unknown) => (state: { userInfo: UserInfoState }) => {
    if (isObject(payload)) {
      const nativeAnonymousId = payload.anonymousId;

      if (isString(nativeAnonymousId)) {
        return {
          userInfo: {
            ...state.userInfo,
            anonymousId: nativeAnonymousId,
          },
        };
      }
    }
    return state;
  };

function createStoreGetter<
  U extends object,
  Z extends keyof U | undefined = undefined,
  V = undefined
>(store: Store<U>, key?: Z): getStateFunc<Z extends keyof U ? V : U> {
  type X = Z extends keyof U ? V : U;
  return createGetter(
    () => {
      const state = store.getState();
      if (key !== undefined) {
        return state[key] as unknown as X;
      }
      return state as X;
    },
    async () => {
      const promise = await store.getState(true);
      if (key !== undefined) {
        return promise[key] as unknown as X;
      }
      return promise as unknown as X;
    }
  );
}

export class SovranStorage implements Storage {
  private storeId: string;
  private storePersistor?: Persistor;
  private storePersistorSaveDelay?: number;
  private readinessStore: Store<ReadinessStore>;
  private contextStore: Store<{ context: DeepPartial<Context> }>;
  private consentSettingsStore: Store<{
    consentSettings: SegmentAPIConsentSettings | undefined;
  }>;
  private settingsStore: Store<{ settings: SegmentAPIIntegrations }>;
  private userInfoStore: Store<{ userInfo: UserInfoState }>;
  private deepLinkStore: Store<DeepLinkData> = deepLinkStore;
  private filtersStore: Store<DestinationFilters>;
  private pendingStore: Store<SegmentEvent[]>;

  readonly isReady: Watchable<boolean>;

  readonly context: Watchable<DeepPartial<Context> | undefined> &
    Settable<DeepPartial<Context>>;

  readonly settings: Watchable<SegmentAPIIntegrations | undefined> &
    Settable<SegmentAPIIntegrations> &
    Dictionary<string, IntegrationSettings, SegmentAPIIntegrations>;

  readonly consentSettings: Watchable<SegmentAPIConsentSettings | undefined> &
    Settable<SegmentAPIConsentSettings | undefined>;

  readonly filters: Watchable<DestinationFilters | undefined> &
    Settable<DestinationFilters> &
    Dictionary<string, RoutingRule, DestinationFilters>;

  readonly userInfo: Watchable<UserInfoState> & Settable<UserInfoState>;

  readonly deepLinkData: Watchable<DeepLinkData>;

  readonly pendingEvents: Watchable<SegmentEvent[]> &
    Settable<SegmentEvent[]> &
    Queue<SegmentEvent, SegmentEvent[]>;

  constructor(config: StorageConfig) {
    this.storeId = config.storeId;
    this.storePersistor = config.storePersistor;
    this.storePersistorSaveDelay = config.storePersistorSaveDelay;
    this.readinessStore = createStore<ReadinessStore>({
      hasRestoredContext: false,
      hasRestoredSettings: false,
      hasRestoredUserInfo: false,
      hasRestoredFilters: false,
      hasRestoredPendingEvents: false,
    });

    const markAsReadyGenerator = (key: keyof ReadinessStore) => () => {
      void this.readinessStore.dispatch((state) => ({
        ...state,
        [key]: true,
      }));
    };

    this.isReady = {
      get: createGetter(
        () => {
          const state = this.readinessStore.getState();
          return isEverythingReady(state);
        },
        async () => {
          const promise = await this.readinessStore
            .getState(true)
            .then(isEverythingReady);
          return promise;
        }
      ),
      onChange: (callback: (value: boolean) => void) => {
        return this.readinessStore.subscribe((store) => {
          if (isEverythingReady(store)) {
            callback(true);
          }
        });
      },
    };

    // Context Store

    this.contextStore = createStore(
      { context: INITIAL_VALUES.context },
      {
        persist: {
          storeId: `${this.storeId}-context`,
          persistor: this.storePersistor,
          onInitialized: markAsReadyGenerator('hasRestoredContext'),
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

    // Settings Store

    this.settingsStore = createStore(
      { settings: INITIAL_VALUES.settings },
      {
        persist: {
          storeId: `${this.storeId}-settings`,
          persistor: this.storePersistor,
          saveDelay: this.storePersistorSaveDelay,
          onInitialized: markAsReadyGenerator('hasRestoredSettings'),
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
        return this.settingsStore.dispatch((state) => ({
          settings: { ...state.settings, [key]: value },
        }));
      },
    };

    // Consent settings

    this.consentSettingsStore = createStore(
      { consentSettings: INITIAL_VALUES.consentSettings },
      {
        persist: {
          storeId: `${this.storeId}-consentSettings`,
          persistor: this.storePersistor,
          saveDelay: this.storePersistorSaveDelay,
          onInitialized: markAsReadyGenerator('hasRestoredSettings'),
        },
      }
    );

    this.consentSettings = {
      get: createStoreGetter(this.consentSettingsStore, 'consentSettings'),
      onChange: (
        callback: (value?: SegmentAPIConsentSettings | undefined) => void
      ) =>
        this.consentSettingsStore.subscribe((store) =>
          callback(store.consentSettings)
        ),
      set: async (value) => {
        const { consentSettings } = await this.consentSettingsStore.dispatch(
          (state) => {
            let newState: typeof state.consentSettings;
            if (value instanceof Function) {
              newState = value(state.consentSettings);
            } else {
              newState = Object.assign({}, state.consentSettings, value);
            }
            return { consentSettings: newState };
          }
        );
        return consentSettings;
      },
    };

    // Filters

    this.filtersStore = createStore(INITIAL_VALUES.filters, {
      persist: {
        storeId: `${this.storeId}-filters`,
        persistor: this.storePersistor,
        saveDelay: this.storePersistorSaveDelay,
        onInitialized: markAsReadyGenerator('hasRestoredFilters'),
      },
    });

    this.filters = {
      get: createStoreGetter(this.filtersStore),
      onChange: (callback: (value?: DestinationFilters | undefined) => void) =>
        this.filtersStore.subscribe((store) => callback(store)),
      set: async (value) => {
        const filters = await this.filtersStore.dispatch((state) => {
          let newState: typeof state;
          if (value instanceof Function) {
            newState = value(state);
          } else {
            newState = { ...state, ...value };
          }
          return newState;
        });
        return filters;
      },
      add: (key, value) => {
        return this.filtersStore.dispatch((state) => ({
          ...state,
          [key]: value,
        }));
      },
    };

    // User Info Store

    this.userInfoStore = createStore(
      { userInfo: INITIAL_VALUES.userInfo },
      {
        persist: {
          storeId: `${this.storeId}-userInfo`,
          persistor: this.storePersistor,
          saveDelay: this.storePersistorSaveDelay,
          onInitialized: markAsReadyGenerator('hasRestoredUserInfo'),
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

    // Pending Events
    this.pendingStore = createStore<SegmentEvent[]>(
      INITIAL_VALUES.pendingEvents,
      {
        persist: {
          storeId: `${this.storeId}-pendingEvents`,
          persistor: this.storePersistor,
          saveDelay: this.storePersistorSaveDelay,
          onInitialized: markAsReadyGenerator('hasRestoredPendingEvents'),
        },
      }
    );

    this.pendingEvents = {
      get: createStoreGetter(this.pendingStore),
      onChange: (callback: (value: SegmentEvent[]) => void) =>
        this.pendingStore.subscribe((store) => callback(store)),
      set: async (value) => {
        return await this.pendingStore.dispatch((state) => {
          let newState: SegmentEvent[];
          if (value instanceof Function) {
            newState = value(state);
          } else {
            newState = [...value];
          }
          return newState;
        });
      },
      add: (event: SegmentEvent) => {
        return this.pendingStore.dispatch((events) => [...events, event]);
      },
      remove: (event: SegmentEvent) => {
        return this.pendingStore.dispatch((events) =>
          events.filter((e) => e.messageId != event.messageId)
        );
      },
    };

    registerBridgeStore({
      store: this.userInfoStore,
      actions: {
        'add-anonymous-id': addAnonymousId,
      },
    });

    this.deepLinkData = {
      get: createStoreGetter(this.deepLinkStore),
      onChange: (callback: (value: DeepLinkData) => void) =>
        this.deepLinkStore.subscribe(callback),
    };

    this.fixAnonymousId();
  }

  /**
   * This is a fix for users that have started the app with the anonymousId set to 'anonymousId' bug
   */
  private fixAnonymousId = () => {
    const fixUnsubscribe = this.userInfoStore.subscribe((store) => {
      if (store.userInfo.anonymousId === 'anonymousId') {
        void this.userInfoStore.dispatch((state) => {
          return {
            userInfo: { ...state.userInfo, anonymousId: getUUID() },
          };
        });
      }
      fixUnsubscribe();
    });
  };
}
