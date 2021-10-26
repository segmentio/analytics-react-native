import { SegmentClient } from '../analytics';
import { Logger } from '../logger';
import * as ReactNative from 'react-native';
import * as alias from '../methods/alias';
import * as group from '../methods/group';
import * as identify from '../methods/identify';
import * as screen from '../methods/screen';
import * as track from '../methods/track';
import * as flush from '../methods/flush';
import * as flushRetry from '../internal/flushRetry';
import * as checkInstalledVersion from '../internal/checkInstalledVersion';
import * as handleAppStateChange from '../internal/handleAppStateChange';
import * as trackDeepLinks from '../internal/trackDeepLinks';
import type { AppStateStatus } from 'react-native';
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

      expect(segmentClient.config).toStrictEqual(clientArgs.config);
      expect(segmentClient.store).toStrictEqual(clientArgs.store);
      expect(segmentClient.actions).toStrictEqual(clientArgs.actions);
      expect(segmentClient.persistor).toStrictEqual(clientArgs.persistor);
      expect(segmentClient.secondsElapsed).toStrictEqual(0);
      expect(segmentClient.appState).toStrictEqual('unknown');
    });
  });

  describe('internal setup methods', () => {
    describe('#setupInterval', () => {
      beforeEach(() => {
        jest.spyOn(global, 'setInterval');
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.clearAllTimers();
      });

      it('resets the interval and creates a new one when initialised', () => {
        const segmentClient = new SegmentClient(clientArgs);

        expect(segmentClient.interval).toBe(null);

        // @ts-ignore value is irrelevant
        segmentClient.interval = 'TEST';

        segmentClient.setupInterval();

        expect(clearInterval).toHaveBeenCalledTimes(1);
        expect(clearInterval).toHaveBeenCalledWith('TEST');
        expect(setInterval).toHaveBeenLastCalledWith(
          expect.any(Function),
          1000
        );
        expect(segmentClient.interval).not.toBe('TEST');
      });
    });

    describe('#setupStoreSubscribe', () => {
      it('subscribes to the redux store', () => {
        const segmentClient = new SegmentClient(clientArgs);

        segmentClient.setupStoreSubscribe();

        expect(clientArgs.store.subscribe).toHaveBeenCalledTimes(1);
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

        jest.spyOn(SegmentClient.prototype, 'handleAppStateChange');

        const segmentClient = new SegmentClient(clientArgs);
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
        segmentClient.unsubscribe = jest.fn();
        // @ts-ignore actual value is irrelevant
        segmentClient.refreshTimeout = 'TIMEOUT';
        segmentClient.appStateSubscription = {
          remove: jest.fn(),
        };

        segmentClient.cleanup();
        expect(segmentClient.destroyed).toBe(true);
        expect(clearInterval).toHaveBeenCalledTimes(1);
        expect(clearInterval).toHaveBeenCalledWith('INTERVAL');
        expect(segmentClient.unsubscribe).toHaveBeenCalledTimes(1);
        expect(clearTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).toHaveBeenCalledWith('TIMEOUT');
        expect(segmentClient.appStateSubscription.remove).toHaveBeenCalledTimes(
          1
        );
      });
    });

    describe('#trackDeepLinks', () => {
      it('calls the trackDeepLinks method', () => {
        const trackDeepLinksSpy = jest
          .spyOn(trackDeepLinks, 'default')
          .mockResolvedValue();
        const client = new SegmentClient(clientArgs);

        client.trackDeepLinks();

        expect(trackDeepLinksSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});

describe('SegmentClient #screen', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  it('calls the screen method', () => {
    const screenSpy = jest.spyOn(screen, 'default').mockReturnValue();
    const client = new SegmentClient(clientArgs);

    client.screen('Home Screen', { id: 1 });

    expect(screenSpy).toHaveBeenCalledTimes(1);
    expect(screenSpy).toHaveBeenCalledWith({
      name: 'Home Screen',
      options: { id: 1 },
    });
  });
});

describe('SegmentClient #track', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  it('calls the screen method', () => {
    const trackSpy = jest.spyOn(track, 'default').mockReturnValue();
    const client = new SegmentClient(clientArgs);

    client.track('Some Event', { id: 1 });

    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith({
      eventName: 'Some Event',
      options: { id: 1 },
    });
  });
});

describe('SegmentClient #identify', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  it('calls the identify method', () => {
    const identifySpy = jest.spyOn(identify, 'default').mockReturnValue();
    const client = new SegmentClient(clientArgs);

    client.identify('user-id', { name: 'Mary' });

    expect(identifySpy).toHaveBeenCalledTimes(1);
    expect(identifySpy).toHaveBeenCalledWith({
      userId: 'user-id',
      userTraits: { name: 'Mary' },
    });
  });
});

describe('SegmentClient #group', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  it('calls the group method', () => {
    const groupSpy = jest.spyOn(group, 'default').mockReturnValue();
    const client = new SegmentClient(clientArgs);

    client.group('new-group-id', { name: 'Best Group Ever' });

    expect(groupSpy).toHaveBeenCalledTimes(1);
    expect(groupSpy).toHaveBeenCalledWith({
      groupId: 'new-group-id',
      groupTraits: { name: 'Best Group Ever' },
    });
  });
});

describe('SegmentClient #alias', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  it('calls the alias method', () => {
    const aliasSpy = jest.spyOn(alias, 'default').mockReturnValue();
    const client = new SegmentClient(clientArgs);

    client.alias('new-user-id');

    expect(aliasSpy).toHaveBeenCalledTimes(1);
    expect(aliasSpy).toHaveBeenCalledWith({ newUserId: 'new-user-id' });
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

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('calls flush when there are unsent events', () => {
    const args = {
      ...clientArgs,
      config: {
        ...clientArgs.config,
        flushAt: 1,
      },
      store: {
        ...clientArgs.store,
        getState: jest.fn().mockReturnValue({
          main: {
            events: [{ messageId: '1' }],
            eventsToRetry: [],
          },
          system: {
            settings: {},
          },
        }),
      },
    };
    const client = new SegmentClient(args);
    jest.spyOn(client, 'flush').mockResolvedValueOnce();
    client.onUpdateStore();

    expect(client.flush).toHaveBeenCalledTimes(1);
  });

  it('does not flush when number of events does not exceed the flush threshold', () => {
    const args = {
      ...clientArgs,
      config: {
        ...clientArgs.config,
        flushAt: 2,
      },
      store: {
        ...clientArgs.store,
        getState: jest.fn().mockReturnValue({
          main: {
            events: [{ messageId: '1' }],
            eventsToRetry: [],
          },
          system: {
            settings: {},
          },
        }),
      },
    };
    const client = new SegmentClient(args);
    jest.spyOn(client, 'flush').mockResolvedValueOnce();
    client.onUpdateStore();

    expect(client.flush).not.toHaveBeenCalled();
  });

  it('does not call flush when there are no events to send', () => {
    const args = {
      ...clientArgs,
      config: {
        ...clientArgs.config,
        flushAt: 1,
      },
      store: {
        ...clientArgs.store,
        getState: jest.fn().mockReturnValue({
          main: {
            events: [],
            eventsToRetry: [],
          },
          system: {
            settings: {},
          },
        }),
      },
    };
    const client = new SegmentClient(args);
    jest.spyOn(client, 'flush').mockResolvedValueOnce();
    jest.spyOn(client, 'flushRetry').mockResolvedValueOnce();
    client.onUpdateStore();

    expect(client.flush).not.toHaveBeenCalled();
    expect(client.flushRetry).not.toHaveBeenCalled();
  });

  it('flushes retry queue when it is non-empty', () => {
    const args = {
      ...clientArgs,
      config: {
        ...clientArgs.config,
        flushAt: 2,
      },
      store: {
        ...clientArgs.store,
        getState: jest.fn().mockReturnValue({
          main: {
            events: [],
            eventsToRetry: [{ messageId: '1' }],
          },
          system: {
            settings: {},
          },
        }),
      },
    };
    const client = new SegmentClient(args);
    jest.spyOn(client, 'flush').mockResolvedValueOnce();
    client.onUpdateStore();

    expect(setTimeout).toHaveBeenLastCalledWith(
      expect.any(Function),
      args.config.retryInterval! * 1000
    );
    expect(client.refreshTimeout).not.toBeNull();
  });

  it('does not flush the retry queue when the refreshTimeout is not null', () => {
    const args = {
      ...clientArgs,
      config: {
        ...clientArgs.config,
        flushAt: 2,
      },
      store: {
        ...clientArgs.store,
        getState: jest.fn().mockReturnValue({
          main: {
            events: [],
            eventsToRetry: [{ messageId: '1' }],
          },
          system: {
            settings: {},
          },
        }),
      },
    };
    const client = new SegmentClient(args);
    client.refreshTimeout = jest.fn() as any;
    client.onUpdateStore();

    expect(setTimeout).not.toHaveBeenCalled();
  });
});

describe('SegmentClient #handleAppStateChange', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  it('calls the handleAppStateChange method', () => {
    const handleAppStateChangeSpy = jest.spyOn(handleAppStateChange, 'default');
    const client = new SegmentClient(clientArgs);

    client.handleAppStateChange('active');

    expect(handleAppStateChangeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('SegmentClient #checkInstalledVersion', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  it('calls the checkInstalledVersion method', async () => {
    const checkInstalledVersionSpy = jest
      .spyOn(checkInstalledVersion, 'default')
      .mockResolvedValue();
    const client = new SegmentClient(clientArgs);

    await client.checkInstalledVersion();

    expect(checkInstalledVersionSpy).toHaveBeenCalledTimes(1);
  });
});

describe('SegmentClient #flush', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  it('calls the flush method', async () => {
    const flushSpy = jest.spyOn(flush, 'default').mockResolvedValue();
    const client = new SegmentClient(clientArgs);

    await client.flush();

    expect(flushSpy).toHaveBeenCalledTimes(1);
  });
});

describe('SegmentClient #flushRetry', () => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
    },
    logger: getMockLogger(),
    persistor: { subscribe: jest.fn() } as any,
    store: getMockStore(),
    actions: {},
  };

  it('calls the screen method', async () => {
    const flushRetrySpy = jest.spyOn(flushRetry, 'default').mockResolvedValue();
    const client = new SegmentClient(clientArgs);

    await client.flushRetry();

    expect(flushRetrySpy).toHaveBeenCalledTimes(1);
  });
});
