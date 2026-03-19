import type { Persistor } from '@segment/sovran-react-native';

export const createMockStore = <T>(initialState: T) => {
  let state = initialState;
  return {
    getState: jest.fn((...args: unknown[]) => {
      // Both overloads return a Promise in the mock for simplicity.
      // Supports getState() and getState(true).
      void args;
      return Promise.resolve(state);
    }),
    dispatch: jest.fn((action: unknown) => {
      if (typeof action === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        state = action(state);
      } else {
        state = (action as { payload: unknown }).payload as T;
      }
      return Promise.resolve(state);
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
