import { createStore, Store } from '@segment/sovran-react-native';
import type {
  SegmentAPIIntegrations,
  IntegrationSettings,
  SegmentEvent,
  DeepPartial,
  Context,
  UserInfoState,
} from '..';
import { getUUID } from '../uuid';
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
    anonymousId: getUUID(),
    userId: undefined,
    traits: undefined,
  },
};

export class SovranStorage implements Storage {
  private storeId: string;
  private contextStore: Store<{ context: DeepPartial<Context> }>;
  private settingsStore: Store<{ settings: SegmentAPIIntegrations }>;
  private eventsStore: Store<{ events: SegmentEvent[] }>;
  private userInfoStore: Store<{ userInfo: UserInfoState }>;

  constructor(storeId: string) {
    this.storeId = storeId;
    this.contextStore = createStore(
      { context: INITIAL_VALUES.context },
      {
        persist: { storeId: `${this.storeId}-context` },
      }
    );
    this.settingsStore = createStore(
      { settings: INITIAL_VALUES.settings },
      {
        persist: { storeId: `${this.storeId}-settings` },
      }
    );
    this.eventsStore = createStore(
      { events: INITIAL_VALUES.events },
      {
        persist: { storeId: `${this.storeId}-events` },
      }
    );
    this.userInfoStore = createStore(
      { userInfo: INITIAL_VALUES.userInfo },
      {
        persist: {
          storeId: `${this.storeId}-userInfo`,
        },
      }
    );

    this.fixAnonymousId();
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

  readonly isReady = {
    get: () => true,
    onChange: (_callback: (value: boolean) => void) => {
      // No need to do anything since storage is always ready
      return () => {};
    },
  };

  readonly context = {
    get: () => this.contextStore.getState().context,
    onChange: (callback: (value?: DeepPartial<Context>) => void) =>
      this.contextStore.subscribe((store) => callback(store.context)),
    set: (value: DeepPartial<Context>) => {
      this.contextStore.dispatch((state) => {
        return { context: { ...state.context, ...value } };
      });
    },
  };
  readonly settings = {
    get: () => this.settingsStore.getState().settings,
    onChange: (
      callback: (value?: SegmentAPIIntegrations | undefined) => void
    ) => this.settingsStore.subscribe((store) => callback(store.settings)),
    set: (value: SegmentAPIIntegrations) => {
      this.settingsStore.dispatch((state) => {
        return { settings: { ...state.settings, ...value } };
      });
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
    set: (value: UserInfoState) => {
      this.userInfoStore.dispatch((state) => ({
        userInfo: { ...state.userInfo, ...value },
      }));
    },
  };
}
