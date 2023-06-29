import type { Persistor } from '@segment/sovran-react-native';
import deepmerge from 'deepmerge';
import type { Context, DeepPartial } from '../../types';
import { createCallbackManager as mockCreateCallbackManager } from '../../__tests__/__helpers__/utils';
import { SovranStorage } from '../sovranStorage';

jest.mock('uuid');
jest.mock('react-native-get-random-values');

jest.mock('@segment/sovran-react-native', () => ({
  registerBridgeStore: jest.fn(),
  createStore: <T extends object>(initialState: T) => {
    const callbackManager = mockCreateCallbackManager<T>();

    let store = {
      ...initialState,
    };

    return {
      subscribe: jest
        .fn()
        .mockImplementation((callback: (state: T) => void) => {
          callbackManager.register(callback);
          return () => callbackManager.deregister(callback);
        }),
      dispatch: jest
        .fn()
        .mockImplementation(
          async (action: (state: T) => T | Promise<T>): Promise<T> => {
            store = await action(store);
            callbackManager.run(store);
            return store;
          }
        ),
      getState: jest.fn().mockImplementation(() => ({ ...store })),
    };
  },
}));

describe('sovranStorage', () => {
  async function commonAssertions(sovran: SovranStorage) {
    // First test that the constructor works correctly
    expect(sovran.isReady.get()).toBe(false);

    // Setup a listener for context changes
    const contextListener = jest.fn();
    sovran.context.onChange(contextListener);

    // A basic test that sets up the context data in the store and checks that the listener is called
    const appContext: DeepPartial<Context> = {
      app: {
        name: 'test',
        namespace: 'com.segment',
        version: '1.0.0',
        build: '1',
      },
      device: {
        manufacturer: 'Apple',
        model: 'iPhone X',
        name: 'iPhone',
        type: 'mobile',
      },
    };

    const newContext = await sovran.context.set(appContext);
    expect(newContext).toEqual(appContext);
    expect(sovran.context.get()).toEqual(appContext);
    expect(contextListener).toHaveBeenCalledWith(appContext);

    // Context should be deeply merged to preserve values set by other plugins
    const deviceToken: DeepPartial<Context> = {
      device: {
        token: '123',
      },
    };

    const expected = deepmerge(appContext, deviceToken);
    const updated = await sovran.context.set(deviceToken);
    expect(updated).toEqual(expected);
    expect(sovran.context.get()).toEqual(expected);
    expect(contextListener).toHaveBeenCalledWith(expected);

    // Now lets test the settings, settings are not deeply merged, only merged at the top level
    const settings = {
      segment: {
        apiKey: '123',
      },
    };

    const newSettings = await sovran.settings.set(settings);
    expect(newSettings).toEqual(settings);
    expect(sovran.settings.get()).toEqual(settings);

    const settingsUpdate = {
      segment: {
        key: '123',
      },
      braze: {
        key: '123',
      },
    };

    const updatedSettings = await sovran.settings.set(settingsUpdate);
    expect(updatedSettings).toEqual(settingsUpdate);
    expect(sovran.settings.get()).toEqual(settingsUpdate);
  }

  it('works', async () => {
    const sovran = new SovranStorage({ storeId: 'test' });
    await commonAssertions(sovran);
  });

  it('works with custom Persistor', async () => {
    const customStorage: Record<string, unknown> = {};
    const CustomPersistor: Persistor = {
      get: async <T>(key: string): Promise<T | undefined> => {
        return Promise.resolve(customStorage[key] as T);
      },
      set: async <T>(key: string, state: T): Promise<void> => {
        customStorage[key] = state;
        return Promise.resolve();
      },
    };
    const sovran = new SovranStorage({
      storeId: 'custom-persistor',
      storePersistor: CustomPersistor,
    });
    await commonAssertions(sovran);
  });
});
