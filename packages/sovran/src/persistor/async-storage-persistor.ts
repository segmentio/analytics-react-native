import type { Persistor } from './persistor';

let AsyncStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
} | null;

try {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  AsyncStorage = require('@react-native-async-storage/async-storage');
} catch (error) {
  AsyncStorage = null;
}

/**
 * Persistor implementation using AsyncStorage
 */
export const AsyncStoragePersistor: Persistor = {
  get: async <T>(key: string): Promise<T | undefined> => {
    try {
      const persistedStateJSON = await AsyncStorage?.getItem?.(key);
      if (persistedStateJSON !== null && persistedStateJSON !== undefined) {
        return JSON.parse(persistedStateJSON) as unknown as T;
      }
    } catch (e) {
      console.error(e);
    }

    return undefined;
  },

  set: async <T>(key: string, state: T): Promise<void> => {
    try {
      await AsyncStorage?.setItem?.(key, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  },
};
