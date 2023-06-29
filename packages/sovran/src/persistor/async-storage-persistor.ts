import type { Persistor } from './persistor';

let AsyncStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
} | null;

try {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (error) {
  AsyncStorage = null;
}

let hasShownWarning = false;

function warnIfMissingPackage() {
  if (AsyncStorage === null) {
    if (!hasShownWarning) {
      console.warn(
        "Segment: Tried to access AsyncStoragePersistor but couldn't find package @react-native-async-storage/async-storage.\n\
        - Install '@react-native-async-storage/async-storage' to use the default persistence layer you need\n\
        - You might be missing the 'storePersistor' argument in your client configuration to use your own persistence layer\n\
        Execution will continue but no information will be persisted. This warning will only show once."
      );
      hasShownWarning = true;
    }
    return true;
  }
  return false;
}

/**
 * Persistor implementation using AsyncStorage
 */
export const AsyncStoragePersistor: Persistor = {
  get: async <T>(key: string): Promise<T | undefined> => {
    if (warnIfMissingPackage()) {
      return;
    }
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
    if (warnIfMissingPackage()) {
      return;
    }
    try {
      await AsyncStorage?.setItem?.(key, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  },
};
