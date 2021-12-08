import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';
import { EventType, IdentifyEventType } from '..';
import { SegmentClient } from '../analytics';
import { getMockReduxStorage } from './__helpers__/getTestClient';
import { getMockLogger } from './__helpers__/mockLogger';
import { mockPersistor } from './__helpers__/mockPersistor';
import { MockSegmentStore } from './__helpers__/mockSegmentStore';

jest.mock('react-native');
jest.mock('../uuid');

describe('SegmentClient', () => {
  const ReduxStorage = getMockReduxStorage();
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
      flushAt: 10,
      retryInterval: 40,
      trackAppLifecycleEvents: true,
    },
    logger: getMockLogger(),
    persistor: mockPersistor,
    store: ReduxStorage,
  };

  let client: SegmentClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.cleanup();
  });

  describe('when initializing a new client', () => {
    it('creates the client with default values', async () => {
      client = new SegmentClient(clientArgs);
      expect(client.getConfig()).toEqual(clientArgs.config);
    });
  });

  describe('#setupInterval', () => {
    beforeEach(() => {
      // Using the legacy timers of jest to track calls
      jest.useFakeTimers('legacy');
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('resets the interval and creates a new one when initialised', async () => {
      client = new SegmentClient({
        ...clientArgs,
        config: { ...clientArgs.config, flushInterval: 10 },
      });
      await client.init();

      const flush = jest.spyOn(client, 'flush');
      // An interval should be set to check each second
      expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 1000);

      // Wait 10 secs for the flush interval to happen
      jest.advanceTimersByTime(10 * 1000);

      // Flush should have been called at flushInterval
      expect(flush).toHaveBeenCalledTimes(1);
    });
  });

  describe('#setupLifecycleEvents', () => {
    it('subscribes to the app state update events', async () => {
      let updateCallback = (_val: AppStateStatus) => {};

      const addSpy = jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((_action, callback) => {
          updateCallback = callback;
          return { remove: jest.fn() };
        });

      client = new SegmentClient(clientArgs);

      // @ts-ignore
      jest.spyOn(client, 'handleAppStateChange');
      await client.init();

      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith('change', expect.any(Function));

      // @ts-ignore
      expect(client.handleAppStateChange).not.toHaveBeenCalled();

      updateCallback('active');

      // @ts-ignore
      expect(client.handleAppStateChange).toHaveBeenCalledTimes(1);
      // @ts-ignore
      expect(client.handleAppStateChange).toHaveBeenCalledWith('active');
    });
  });

  describe('#cleanup', () => {
    it('clears all subscriptions and timers', async () => {
      const segmentClient = new SegmentClient(clientArgs);
      await segmentClient.init();

      jest.spyOn(
        // @ts-ignore
        segmentClient.appStateSubscription,
        'remove'
      );

      segmentClient.cleanup();
      // @ts-ignore
      expect(segmentClient.destroyed).toBe(true);
      expect(clearInterval).toHaveBeenCalledTimes(1);
      expect(clearTimeout).toHaveBeenCalledTimes(1);
      // @ts-ignore
      expect(segmentClient.appStateSubscription.remove).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe('#reset', () => {
    it('resets user data, identity, traits', () => {
      client = new SegmentClient(clientArgs);
      const setUserInfo = jest.spyOn(ReduxStorage.userInfo, 'set');

      client.reset();

      expect(setUserInfo).toHaveBeenCalledWith({
        anonymousId: 'mocked-uuid',
        userId: undefined,
        traits: undefined,
      });
    });
  });
});

describe('SegmentClient #onUpdateStore', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
      flushAt: 10,
      retryInterval: 40,
      trackAppLifecycleEvents: true,
    },
    logger: getMockLogger(),
    persistor: mockPersistor,
    store: store,
  };
  let client: SegmentClient;

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

  beforeEach(() => {
    jest.useFakeTimers();
    store.reset();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    client.cleanup();
  });

  /**
   * Creates a client wired up with store subscriptions and flush mocks for testing automatic flushes
   */
  const setupClient = async (flushAt: number): Promise<SegmentClient> => {
    const args = {
      ...clientArgs,
      config: {
        ...clientArgs.config,
        flushAt,
        retryInterval: 1,
      },
    };
    const segmentClient = new SegmentClient(args);
    await segmentClient.init();
    // It is important to setup the flush spy before setting up the subscriptions so that it tracks the calls in the closure
    jest.spyOn(segmentClient, 'flush').mockResolvedValueOnce();
    jest.spyOn(segmentClient, 'flushRetry').mockResolvedValueOnce();
    return segmentClient;
  };

  it('calls flush when there are unsent events', async () => {
    client = await setupClient(1);
    store.events.add(sampleEvent);
    expect(client.flush).toHaveBeenCalledTimes(1);
  });

  it('does not flush when number of events does not exceed the flush threshold', async () => {
    client = await setupClient(5);
    store.events.add(sampleEvent);
    expect(client.flush).not.toHaveBeenCalled();
  });

  it('does not call flush when there are no events to send', async () => {
    client = await setupClient(1);
    expect(client.flush).not.toHaveBeenCalled();
    expect(client.flushRetry).not.toHaveBeenCalled();
  });

  it('flushes retry queue when it is non-empty', async () => {
    client = await setupClient(2);
    store.eventsToRetry.add([sampleEvent]);
    expect(client.flushRetry).toHaveBeenCalledTimes(1);
  });

  it('does not flush the retry queue when the refreshTimeout is not null', async () => {
    // Mock the timeout to prevent it from releasing the lock
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementationOnce(jest.fn());
    client = await setupClient(2);
    store.eventsToRetry.add([sampleEvent]);
    jest.advanceTimersByTime(10);
    jest.resetAllMocks();
    store.eventsToRetry.add([sampleEvent]);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });
});
