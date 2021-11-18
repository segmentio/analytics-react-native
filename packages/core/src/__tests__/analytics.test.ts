import { combineReducers, configureStore } from '@reduxjs/toolkit';
import type { AppStateStatus } from 'react-native';
import * as ReactNative from 'react-native';
import { EventType, IdentifyEventType } from '..';
import { SegmentClient } from '../analytics';
import { Logger } from '../logger';
import { actions, Store } from '../store';
import mainSlice from '../store/main';
import systemSlice from '../store/system';
import userInfo from '../store/userInfo';
import { getMockStore } from './__helpers__/mockStore';

jest.mock('redux-persist', () => {
  const real = jest.requireActual('redux-persist');
  return {
    ...real,
    persistStore: jest.fn().mockImplementation((newStore) => newStore),
    persistReducer: jest.fn().mockImplementation((_, reducers) => reducers),
  };
});

jest.mock('../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

const getMockLogger = () => {
  const logger = new Logger();
  logger.disable();
  logger.info = jest.fn();
  logger.warn = jest.fn();
  logger.error = jest.fn();
  return logger;
};

describe('SegmentClient initialise', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
      flushAt: 10,
      retryInterval: 40,
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {
      addEvent: jest.fn(),
      setUserId: jest.fn(),
      addUserTraits: jest.fn(),
      reset: jest.fn(),
      updateContext: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when initializing a new client', () => {
    it('creates the client with default values', () => {
      const segmentClient = new SegmentClient(clientArgs);

      expect(segmentClient.getConfig()).toEqual(clientArgs.config);
      // Legacy checks,
      // TODO: Remove these as they test private
      // @ts-ignore
      expect(segmentClient.config).toStrictEqual(clientArgs.config);
      // @ts-ignore
      expect(segmentClient.store).toStrictEqual(clientArgs.store);
      // @ts-ignore
      expect(segmentClient.actions).toStrictEqual(clientArgs.actions);
      // @ts-ignore
      expect(segmentClient.persistor).toStrictEqual(clientArgs.persistor);
      // @ts-ignore
      expect(segmentClient.secondsElapsed).toStrictEqual(0);
      // @ts-ignore
      expect(segmentClient.appState).toStrictEqual('unknown');
    });
  });

  describe('internal setup methods', () => {
    describe('#setupInterval', () => {
      beforeEach(() => {
        // Using the legacy timers of jest to track calls
        jest.useFakeTimers('legacy');
      });

      afterEach(() => {
        jest.clearAllTimers();
      });

      it('resets the interval and creates a new one when initialised', () => {
        const segmentClient = new SegmentClient(clientArgs);

        // @ts-ignore
        expect(segmentClient.interval).toBe(null);

        // @ts-ignore value is irrelevant
        segmentClient.interval = 'TEST';

        segmentClient.setupInterval();

        // TODO: Jest recommends not to test for checking interval as they are an implementation detail but test the side effect, refactor these in the future
        expect(clearInterval).toHaveBeenCalledTimes(1);
        expect(clearInterval).toHaveBeenCalledWith('TEST');
        expect(setInterval).toHaveBeenLastCalledWith(
          expect.any(Function),
          1000
        );
        // @ts-ignore
        expect(segmentClient.interval).not.toBe('TEST');
      });
    });

    describe('#setupStoreSubscribe', () => {
      it('subscribes to the redux store', () => {
        const segmentClient = new SegmentClient(clientArgs);

        segmentClient.setupStoreSubscribe();

        // Each watcher generates a subscription so we just check that it has subscribed at least once
        expect(clientArgs.store.subscribe).toHaveBeenCalled();
      });
    });

    describe('#setupLifecycleEvents', () => {
      it('subscribes to the app state update events', () => {
        let updateCallback = (_val: AppStateStatus) => {};

        const addSpy = jest
          .spyOn(ReactNative.AppState, 'addEventListener')
          .mockImplementation((_action, callback) => {
            updateCallback = callback;
          });

        const segmentClient = new SegmentClient(clientArgs);
        jest.spyOn(segmentClient, 'handleAppStateChange');
        segmentClient.setupLifecycleEvents();

        expect(addSpy).toHaveBeenCalledTimes(1);
        expect(addSpy).toHaveBeenCalledWith('change', expect.any(Function));

        expect(segmentClient.handleAppStateChange).not.toHaveBeenCalled();

        updateCallback('active');

        expect(segmentClient.handleAppStateChange).toHaveBeenCalledTimes(1);
        expect(segmentClient.handleAppStateChange).toHaveBeenCalledWith(
          'active'
        );
      });
    });

    describe('#cleanup', () => {
      it('clears all subscriptions and timers', () => {
        const segmentClient = new SegmentClient(clientArgs);
        // @ts-ignore actual value is irrelevant
        segmentClient.interval = 'INTERVAL';
        const unsubscribe = jest.fn();
        // @ts-ignore
        segmentClient.watchers = [unsubscribe];
        // @ts-ignore actual value is irrelevant
        segmentClient.refreshTimeout = 'TIMEOUT';
        // @ts-ignore
        segmentClient.appStateSubscription = {
          remove: jest.fn(),
        };

        segmentClient.cleanup();
        // @ts-ignore
        expect(segmentClient.destroyed).toBe(true);
        expect(clearInterval).toHaveBeenCalledTimes(1);
        expect(clearInterval).toHaveBeenCalledWith('INTERVAL');
        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(clearTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).toHaveBeenCalledWith('TIMEOUT');
        // @ts-ignore
        expect(segmentClient.appStateSubscription.remove).toHaveBeenCalledTimes(
          1
        );
      });
    });
  });
});

