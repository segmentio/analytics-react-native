import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Persistor } from './persistor';

/**
 * Persistor implementation using AsyncStorage
 */
export const AsyncStoragePersistor: Persistor = {
  get: async <T>(key: string): Promise<T | undefined> => {
    try {
      const persistedStateJSON = await AsyncStorage.getItem(key);
      if (persistedStateJSON !== null && persistedStateJSON !== undefined) {
        return JSON.parse(persistedStateJSON);
      }
    } catch (e) {
      console.error(e);
    }

    return undefined;
  },

  set: async <T>(key: string, state: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  },
};
