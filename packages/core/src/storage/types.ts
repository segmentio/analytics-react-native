import type { Unsubscribe, Persistor } from '@segment/sovran-react-native';
import type {
  Context,
  DeepPartial,
  DestinationFilters,
  IntegrationSettings,
  RoutingRule,
  SegmentAPIIntegrations,
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
export interface Queue<T> {
  add: (value: T) => void;
  remove: (value: T) => void;
}

/**
 * Implements a map of key value pairs
 */
export interface Dictionary<K, T> {
  add: (key: K, value: T) => void;
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
    Dictionary<string, IntegrationSettings>;

  readonly filters: Watchable<DestinationFilters | undefined> &
    Settable<DestinationFilters> &
    Dictionary<string, RoutingRule>;

  readonly userInfo: Watchable<UserInfoState> & Settable<UserInfoState>;

  readonly deepLinkData: Watchable<DeepLinkData>;
}
export interface DeepLinkData {
  referring_application: string;
  url: string;
}

export type StorageConfig = {
  storeId: string;
  storePersistor?: Persistor;
};