describe('SegmentClient #reset', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
      flushAt: 10,
      retryInterval: 40,
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {
      userInfo: {
        reset: jest.fn(),
      },
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resets user data, identity, traits', () => {
    const client = new SegmentClient(clientArgs);

    client.reset();

    // @ts-ignore
    expect(client.store.dispatch).toHaveBeenCalledWith(
      clientArgs.actions.userInfo.reset()
    );
  });
});

describe('SegmentClient #onUpdateStore', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
      flushAt: 10,
      retryInterval: 40,
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  const sampleEvent: IdentifyEventType = {
    userId: 'user-123',
    anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
    type: EventType.IdentifyEvent,
    integrations: {},
    timestamp: '2000-01-01T00:00:00.000Z',
    traits: {
      foo: 'bar',
    },
    messageId: 'iDMkR2-I7c2_LCsPPlvwH',
  };

  const rootReducer = combineReducers({
    main: mainSlice.reducer,
    system: systemSlice.reducer,
    userInfo: userInfo.reducer,
  });
  let mockStore = configureStore({ reducer: rootReducer }) as Store;

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset the Redux store to a clean state
    mockStore = configureStore({ reducer: rootReducer }) as Store;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  /**
   * Creates a client wired up with store subscriptions and flush mocks for testing automatic flushes
   */
  const setupClient = (flushAt: number): SegmentClient => {
    const args = {
      ...clientArgs,
      config: {
        ...clientArgs.config,
        flushAt,
      },
      store: mockStore,
      actions: actions,
    };
    const client = new SegmentClient(args);
    // It is important to setup the flush spy before setting up the subscriptions so that it tracks the calls in the closure
    jest.spyOn(client, 'flush').mockResolvedValueOnce();
    jest.spyOn(client, 'flushRetry').mockResolvedValueOnce();
    client.setupStoreSubscribe();
    return client;
  };

  it('calls flush when there are unsent events', () => {
    const client = setupClient(1);
    mockStore.dispatch(mainSlice.actions.addEvent({ event: sampleEvent }));
    expect(client.flush).toHaveBeenCalledTimes(1);
  });

  it('does not flush when number of events does not exceed the flush threshold', () => {
    const client = setupClient(2);
    mockStore.dispatch(mainSlice.actions.addEvent({ event: sampleEvent }));
    expect(client.flush).not.toHaveBeenCalled();
  });

  it('does not call flush when there are no events to send', () => {
    const client = setupClient(1);
    expect(client.flush).not.toHaveBeenCalled();
    expect(client.flushRetry).not.toHaveBeenCalled();
  });

  it('flushes retry queue when it is non-empty', () => {
    const client = setupClient(2);

    mockStore.dispatch(
      mainSlice.actions.addEventsToRetry({
        events: [sampleEvent],
        config: { ...clientArgs.config },
      })
    );

    expect(client.flushRetry).toHaveBeenCalledTimes(1);
  });

  it('does not flush the retry queue when the refreshTimeout is not null', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const client = setupClient(2);
    // @ts-ignore
    client.refreshTimeout = jest.fn() as any;

    mockStore.dispatch(
      mainSlice.actions.addEventsToRetry({
        events: [sampleEvent],
        config: { ...clientArgs.config },
      })
    );

    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });
});
