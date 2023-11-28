import {
  AsyncStoragePersistor,
  PersistenceConfig,
  Persistor,
} from './persistor';
import merge from 'deepmerge';
const DEFAULT_SAVE_STATE_DELAY_IN_MS = 1000;
const DEFAULT_STORE_NAME = 'default';

export type Notify<V> = (value: V) => void;
export type Unsubscribe = () => void;

/**
 * Generic observable store
 */
interface Observable<V> {
  subscribe: (callback: Notify<V>) => Unsubscribe;
  unsubscribe: (callback: Notify<V>) => void;
  notify: (value: V) => void;
}

/**
 * Creates a new observable for a particular type that manages all its subscribers
 * @returns {Observable<V>} observable object
 */
const createObservable = <V>(): Observable<V> => {
  const callbacks: Notify<V>[] = [];

  const unsubscribe = (callback: Notify<V>) => {
    callbacks.splice(callbacks.indexOf(callback), 1);
  };

  const subscribe = (callback: Notify<V>) => {
    callbacks.push(callback);
    return () => {
      unsubscribe(callback);
    };
  };

  const notify = (value: V) => {
    for (const callback of [...callbacks]) {
      callback(value);
    }
  };

  return { subscribe, unsubscribe, notify };
};

export type Action<T> = (state: T) => T | Promise<T>;

// Type for the getState function, it is written as an interface to support overloading
interface getStateFunc<T> {
  (): T;
  (safe: true): Promise<T>;
}

/**
 * Sovran State Store
 */
export interface Store<T extends object> {
  /**
   * Register a callback for changes to the store
   * @param {Notify<T>} callback - callback to be called when the store changes
   * @returns {Unsubscribe} - function to unsubscribe from the store
   */
  subscribe: (callback: Notify<T>) => Unsubscribe;
  /**
   * Dispatch an action to update the store values
   * @param {T | Promise<T>} action - action to dispatch
   * @returns {T} new state
   */
  dispatch: (action: Action<T>) => Promise<T>;
  /**
   * Get the current state of the store
   * @param {boolean} safe - if true it will execute the get async in the queue of the reducers guaranteeing that all the actions are executed before retrieving state
   * @returns {T | Promise<T>} state, or a promise for the state if executed async in the queue
   */
  getState: getStateFunc<T>;
}

/**
 * Creates a simple state store.
 * @param initialState initial store values
 * @param storeId store instance id
 * @returns {Store<T>} object
 */

export interface StoreConfig {
  /**
   * Persistence configuration
   */
  persist?: PersistenceConfig;
}

/**
 * Creates a sovran state management store
 * @param initialState initial state of the store
 * @param config configuration options
 * @returns Sovran Store object
 */
export const createStore = <T extends object>(
  initialState: T,
  config?: StoreConfig
): Store<T> => {
  let state = initialState;
  const queue: { call: Action<T>; finally?: (newState: T) => void }[] = [];
  const isPersisted = config?.persist !== undefined;
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;
  const persistor: Persistor =
    config?.persist?.persistor ?? AsyncStoragePersistor;
  const storeId: string = isPersisted
    ? config.persist!.storeId
    : DEFAULT_STORE_NAME;

  if (isPersisted) {
    persistor
      .get<T>(storeId)
      .then(async (persistedState) => {
        if (
          persistedState !== undefined &&
          persistedState !== null &&
          typeof persistedState === 'object'
        ) {
          const restoredState = await dispatch((oldState) => {
            return merge(oldState, persistedState);
          });
          config?.persist?.onInitialized?.(restoredState);
        } else {
          const stateToSave = getState();
          await persistor.set(storeId, stateToSave);
          config?.persist?.onInitialized?.(stateToSave);
        }
      })
      .catch((reason) => {
        console.warn(reason);
      });
  }

  const updatePersistor = (state: T) => {
    if (config === undefined) {
      return;
    }

    if (saveTimeout !== undefined) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(
      () => {
        void (async () => {
          try {
            saveTimeout = undefined;
            await persistor.set(storeId, state);
          } catch (error) {
            console.warn(error);
          }
        })();
      },
      config.persist?.saveDelay ?? DEFAULT_SAVE_STATE_DELAY_IN_MS
    );
  };

  const observable = createObservable<T>();
  const queueObserve = createObservable<typeof queue>();

  function getState(): T;
  function getState(safe: true): Promise<T>;
  function getState(safe?: boolean): T | Promise<T> {
    if (safe !== true) return { ...state };
    return new Promise<T>((resolve) => {
      queue.push({
        call: (state) => {
          resolve(state);
          return state;
        },
      });
      queueObserve.notify(queue);
    });
  }

  const dispatch = async (action: Action<T>): Promise<T> => {
    return new Promise<T>((resolve) => {
      queue.push({
        call: action,
        finally: resolve,
      });
      queueObserve.notify(queue);
    });
  };

  const processQueue = async (): Promise<T> => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    queueObserve.unsubscribe(processQueue);
    while (queue.length > 0) {
      const action = queue.shift();
      try {
        if (action !== undefined) {
          const newState = await action.call(state);
          if (newState !== state) {
            state = newState;
            // TODO: Debounce notifications
            observable.notify(state);
            if (isPersisted) {
              updatePersistor(state);
            }
          }
        }
      } catch {
        console.warn('Promise not handled correctly');
      } finally {
        action?.finally?.(state);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    queueObserve.subscribe(processQueue);
    return state;
  };
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  queueObserve.subscribe(processQueue);

  const subscribe = (callback: Notify<T>) => {
    const unsubscribe = observable.subscribe(callback);
    return () => {
      unsubscribe();
    };
  };

  return {
    subscribe,
    dispatch,
    getState,
  };
};
