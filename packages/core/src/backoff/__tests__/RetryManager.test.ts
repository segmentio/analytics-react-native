import { RetryManager } from '../RetryManager';
import type { Persistor } from '@segment/sovran-react-native';
import type { RateLimitConfig, BackoffConfig } from '../../types';
import { getMockLogger } from '../../test-helpers';
import { createTestPersistor } from '../test-helpers';

jest.mock('@segment/sovran-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require('../test-helpers');
  return {
    ...jest.requireActual('@segment/sovran-react-native'),
    createStore: jest.fn((initialState: unknown) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      helpers.createMockStore(initialState)
    ),
  };
});

describe('RetryManager', () => {
  let sharedStorage: Record<string, unknown>;
  let mockPersistor: Persistor;
  let mockLogger: ReturnType<typeof getMockLogger>;

  const defaultRateLimitConfig: RateLimitConfig = {
    enabled: true,
    maxRetryCount: 100,
    maxRetryInterval: 300,
    maxRateLimitDuration: 43200,
  };

  const defaultBackoffConfig: BackoffConfig = {
    enabled: true,
    maxRetryCount: 100,
    baseBackoffInterval: 0.5,
    maxBackoffInterval: 300,
    maxTotalBackoffDuration: 43200,
    jitterPercent: 0,
    default4xxBehavior: 'drop',
    default5xxBehavior: 'retry',
    statusCodeOverrides: {},
  };

  beforeEach(() => {
    sharedStorage = {};
    mockPersistor = createTestPersistor(sharedStorage);
    mockLogger = getMockLogger();
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('canRetry', () => {
    it('returns true in READY state', async () => {
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      expect(await rm.canRetry()).toBe(true);
    });

    it('returns false during RATE_LIMITED when waitUntilTime not reached', async () => {
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(60);

      expect(await rm.canRetry()).toBe(false);
    });

    it('returns false during BACKING_OFF when waitUntilTime not reached', async () => {
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handleTransientError();

      expect(await rm.canRetry()).toBe(false);
    });

    it('transitions to READY when waitUntilTime has passed', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(60);
      jest.spyOn(Date, 'now').mockReturnValue(now + 61000);

      expect(await rm.canRetry()).toBe(true);
    });

    it('always returns true when rate limit config is disabled', async () => {
      const disabledConfig: RateLimitConfig = {
        ...defaultRateLimitConfig,
        enabled: false,
      };
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        disabledConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(60);
      expect(await rm.canRetry()).toBe(true);
    });

    it('always returns true when backoff config is disabled', async () => {
      const disabledConfig: BackoffConfig = {
        ...defaultBackoffConfig,
        enabled: false,
      };
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        disabledConfig,
        mockLogger
      );

      await rm.handleTransientError();
      expect(await rm.canRetry()).toBe(true);
    });
  });

  describe('handle429', () => {
    it('increments retry count', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(60);
      expect(await rm.getRetryCount()).toBe(1);

      await rm.handle429(60);
      expect(await rm.getRetryCount()).toBe(2);
    });

    it('uses longest retry-after when multiple 429s occur', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(60);
      await rm.handle429(120);

      // Should wait 120s, not 60s
      jest.spyOn(Date, 'now').mockReturnValue(now + 61000);
      expect(await rm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 121000);
      expect(await rm.canRetry()).toBe(true);
    });

    it('clamps retry-after to maxRetryInterval', async () => {
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(500); // Exceeds maxRetryInterval of 300

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('exceeds maxRetryInterval')
      );
    });

    it('rejects negative retry-after values', async () => {
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(-5);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid retryAfterSeconds')
      );
    });

    it('resets when maxRetryCount exceeded', async () => {
      const config: RateLimitConfig = {
        ...defaultRateLimitConfig,
        maxRetryCount: 3,
      };
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        config,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(1);
      await rm.handle429(1);
      await rm.handle429(1);
      await rm.handle429(1); // Should reset

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Max retry count exceeded')
      );
      expect(await rm.canRetry()).toBe(true);
    });

    it('429 overrides BACKING_OFF state (server signal takes precedence)', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      // Trigger transient error first → BACKING_OFF state
      await rm.handleTransientError();
      expect(await rm.getRetryCount()).toBe(1);

      // Now trigger 429 → should override to RATE_LIMITED
      await rm.handle429(120);

      // Retry count should have incremented
      expect(await rm.getRetryCount()).toBe(2);

      // Should be blocked by 429's 120s, not original backoff's 0.5s
      jest.spyOn(Date, 'now').mockReturnValue(now + 600);
      expect(await rm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 121000);
      expect(await rm.canRetry()).toBe(true);
    });

    it('resets when maxRateLimitDuration exceeded', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const config: RateLimitConfig = {
        ...defaultRateLimitConfig,
        maxRateLimitDuration: 100,
      };
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        config,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(10);

      jest.spyOn(Date, 'now').mockReturnValue(now + 101000);
      await rm.handle429(10);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Max retry duration exceeded')
      );
    });
  });

  describe('handleTransientError', () => {
    it('increments retry count', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handleTransientError();
      expect(await rm.getRetryCount()).toBe(1);

      await rm.handleTransientError();
      expect(await rm.getRetryCount()).toBe(2);
    });

    it('uses exponential backoff', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      // First error: 0.5 * 2^0 = 0.5s
      await rm.handleTransientError();
      jest.spyOn(Date, 'now').mockReturnValue(now + 400);
      expect(await rm.canRetry()).toBe(false);

      // Second error before first expires: 0.5 * 2^1 = 1s
      jest.spyOn(Date, 'now').mockReturnValue(now + 400);
      await rm.handleTransientError();

      // Should now wait for the 1s from second error
      jest.spyOn(Date, 'now').mockReturnValue(now + 1300);
      expect(await rm.canRetry()).toBe(false);
      jest.spyOn(Date, 'now').mockReturnValue(now + 1500);
      expect(await rm.canRetry()).toBe(true);
    });

    it('clamps backoff to maxBackoffInterval', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const config: BackoffConfig = {
        ...defaultBackoffConfig,
        maxBackoffInterval: 5,
      };
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        config,
        mockLogger
      );

      // Retry many times to exceed maxBackoffInterval
      // Without moving time forward so they accumulate
      for (let i = 0; i < 10; i++) {
        await rm.handleTransientError();
      }

      // Should be clamped to 5s
      jest.spyOn(Date, 'now').mockReturnValue(now + 4000);
      expect(await rm.canRetry()).toBe(false);
      jest.spyOn(Date, 'now').mockReturnValue(now + 6000);
      expect(await rm.canRetry()).toBe(true);
    });

    it('resets when maxRetryCount exceeded', async () => {
      const config: BackoffConfig = {
        ...defaultBackoffConfig,
        maxRetryCount: 3,
      };
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        config,
        mockLogger
      );

      await rm.handleTransientError();
      await rm.handleTransientError();
      await rm.handleTransientError();
      await rm.handleTransientError(); // Should reset

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Max retry count exceeded')
      );
      expect(await rm.canRetry()).toBe(true);
    });

    it('resets when maxTotalBackoffDuration exceeded', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const config: BackoffConfig = {
        ...defaultBackoffConfig,
        maxTotalBackoffDuration: 100,
      };
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        config,
        mockLogger
      );

      await rm.handleTransientError();

      jest.spyOn(Date, 'now').mockReturnValue(now + 101000);
      await rm.handleTransientError();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Max retry duration exceeded')
      );
    });
  });

  describe('reset', () => {
    it('resets retry count and state to READY', async () => {
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(60);
      expect(await rm.getRetryCount()).toBe(1);
      expect(await rm.canRetry()).toBe(false);

      await rm.reset();

      expect(await rm.getRetryCount()).toBe(0);
      expect(await rm.canRetry()).toBe(true);
    });
  });

  describe('retryStrategy', () => {
    it('defaults to lazy (uses longest wait time)', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      // No retryStrategy passed → defaults to 'lazy'
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      await rm.handle429(60);
      await rm.handle429(120);

      // Lazy: should use 120s (longest)
      jest.spyOn(Date, 'now').mockReturnValue(now + 61000);
      expect(await rm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 121000);
      expect(await rm.canRetry()).toBe(true);
    });

    it('eager strategy uses shortest wait time', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger,
        'eager'
      );

      await rm.handle429(60);
      await rm.handle429(120);

      // Eager: should use 60s (shortest)
      jest.spyOn(Date, 'now').mockReturnValue(now + 61000);
      expect(await rm.canRetry()).toBe(true);
    });

    it('lazy strategy uses longest wait time', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger,
        'lazy'
      );

      await rm.handle429(60);
      await rm.handle429(120);

      // Lazy: should use 120s (longest)
      jest.spyOn(Date, 'now').mockReturnValue(now + 61000);
      expect(await rm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 121000);
      expect(await rm.canRetry()).toBe(true);
    });

    it('eager strategy applies to transient errors too', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger,
        'eager'
      );

      // First transient: 0.5 * 2^0 = 0.5s → wait until now + 500ms
      await rm.handleTransientError();
      // Second transient: 0.5 * 2^1 = 1s → wait until now + 1000ms
      // Eager: min(now+500, now+1000) = now+500
      await rm.handleTransientError();

      // Should be retryable after 500ms (eager picks shortest)
      jest.spyOn(Date, 'now').mockReturnValue(now + 600);
      expect(await rm.canRetry()).toBe(true);
    });
  });

  describe('autoFlush', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('fires callback when wait period expires', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const flushCallback = jest.fn();
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );
      rm.setAutoFlushCallback(flushCallback);

      await rm.handle429(10); // Wait 10s

      expect(flushCallback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(10000);

      expect(flushCallback).toHaveBeenCalledTimes(1);
    });

    it('does not fire when no callback is set', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      // No callback set — should not throw
      await rm.handle429(10);

      jest.advanceTimersByTime(10000);
      // No assertion needed — just verifying no error is thrown
    });

    it('clears timer on reset', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const flushCallback = jest.fn();
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );
      rm.setAutoFlushCallback(flushCallback);

      await rm.handle429(10);
      await rm.reset();

      jest.advanceTimersByTime(10000);
      expect(flushCallback).not.toHaveBeenCalled();
    });

    it('clears timer on destroy', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const flushCallback = jest.fn();
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );
      rm.setAutoFlushCallback(flushCallback);

      await rm.handle429(10);
      rm.destroy();

      jest.advanceTimersByTime(10000);
      expect(flushCallback).not.toHaveBeenCalled();
    });

    it('replaces timer when new error extends wait time', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const flushCallback = jest.fn();
      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );
      rm.setAutoFlushCallback(flushCallback);

      await rm.handle429(10); // Wait 10s
      await rm.handle429(30); // Wait 30s (lazy: takes max)

      // After 10s, should NOT have fired (timer was replaced)
      jest.advanceTimersByTime(10000);
      expect(flushCallback).not.toHaveBeenCalled();

      // After 30s total, should fire
      jest.advanceTimersByTime(20000);
      expect(flushCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('mixed 429 and transient errors', () => {
    it('handles both error types independently', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const rm = new RetryManager(
        'test-key',
        mockPersistor,
        defaultRateLimitConfig,
        defaultBackoffConfig,
        mockLogger
      );

      // Get a 429 first
      await rm.handle429(60);
      expect(await rm.getRetryCount()).toBe(1);

      // Then a transient error before 429 expires
      jest.spyOn(Date, 'now').mockReturnValue(now + 10000);
      await rm.handleTransientError();
      expect(await rm.getRetryCount()).toBe(2);

      // Should use the longest wait time (429's 60s)
      jest.spyOn(Date, 'now').mockReturnValue(now + 50000);
      expect(await rm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 61000);
      expect(await rm.canRetry()).toBe(true);
    });
  });
});
