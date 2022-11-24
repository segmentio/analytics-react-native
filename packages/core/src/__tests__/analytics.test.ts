import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';
import { SegmentClient } from '../analytics';
import { ErrorType, SegmentError } from '../errors';
import { getMockLogger } from './__helpers__/mockLogger';
import { MockSegmentStore } from './__helpers__/mockSegmentStore';

jest.mock('react-native');
jest.mock('../uuid');
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
      // @ts-ignore
      expect(segmentClient.appStateSubscription.remove).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe('#reset', () => {
    it('resets all userInfo except anonymousId', () => {
      client = new SegmentClient(clientArgs);
      const setUserInfo = jest.spyOn(store.userInfo, 'set');

      client.reset(false);

      expect(setUserInfo).toHaveBeenCalledWith({
        anonymousId: 'anonymousId',
        userId: undefined,
        traits: undefined,
      });
    });

    it('resets user data, identity, traits', () => {
      client = new SegmentClient(clientArgs);
      const setUserInfo = jest.spyOn(store.userInfo, 'set');

      client.reset();

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
});
