import type { Unsubscribe, Persistor } from '@segment/sovran-react-native';
import type { SegmentAPIConsentSettings } from '..';
import type {
  Context,
  DeepPartial,
  DestinationFilters,
  IntegrationSettings,
  RoutingRule,
  SegmentAPIIntegrations,
  SegmentEvent,
  UserInfoState,
} from '../types';

export interface getStateFunc<T> {
  (): T;
  (safe: true): Promise<T>;
}

/**
 * Implements a value that can be subscribed for changes
 */
export interface Watchable<T> {
  /**
   * Get current value
   */
  get: getStateFunc<T>;
  /**
   * Register a callback to be called when the value changes
   * @returns a function to unsubscribe
   */
  onChange: (callback: (value: T) => void) => Unsubscribe;
}

/**
 * Implements a value that can be set
 */
export interface Settable<T> {
  set: (value: T | ((state: T) => T)) => T | Promise<T>;
}

/**
 * Implements a queue object
 */
export interface Queue<T, R> {
  add: (value: T) => Promise<R>;
  remove: (value: T) => Promise<R>;
}

/**
 * Implements a map of key value pairs
 */
export interface Dictionary<K, T, R> {
  add: (key: K, value: T) => Promise<R>;
}

export interface ReadinessStore {
  hasRestoredContext: boolean;
  hasRestoredSettings: boolean;
  hasRestoredUserInfo: boolean;
  hasRestoredFilters: boolean;
  hasRestoredPendingEvents: boolean;
}

/**
 * Interface for interacting with the storage layer of the client data
 */
export interface Storage {
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
}
export type DeepLinkData = {
  referring_application: string;
  url: string;
};

export type StorageConfig = {
  storeId: string;
  storePersistor?: Persistor;
  storePersistorSaveDelay?: number;
};
