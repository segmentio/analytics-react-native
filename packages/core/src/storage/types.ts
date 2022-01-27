import type { Unsubscribe } from '@segment/sovran-react-native';
import type { SegmentEvent } from '..';
import type {
  Context,
  DeepPartial,
  IntegrationSettings,
  SegmentAPIIntegrations,
  UserInfoState,
} from '../types';

/**
 * Implements a value that can be subscribed for changes
 */
export interface Watchable<T> {
  /**
   * Get current value
   */
  get: () => T;
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
  set: (value: T) => void;
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

  readonly events: Watchable<SegmentEvent[]> &
    Queue<SegmentEvent | SegmentEvent[]>;

  readonly userInfo: Watchable<UserInfoState> & Settable<UserInfoState>;
}

export interface WatchableStorage {
  readonly context: Watchable<DeepPartial<Context> | undefined>;

  readonly settings: Watchable<SegmentAPIIntegrations | undefined>;

  readonly events: Watchable<SegmentEvent[]>;

  readonly userInfo: Watchable<UserInfoState>;
}
