import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';
import { SegmentClient } from '../analytics';
import { ErrorType, SegmentError } from '../errors';
import { CountFlushPolicy, TimerFlushPolicy } from '../flushPolicies';
import { getMockLogger, MockSegmentStore } from '../test-helpers';

jest.mock('../api');

describe('SegmentClient', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
      flushAt: 10,
      trackAppLifecycleEvents: true,
    },
    logger: getMockLogger(),
    store: store,
  };

  let client: SegmentClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.cleanup();
  });

  describe('when initializing a new client', () => {
    it('creates the client with default values', () => {
      client = new SegmentClient(clientArgs);
      expect(client.getConfig()).toEqual(clientArgs.config);
    });
  });

  describe('#setupInterval', () => {
    beforeEach(() => {
      // Using the legacy timers of jest to track calls
      jest.useFakeTimers({ legacyFakeTimers: true });
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

      // Wait 10 secs for the flush interval to happen
      jest.advanceTimersByTime(10 * 1000);

      // Flush should have been called at flushInterval
      expect(flush).toHaveBeenCalledTimes(1);
    });
  });

  describe('#setupLifecycleEvents', () => {
    it('subscribes to the app state update events', async () => {
      let updateCallback = (_val: AppStateStatus) => {
        return;
      };

      const addSpy = jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((_action, callback) => {
          updateCallback = callback;
          return { remove: jest.fn() };
        });

      client = new SegmentClient(clientArgs);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      jest.spyOn(client, 'handleAppStateChange');
      await client.init();

      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith('change', expect.any(Function));

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(client.handleAppStateChange).not.toHaveBeenCalled();

      updateCallback('active');

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(client.handleAppStateChange).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(client.handleAppStateChange).toHaveBeenCalledWith('active');
    });
  });

  describe('#cleanup', () => {
    it('clears all subscriptions and timers', async () => {
      const segmentClient = new SegmentClient(clientArgs);
      await segmentClient.init();

      jest.spyOn(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        segmentClient.appStateSubscription,
        'remove'
      );

      segmentClient.cleanup();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(segmentClient.destroyed).toBe(true);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(segmentClient.appStateSubscription?.remove).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe('#reset', () => {
    it('resets all userInfo except anonymousId', async () => {
      client = new SegmentClient(clientArgs);
      const setUserInfo = jest.spyOn(store.userInfo, 'set');

      await client.reset(false);

      expect(setUserInfo).toHaveBeenCalledWith({
        anonymousId: 'anonymousId',
        userId: undefined,
        traits: undefined,
      });
    });

    it('resets user data, identity, traits', async () => {
      client = new SegmentClient(clientArgs);
      const setUserInfo = jest.spyOn(store.userInfo, 'set');

      await client.reset();

      expect(setUserInfo).toHaveBeenCalledWith({
        anonymousId: 'mocked-uuid',
        userId: undefined,
        traits: undefined,
      });
    });
  });

  describe('Error Handler', () => {
    it('calls the error handler when reportErrorInternal is called', () => {
      const errorHandler = jest.fn();
      client = new SegmentClient({
        ...clientArgs,
        config: { ...clientArgs.config, errorHandler: errorHandler },
      });

      const error = new SegmentError(
        ErrorType.NetworkUnknown,
        'Some weird error'
      );
      client.reportInternalError(error);

      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });

  describe('Flush Policies', () => {
    it('creates the default flush policies when config is empty', () => {
      client = new SegmentClient({
        ...clientArgs,
        config: {
          ...clientArgs.config,
          flushAt: undefined,
          flushInterval: undefined,
        },
      });
      const flushPolicies = client.getFlushPolicies();
      expect(flushPolicies.length).toBe(2);
    });

    it('setting flush policies is mutually exclusive with flushAt/Interval', () => {
      client = new SegmentClient({
        ...clientArgs,
        config: {
          ...clientArgs.config,
          flushAt: 5,
          flushInterval: 30,
          flushPolicies: [new CountFlushPolicy(1)],
        },
      });
      const flushPolicies = client.getFlushPolicies();
      expect(flushPolicies.length).toBe(1);
    });

    it('setting flushAt/Interval to 0 should make the client have no uploads', () => {
      client = new SegmentClient({
        ...clientArgs,
        config: {
          ...clientArgs.config,
          flushAt: 0,
          flushInterval: 0,
        },
      });
      const flushPolicies = client.getFlushPolicies();
      expect(flushPolicies.length).toBe(0);
    });

    it('setting an empty array of policies should make the client have no uploads', () => {
      client = new SegmentClient({
        ...clientArgs,
        config: {
          ...clientArgs.config,
          flushAt: undefined,
          flushInterval: undefined,
          flushPolicies: [],
        },
      });
      const flushPolicies = client.getFlushPolicies();
      expect(flushPolicies.length).toBe(0);
    });

    it('can add and remove policies, does not mutate original array', () => {
      const policies = [new CountFlushPolicy(1), new TimerFlushPolicy(200)];
      client = new SegmentClient({
        ...clientArgs,
        config: {
          ...clientArgs.config,
          flushAt: undefined,
          flushInterval: undefined,
          flushPolicies: policies,
        },
      });
      expect(client.getFlushPolicies().length).toBe(policies.length);

      client.removeFlushPolicy(...policies);
      expect(client.getFlushPolicies().length).toBe(0);

      client.addFlushPolicy(...policies);
      expect(client.getFlushPolicies().length).toBe(policies.length);
    });
  });
});
