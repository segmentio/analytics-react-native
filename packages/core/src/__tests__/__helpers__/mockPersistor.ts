import type { Persistor } from 'redux-persist';

export const mockPersistor: Persistor = {
  pause: jest.fn(),
  persist: jest.fn(),
  flush: jest.fn(),
  purge: jest.fn(),
  dispatch: jest.fn(),
  getState: jest.fn(),
  subscribe: jest.fn(),
};
