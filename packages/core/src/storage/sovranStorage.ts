import { createStore, Store } from '@segment/sovran-react-native';
import type {
  SegmentAPIIntegrations,
  IntegrationSettings,
  SegmentEvent,
  DeepPartial,
  Context,
  UserInfoState,
} from '..';
import type { Storage } from './types';

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
    anonymousId: 'anonymousId',
    userId: undefined,
    traits: undefined,
  },
};

export class SovranStorage implements Storage {
  private storeId: string;
  private contextStore: Store<DeepPartial<Context>>;
  private settingsStore: Store<SegmentAPIIntegrations>;
  private eventsStore: Store<SegmentEvent[]>;
  private userInfoStore: Store<UserInfoState>;

  constructor(storeId: string) {
    this.storeId = storeId;
    this.contextStore = createStore(INITIAL_VALUES.context, {
      persist: { storeId: `${this.storeId}-context` },
    });
    this.settingsStore = createStore(INITIAL_VALUES.settings, {
      persist: { storeId: `${this.storeId}-settings` },
    });
    this.eventsStore = createStore(INITIAL_VALUES.events, {
      persist: { storeId: `${this.storeId}-events` },
    });
    this.userInfoStore = createStore(INITIAL_VALUES.userInfo, {
      persist: { storeId: `${this.storeId}-userInfo` },
    });
  }

  readonly isReady = {
    get: () => true,
    onChange: (_callback: (value: boolean) => void) => {
      // Not doing anything cause we don't yet have a way to persist
      return () => {};
    },
  };

  readonly context = {
    get: () => this.contextStore.getState(),
    onChange: (callback: (value?: DeepPartial<Context>) => void) =>
      this.contextStore.subscribe(callback),
    set: (value: DeepPartial<Context>) => {
      this.contextStore.dispatch((state) => {
        return { ...state, ...value };
      });
    },
  };
  readonly settings = {
    get: () => this.settingsStore.getState(),
    onChange: (
      callback: (value?: SegmentAPIIntegrations | undefined) => void
    ) => this.settingsStore.subscribe(callback),
    set: (value: SegmentAPIIntegrations) => {
      this.settingsStore.dispatch((state) => {
        return { ...state, ...value };
      });
    },
    add: (key: string, value: IntegrationSettings) => {
      this.settingsStore.dispatch((state) => ({ ...state, [key]: value }));
    },
  };
  readonly events = {
    get: () => this.eventsStore.getState(),
    onChange: (callback: (value: SegmentEvent[]) => void) =>
      this.eventsStore.subscribe(callback),
    add: (event: SegmentEvent | SegmentEvent[]) => {
      const eventsToAdd = Array.isArray(event) ? event : [event];
      this.eventsStore.dispatch((state) => [...state, ...eventsToAdd]);
    },
    remove: (event: SegmentEvent | SegmentEvent[]) => {
      this.eventsStore.dispatch((state) => {
        const eventsToRemove = Array.isArray(event) ? event : [event];
        const setToRemove = new Set(eventsToRemove);
        const newState = state.filter((event) => !setToRemove.has(event));
        return newState;
      });
    },
  };
  readonly userInfo = {
    get: () => this.userInfoStore.getState(),
    onChange: (callback: (value: UserInfoState) => void) =>
      this.userInfoStore.subscribe(callback),
    set: (value: UserInfoState) => {
      this.userInfoStore.dispatch((state) => {
        return { ...state, ...value };
      });
    },
  };
}
