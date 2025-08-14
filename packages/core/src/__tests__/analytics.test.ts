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
    it('creates the default flush policies when config is empty', async () => {
      client = new SegmentClient({
        ...clientArgs,
        config: {
          ...clientArgs.config,
          flushAt: undefined,
          flushInterval: undefined,
        },
      });
      await client.init();
      const flushPolicies = client.getFlushPolicies();
      expect(flushPolicies.length).toBe(2);
    });

    it('setting flush policies is mutually exclusive with flushAt/Interval', async () => {
      client = new SegmentClient({
        ...clientArgs,
        config: {
          ...clientArgs.config,
          flushAt: 5,
          flushInterval: 30,
          flushPolicies: [new CountFlushPolicy(1)],
        },
      });
      await client.init();
      const flushPolicies = client.getFlushPolicies();
      expect(flushPolicies.length).toBe(1);
    });

    it('setting flushAt/Interval to 0 should make the client have no uploads', async () => {
      client = new SegmentClient({
        ...clientArgs,
        config: {
          ...clientArgs.config,
          flushAt: 0,
          flushInterval: 0,
        },
      });
      await client.init();
      const flushPolicies = client.getFlushPolicies();
      expect(flushPolicies.length).toBe(0);
    });

    it('setting an empty array of policies should make the client have no uploads', async () => {
      client = new SegmentClient({
        ...clientArgs,
        config: {
          ...clientArgs.config,
          flushAt: undefined,
          flushInterval: undefined,
          flushPolicies: [],
        },
      });
      await client.init();
      const flushPolicies = client.getFlushPolicies();
      expect(flushPolicies.length).toBe(0);
    });

    it('can add and remove policies, does not mutate original array', async () => {
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
      await client.init();
      expect(client.getFlushPolicies().length).toBe(policies.length);

      client.removeFlushPolicy(...policies);
      expect(client.getFlushPolicies().length).toBe(0);

      client.addFlushPolicy(...policies);
      expect(client.getFlushPolicies().length).toBe(policies.length);
    });
  });

  describe('Initialization order - race condition fix', () => {
    /*jshint -W069 */
    /* eslint-disable dot-notation */
    it('sets isReady to true before executing onReady to prevent events being lost', async () => {
      // This test verifies that the race condition fix works:
      // isReady is set to true BEFORE onReady() executes,
      // so events tracked during onReady() go directly to the queue
      // instead of being incorrectly saved as pending events.

      client = new SegmentClient(clientArgs);

      // Track the value of isReady when onReady is called
      let isReadyValueInOnReady: boolean | undefined;

      // Mock onReady to capture the isReady state
      const originalOnReady = client['onReady'].bind(client);
      client['onReady'] = jest.fn(async () => {
        // Capture isReady value at the start of onReady
        isReadyValueInOnReady = client['isReady'].value;
        // Call the original onReady
        return originalOnReady();
      });

      // Initialize the client
      await client.init();

      // Verify that isReady was true when onReady was called
      // This is the key fix - isReady is set BEFORE onReady runs
      expect(isReadyValueInOnReady).toBe(true);

      // Verify onReady was called
      expect(client['onReady']).toHaveBeenCalledTimes(1);
    });

    it('ensures correct operation order: isReady -> onReady -> processing', async () => {
      client = new SegmentClient(clientArgs);

      // Track the order of operations
      const operationOrder: string[] = [];

      // Mock isReady setter
      const isReadyDescriptor = Object.getOwnPropertyDescriptor(
        client['isReady'],
        'value'
      );
      Object.defineProperty(client['isReady'], 'value', {
        ...isReadyDescriptor,
        set: function (value: boolean) {
          if (value === true) {
            operationOrder.push('isReady-set-true');
          }
          isReadyDescriptor?.set?.call(this, value);
        },
      });

      // Mock onReady to track when it's called
      const originalOnReady = client['onReady'].bind(client);
      client['onReady'] = jest.fn(async () => {
        operationOrder.push('onReady-start');
        await originalOnReady();
        operationOrder.push('onReady-end');
      });

      // Initialize the client
      await client.init();

      // Verify the correct order: isReady is set true BEFORE onReady starts
      // The expected order should be:
      // 1. isReady-set-true
      // 2. onReady-start
      // 3. onReady-end
      expect(operationOrder).toEqual([
        'isReady-set-true',
        'onReady-start',
        'onReady-end',
      ]);
    });

    it('does not drop events tracked during onReady processing', async () => {
      // This test verifies that events tracked during onReady() processing
      // are not lost when the fix is applied (isReady set before onReady)

      client = new SegmentClient(clientArgs);

      // Track how many events are added as pending
      const eventsAddedAsPending: string[] = [];
      const originalAddPending = client['store'].pendingEvents.add.bind(
        client['store'].pendingEvents
      );
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
      client['store'].pendingEvents.add = jest.fn(async (event: any) => {
        const eventName: string = event.event || event.type;
        // Only count track events we explicitly send (not auto-tracked events)
        if (eventName?.includes('Event')) {
          eventsAddedAsPending.push(eventName);
        }
        return originalAddPending(event);
      });
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

      // Mock onReady to track events during its execution
      const originalOnReady = client['onReady'].bind(client);
      client['onReady'] = jest.fn(async () => {
        // Track events DURING onReady processing
        // With the fix: these go directly to processing (NOT pending)
        // Without fix: these become pending and never get sent
        await client.track('Event During OnReady 1');
        await client.track('Event During OnReady 2');

        // Call original onReady to process initial pending events
        await originalOnReady();
      });

      // Track an event before initialization (this SHOULD always be pending)
      await client.track('Event Before Init');

      // Initialize the client
      await client.init();

      // CRITICAL ASSERTION:
      // With the fix (isReady = true BEFORE onReady):
      //   - Only "Event Before Init" is added as pending (count = 1)
      //   - Events during onReady go directly to processing
      // Without the fix (isReady = true AFTER onReady):
      //   - All 3 events are added as pending (count = 3)
      //   - Events during onReady become stuck pending events

      expect(eventsAddedAsPending).toEqual(['Event Before Init']);
    });
  });
  /*jshint +W069 */
  /* eslint-enable dot-notation */
});
