import { BackoffManager } from '../BackoffManager';
import type { Persistor } from '@segment/sovran-react-native';
import type { BackoffConfig } from '../../types';
import { getMockLogger } from '../../test-helpers';
import { createTestPersistor } from './test-helpers';

jest.mock('@segment/sovran-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require('./test-helpers');
  return {
    ...jest.requireActual('@segment/sovran-react-native'),
    createStore: jest.fn((initialState: unknown) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      helpers.createMockStore(initialState)
    ),
  };
});

describe('BackoffManager', () => {
  let sharedStorage: Record<string, unknown>;
  let mockPersistor: Persistor;
  let mockLogger: ReturnType<typeof getMockLogger>;

  const defaultConfig: BackoffConfig = {
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
      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      expect(await bm.canRetry()).toBe(true);
    });

    it('returns false during BACKING_OFF when nextRetryTime not reached', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await bm.handleTransientError(500);
      expect(await bm.canRetry()).toBe(false);
    });

    it('returns true and transitions to READY after nextRetryTime passes', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await bm.handleTransientError(500);

      jest.spyOn(Date, 'now').mockReturnValue(now + 2000);
      expect(await bm.canRetry()).toBe(true);
    });

    it('always returns true when config.enabled is false', async () => {
      const disabledConfig: BackoffConfig = {
        ...defaultConfig,
        enabled: false,
      };
      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        disabledConfig,
        mockLogger
      );

      await bm.handleTransientError(500);
      expect(await bm.canRetry()).toBe(true);
    });
  });

  describe('handleTransientError', () => {
    it('sets BACKING_OFF state and increments retry count', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await bm.handleTransientError(500);
      expect(await bm.getRetryCount()).toBe(1);
    });

    it('follows exponential backoff progression', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await bm.handleTransientError(500);
      expect(await bm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 999);
      expect(await bm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 1000);
      expect(await bm.canRetry()).toBe(true);

      jest.spyOn(Date, 'now').mockReturnValue(now + 1000);
      await bm.handleTransientError(503);

      jest.spyOn(Date, 'now').mockReturnValue(now + 2999);
      expect(await bm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 3000);
      expect(await bm.canRetry()).toBe(true);
    });

    it('caps backoff at maxBackoffInterval', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const smallCapConfig: BackoffConfig = {
        ...defaultConfig,
        maxBackoffInterval: 5,
      };
      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        smallCapConfig,
        mockLogger
      );

      for (let i = 0; i < 20; i++) {
        await bm.handleTransientError(500);
      }

      jest.spyOn(Date, 'now').mockReturnValue(now + 4999);
      expect(await bm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 5000);
      expect(await bm.canRetry()).toBe(true);
    });

    it('adds jitter within jitterPercent range', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      jest.spyOn(Math, 'random').mockReturnValue(1.0);

      const jitterConfig: BackoffConfig = {
        ...defaultConfig,
        jitterPercent: 10,
      };
      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        jitterConfig,
        mockLogger
      );

      await bm.handleTransientError(500);

      jest.spyOn(Date, 'now').mockReturnValue(now + 1099);
      expect(await bm.canRetry()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 1100);
      expect(await bm.canRetry()).toBe(true);
    });

    it('resets when maxRetryCount exceeded', async () => {
      const limitedConfig: BackoffConfig = {
        ...defaultConfig,
        maxRetryCount: 3,
      };
      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        limitedConfig,
        mockLogger
      );

      await bm.handleTransientError(500);
      await bm.handleTransientError(500);
      await bm.handleTransientError(500);
      await bm.handleTransientError(500);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Max retry count exceeded (3), resetting backoff'
      );
      expect(await bm.getRetryCount()).toBe(0);
    });

    it('resets when maxTotalBackoffDuration exceeded', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const limitedConfig: BackoffConfig = {
        ...defaultConfig,
        maxTotalBackoffDuration: 10,
      };
      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        limitedConfig,
        mockLogger
      );

      await bm.handleTransientError(500);
      jest.spyOn(Date, 'now').mockReturnValue(now + 11000);
      await bm.handleTransientError(500);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Max backoff duration exceeded (10s), resetting backoff'
      );
      expect(await bm.getRetryCount()).toBe(0);
    });

    it('no-ops when config.enabled is false', async () => {
      const disabledConfig: BackoffConfig = {
        ...defaultConfig,
        enabled: false,
      };
      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        disabledConfig,
        mockLogger
      );

      await bm.handleTransientError(500);
      expect(await bm.getRetryCount()).toBe(0);
    });

    it('handles multiple different status codes', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await bm.handleTransientError(500);
      expect(await bm.getRetryCount()).toBe(1);

      jest.spyOn(Date, 'now').mockReturnValue(now + 1000);
      await bm.handleTransientError(503);
      expect(await bm.getRetryCount()).toBe(2);

      jest.spyOn(Date, 'now').mockReturnValue(now + 3000);
      await bm.handleTransientError(408);
      expect(await bm.getRetryCount()).toBe(3);
    });

    it('preserves state across very long backoff durations', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const longDurationConfig: BackoffConfig = {
        ...defaultConfig,
        maxBackoffInterval: 86400, // 24 hours
      };
      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        longDurationConfig,
        mockLogger
      );

      // Trigger max backoff by retrying many times
      for (let i = 0; i < 20; i++) {
        await bm.handleTransientError(500);
      }

      // Should still be backing off
      expect(await bm.canRetry()).toBe(false);

      // Advance to just before 24h
      jest.spyOn(Date, 'now').mockReturnValue(now + 86399000);
      expect(await bm.canRetry()).toBe(false);

      // Advance past 24h
      jest.spyOn(Date, 'now').mockReturnValue(now + 86400000);
      expect(await bm.canRetry()).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears to READY with retryCount 0', async () => {
      const bm = new BackoffManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await bm.handleTransientError(500);
      expect(await bm.getRetryCount()).toBe(1);

      await bm.reset();
      expect(await bm.getRetryCount()).toBe(0);
      expect(await bm.canRetry()).toBe(true);
    });
  });
});
