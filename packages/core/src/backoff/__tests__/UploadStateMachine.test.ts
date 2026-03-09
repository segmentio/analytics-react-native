import { UploadStateMachine } from '../UploadStateMachine';
import type { Persistor } from '@segment/sovran-react-native';
import type { RateLimitConfig } from '../../types';
import { getMockLogger } from '../../test-helpers';
import { createTestPersistor } from '../test-helpers';

jest.mock('@segment/sovran-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require('../test-helpers');
  return {
    ...jest.requireActual('@segment/sovran-react-native'),
    createStore: jest.fn((initialState: unknown) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      helpers.createMockStore(initialState)
    ),
  };
});

describe('UploadStateMachine', () => {
  let sharedStorage: Record<string, unknown>;
  let mockPersistor: Persistor;
  let mockLogger: ReturnType<typeof getMockLogger>;

  const defaultConfig: RateLimitConfig = {
    enabled: true,
    maxRetryCount: 100,
    maxRetryInterval: 300,
    maxRateLimitDuration: 43200,
  };

  beforeEach(() => {
    sharedStorage = {};
    mockPersistor = createTestPersistor(sharedStorage);
    mockLogger = getMockLogger();
    jest.clearAllMocks();
  });

  describe('canUpload', () => {
    it('returns true in READY state', async () => {
      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      expect(await sm.canUpload()).toBe(true);
    });

    it('returns false during RATE_LIMITED when waitUntilTime not reached', async () => {
      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await sm.handle429(60);

      expect(await sm.canUpload()).toBe(false);
    });

    it('transitions to READY when waitUntilTime has passed', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await sm.handle429(60);
      jest.spyOn(Date, 'now').mockReturnValue(now + 61000);

      expect(await sm.canUpload()).toBe(true);
    });

    it('always returns true when config.enabled is false', async () => {
      const disabledConfig: RateLimitConfig = {
        ...defaultConfig,
        enabled: false,
      };
      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        disabledConfig,
        mockLogger
      );

      await sm.handle429(60);
      expect(await sm.canUpload()).toBe(true);
    });
  });

  describe('handle429', () => {
    it('increments retry count', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await sm.handle429(60);
      expect(await sm.getGlobalRetryCount()).toBe(1);

      await sm.handle429(60);
      expect(await sm.getGlobalRetryCount()).toBe(2);
    });

    it('blocks uploads with correct wait time', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await sm.handle429(60);
      expect(await sm.canUpload()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 59000);
      expect(await sm.canUpload()).toBe(false);

      jest.spyOn(Date, 'now').mockReturnValue(now + 60000);
      expect(await sm.canUpload()).toBe(true);
    });

    it('resets when max retry count exceeded', async () => {
      const limitedConfig: RateLimitConfig = {
        ...defaultConfig,
        maxRetryCount: 3,
      };
      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        limitedConfig,
        mockLogger
      );

      await sm.handle429(10);
      await sm.handle429(10);
      await sm.handle429(10);
      await sm.handle429(10);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Max retry count exceeded (3), resetting rate limiter'
      );
      expect(await sm.getGlobalRetryCount()).toBe(0);
    });

    it('resets when max rate limit duration exceeded', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const limitedConfig: RateLimitConfig = {
        ...defaultConfig,
        maxRateLimitDuration: 10,
      };
      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        limitedConfig,
        mockLogger
      );

      await sm.handle429(5);
      jest.spyOn(Date, 'now').mockReturnValue(now + 11000);
      await sm.handle429(5);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Max backoff duration exceeded (10s), resetting rate limiter'
      );
      expect(await sm.getGlobalRetryCount()).toBe(0);
    });

    it('no-ops when config.enabled is false', async () => {
      const disabledConfig: RateLimitConfig = {
        ...defaultConfig,
        enabled: false,
      };
      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        disabledConfig,
        mockLogger
      );

      await sm.handle429(60);
      expect(await sm.getGlobalRetryCount()).toBe(0);
    });

    it('handles negative retryAfterSeconds gracefully', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await sm.handle429(-10);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid retryAfterSeconds -10, using 0'
      );
      expect(await sm.getGlobalRetryCount()).toBe(1);
      expect(await sm.canUpload()).toBe(true); // No wait time
    });

    it('handles zero retryAfterSeconds', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await sm.handle429(0);

      expect(await sm.getGlobalRetryCount()).toBe(1);
      expect(await sm.canUpload()).toBe(true); // No wait time
    });

    it('clamps very large retryAfterSeconds to maxRetryInterval', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await sm.handle429(999999);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'retryAfterSeconds 999999s exceeds maxRetryInterval, clamping to 300s'
      );
      expect(await sm.getGlobalRetryCount()).toBe(1);

      // Should wait maxRetryInterval, not 999999
      jest.spyOn(Date, 'now').mockReturnValue(now + 299000);
      expect(await sm.canUpload()).toBe(false);
      jest.spyOn(Date, 'now').mockReturnValue(now + 300000);
      expect(await sm.canUpload()).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears to READY with retryCount 0', async () => {
      const sm = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await sm.handle429(60);
      expect(await sm.getGlobalRetryCount()).toBe(1);

      await sm.reset();

      expect(await sm.getGlobalRetryCount()).toBe(0);
      expect(await sm.canUpload()).toBe(true);
    });
  });
});
