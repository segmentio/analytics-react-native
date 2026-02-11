import { UploadStateMachine } from '../UploadStateMachine';
import type { Persistor } from '@segment/sovran-react-native';
import type { RateLimitConfig } from '../../types';
import { getMockLogger } from '../../test-helpers';

// Mock sovran-react-native
jest.mock('@segment/sovran-react-native', () => {
  const actualModule = jest.requireActual('@segment/sovran-react-native');
  return {
    ...actualModule,
    createStore: jest.fn((initialState: unknown) => {
      let state = initialState;
      return {
        getState: jest.fn(() => Promise.resolve(state)),
        dispatch: jest.fn((action: unknown) => {
          // Handle functional dispatch
          if (typeof action === 'function') {
            state = action(state);
          } else {
            // Handle action object dispatch - add type guard for payload
            const typedAction = action as { type: string; payload: unknown };
            state = typedAction.payload;
          }
          return Promise.resolve();
        }),
      };
    }),
  };
});

describe('UploadStateMachine', () => {
  // Shared storage for all persistors to simulate real persistence
  let sharedStorage: Record<string, unknown> = {};

  const createMockPersistor = (): Persistor => {
    return {
      get: async <T>(key: string): Promise<T | undefined> => {
        return Promise.resolve(sharedStorage[key] as T);
      },
      set: async <T>(key: string, state: T): Promise<void> => {
        sharedStorage[key] = state;
        return Promise.resolve();
      },
    };
  };

  const defaultConfig: RateLimitConfig = {
    enabled: true,
    maxRetryCount: 100,
    maxRetryInterval: 300,
    maxTotalBackoffDuration: 43200,
  };

  let mockPersistor: Persistor;
  let mockLogger: ReturnType<typeof getMockLogger>;

  beforeEach(() => {
    sharedStorage = {}; // Reset shared storage
    mockPersistor = createMockPersistor();
    mockLogger = getMockLogger();
    jest.clearAllMocks();
  });

  describe('canUpload', () => {
    it('returns true in READY state', async () => {
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const canUpload = await stateMachine.canUpload();
      expect(canUpload).toBe(true);
    });

    it('returns false when in WAITING state and waitUntilTime not passed', async () => {
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      // Set to waiting state with future time
      await stateMachine.handle429(60);

      const canUpload = await stateMachine.canUpload();
      expect(canUpload).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Upload blocked: rate limited')
      );
    });

    it('transitions to READY and returns true when waitUntilTime has passed', async () => {
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      // Mock Date.now to control time
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      // Set to waiting state
      await stateMachine.handle429(60);

      // Advance time past waitUntilTime
      jest.spyOn(Date, 'now').mockReturnValue(now + 61000);

      const canUpload = await stateMachine.canUpload();
      expect(canUpload).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Upload state transitioned to READY'
      );
    });

    it('returns true when disabled (legacy behavior)', async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        disabledConfig,
        mockLogger
      );

      // Even after handle429, should still return true when disabled
      await stateMachine.handle429(60);
      const canUpload = await stateMachine.canUpload();
      expect(canUpload).toBe(true);
    });
  });

  describe('handle429', () => {
    it('sets waitUntilTime and increments retry count', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await stateMachine.handle429(60);

      // Wait for store update
      await new Promise((resolve) => setTimeout(resolve, 50));

      const globalRetryCount = await stateMachine.getGlobalRetryCount();
      expect(globalRetryCount).toBe(1);

      // Verify it's in WAITING state
      const canUpload = await stateMachine.canUpload();
      expect(canUpload).toBe(false);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rate limited (429): waiting 60s before retry 1/100'
      );
    });

    it('increments retry count on multiple 429 responses', async () => {
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await stateMachine.handle429(10);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await stateMachine.getGlobalRetryCount()).toBe(1);

      await stateMachine.handle429(20);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await stateMachine.getGlobalRetryCount()).toBe(2);

      await stateMachine.handle429(30);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await stateMachine.getGlobalRetryCount()).toBe(3);
    });

    it('resets state when max retry count exceeded', async () => {
      const limitedConfig: RateLimitConfig = {
        ...defaultConfig,
        maxRetryCount: 3,
      };
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        limitedConfig,
        mockLogger
      );

      await stateMachine.handle429(10);
      await new Promise((resolve) => setTimeout(resolve, 50));
      await stateMachine.handle429(10);
      await new Promise((resolve) => setTimeout(resolve, 50));
      await stateMachine.handle429(10);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 4th attempt should reset
      await stateMachine.handle429(10);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Max retry count exceeded (3), resetting rate limiter'
      );

      const retryCount = await stateMachine.getGlobalRetryCount();
      expect(retryCount).toBe(0); // Reset to 0
    });

    it('resets state when max total backoff duration exceeded', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const limitedConfig: RateLimitConfig = {
        ...defaultConfig,
        maxTotalBackoffDuration: 10, // Only 10 seconds allowed
      };
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        limitedConfig,
        mockLogger
      );

      await stateMachine.handle429(5);

      // Advance time beyond maxTotalBackoffDuration
      jest.spyOn(Date, 'now').mockReturnValue(now + 11000);

      await stateMachine.handle429(5);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Max backoff duration exceeded (10s), resetting rate limiter'
      );

      const retryCount = await stateMachine.getGlobalRetryCount();
      expect(retryCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('resets state to READY', async () => {
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      // Put into WAITING state
      await stateMachine.handle429(60);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await stateMachine.getGlobalRetryCount()).toBe(1);

      // Reset
      await stateMachine.reset();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(await stateMachine.getGlobalRetryCount()).toBe(0);
      expect(await stateMachine.canUpload()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Upload state reset to READY'
      );
    });
  });

  describe('persistence', () => {
    // TODO: Move to E2E tests - requires real Sovran + AsyncStorage
    // Persistence is critical for TAPI backoff (state must survive app restarts)
    // but unit test mocks don't simulate cross-instance persistence
    it.skip('persists state across instances', async () => {
      const storeId = 'persist-test';

      // Create first instance and set state
      const stateMachine1 = new UploadStateMachine(
        storeId,
        mockPersistor,
        defaultConfig,
        mockLogger
      );
      await stateMachine1.handle429(60);
      expect(await stateMachine1.getGlobalRetryCount()).toBe(1);

      // Create second instance with same persistor
      const stateMachine2 = new UploadStateMachine(
        storeId,
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      // Wait a bit for state to load
      await new Promise((resolve) => setTimeout(resolve, 100));

      // State should be restored
      const retryCount = await stateMachine2.getGlobalRetryCount();
      expect(retryCount).toBe(1);
    });
  });

  describe('getGlobalRetryCount', () => {
    it('returns 0 initially', async () => {
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const count = await stateMachine.getGlobalRetryCount();
      expect(count).toBe(0);
    });

    it('returns correct count after retries', async () => {
      const stateMachine = new UploadStateMachine(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      await stateMachine.handle429(10);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await stateMachine.getGlobalRetryCount()).toBe(1);

      await stateMachine.handle429(10);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await stateMachine.getGlobalRetryCount()).toBe(2);
    });
  });
});
