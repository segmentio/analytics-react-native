import type { Persistor } from '@segment/sovran-react-native';

export const createMockStore = <T>(initialState: T) => {
  let state = initialState;
  return {
    getState: jest.fn(() => Promise.resolve(state)),
    dispatch: jest.fn((action: unknown) => {
      if (typeof action === 'function') {
        state = action(state);
      } else {
        state = (action as { payload: unknown }).payload as T;
      }
      return Promise.resolve();
    }),
  };
};

export const createTestPersistor = (
  storage: Record<string, unknown> = {}
): Persistor => ({
  get: async <T>(key: string): Promise<T | undefined> =>
    Promise.resolve(storage[key] as T),
  set: async <T>(key: string, state: T): Promise<void> => {
    storage[key] = state;
    return Promise.resolve();
  },
});
