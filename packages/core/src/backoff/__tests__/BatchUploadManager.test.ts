import { BatchUploadManager } from '../BatchUploadManager';
import type { Persistor } from '@segment/sovran-react-native';
import type { BackoffConfig, SegmentEvent } from '../../types';
import { getMockLogger } from '../../test-helpers';
import { EventType } from '../../types';

// Mock sovran-react-native
jest.mock('@segment/sovran-react-native', () => {
  const actualModule = jest.requireActual('@segment/sovran-react-native');
  return {
    ...actualModule,
    createStore: jest.fn((initialState: any) => {
      let state = initialState;
      return {
        getState: jest.fn(() => Promise.resolve(state)),
        dispatch: jest.fn((action: any) => {
          // Handle different action types
          if (action.type === 'ADD_BATCH') {
            state = {
              ...state,
              batches: {
                ...state.batches,
                [action.payload.batchId]: action.payload.metadata,
              },
            };
          } else if (action.type === 'UPDATE_BATCH') {
            state = {
              ...state,
              batches: {
                ...state.batches,
                [action.payload.batchId]: action.payload.metadata,
              },
            };
          } else if (action.type === 'REMOVE_BATCH') {
            const { [action.payload.batchId]: removed, ...rest } = state.batches;
            state = { ...state, batches: rest };
          }
          return Promise.resolve();
        }),
      };
    }),
  };
});

describe('BatchUploadManager', () => {
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

  const defaultConfig: BackoffConfig = {
    enabled: true,
    maxRetryCount: 100,
    baseBackoffInterval: 0.5,
    maxBackoffInterval: 300,
    maxTotalBackoffDuration: 43200,
    jitterPercent: 10,
    retryableStatusCodes: [408, 410, 429, 460, 500, 502, 503, 504, 508],
  };

  const createMockEvents = (count: number): SegmentEvent[] => {
    return Array.from({ length: count }, (_, i) => ({
      messageId: `msg-${i}`,
      type: EventType.TrackEvent,
      event: 'Test Event',
      timestamp: new Date().toISOString(),
    }));
  };

  let mockPersistor: Persistor;
  let mockLogger: ReturnType<typeof getMockLogger>;

  beforeEach(() => {
    sharedStorage = {}; // Reset shared storage
    mockPersistor = createMockPersistor();
    mockLogger = getMockLogger();
    jest.clearAllMocks();
  });

  describe('createBatch', () => {
    it('creates a new batch with metadata', () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      expect(batchId).toBeDefined();
      expect(typeof batchId).toBe('string');
    });

    it('creates unique batch IDs', () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const batchId1 = manager.createBatch(createMockEvents(5));
      const batchId2 = manager.createBatch(createMockEvents(5));

      expect(batchId1).not.toBe(batchId2);
    });
  });

  describe('handleRetry', () => {
    it('increments retry count and schedules next retry', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      await manager.handleRetry(batchId, 500);

      const retryCount = await manager.getBatchRetryCount(batchId);
      expect(retryCount).toBe(1);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Batch ${batchId}: retry 1/100`)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('(status 500)')
      );
    });

    it('uses exponential backoff for scheduling', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      // First retry - should be ~0.5s
      await manager.handleRetry(batchId, 500);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/scheduled in 0\.[5-6]\d*s/)
      );

      (mockLogger.info as jest.Mock).mockClear();

      // Second retry - should be ~1s
      await manager.handleRetry(batchId, 500);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/scheduled in [1-2]\.\d+s/)
      );
    });

    it('removes batch when max retry count exceeded', async () => {
      const limitedConfig: BackoffConfig = {
        ...defaultConfig,
        maxRetryCount: 3,
      };
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        limitedConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      // Retry 3 times
      await manager.handleRetry(batchId, 500);
      await manager.handleRetry(batchId, 500);
      await manager.handleRetry(batchId, 500);

      // 4th retry should drop the batch
      await manager.handleRetry(batchId, 500);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max retry count exceeded (3)')
      );

      const retryCount = await manager.getBatchRetryCount(batchId);
      expect(retryCount).toBe(0); // Batch removed
    });

    it('removes batch when max total backoff duration exceeded', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const limitedConfig: BackoffConfig = {
        ...defaultConfig,
        maxTotalBackoffDuration: 10, // Only 10 seconds
      };
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        limitedConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      await manager.handleRetry(batchId, 500);

      // Advance time beyond maxTotalBackoffDuration
      jest.spyOn(Date, 'now').mockReturnValue(now + 11000);

      await manager.handleRetry(batchId, 500);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max backoff duration exceeded (10s)')
      );

      const retryCount = await manager.getBatchRetryCount(batchId);
      expect(retryCount).toBe(0); // Batch removed
    });

    it('does nothing when disabled (legacy behavior)', async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        disabledConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      await manager.handleRetry(batchId, 500);

      const retryCount = await manager.getBatchRetryCount(batchId);
      expect(retryCount).toBe(0); // No retry tracking when disabled
    });
  });

  describe('canRetryBatch', () => {
    it('returns true initially', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      const canRetry = await manager.canRetryBatch(batchId);
      expect(canRetry).toBe(true);
    });

    it('returns false before nextRetryTime', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      await manager.handleRetry(batchId, 500);

      // Still at same time, nextRetryTime is in future
      const canRetry = await manager.canRetryBatch(batchId);
      expect(canRetry).toBe(false);
    });

    it('returns true after nextRetryTime passes', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      await manager.handleRetry(batchId, 500);

      // Advance time past nextRetryTime (more than 1s for first retry)
      jest.spyOn(Date, 'now').mockReturnValue(now + 2000);

      const canRetry = await manager.canRetryBatch(batchId);
      expect(canRetry).toBe(true);
    });

    it('returns false for non-existent batch', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const canRetry = await manager.canRetryBatch('non-existent-id');
      expect(canRetry).toBe(false);
    });

    it('returns true when disabled (legacy behavior)', async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        disabledConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      const canRetry = await manager.canRetryBatch(batchId);
      expect(canRetry).toBe(true);
    });
  });

  describe('getBatchRetryCount', () => {
    it('returns 0 for new batch', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      const count = await manager.getBatchRetryCount(batchId);
      expect(count).toBe(0);
    });

    it('returns correct count after retries', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      await manager.handleRetry(batchId, 500);
      expect(await manager.getBatchRetryCount(batchId)).toBe(1);

      await manager.handleRetry(batchId, 500);
      expect(await manager.getBatchRetryCount(batchId)).toBe(2);
    });

    it('returns 0 for non-existent batch', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const count = await manager.getBatchRetryCount('non-existent-id');
      expect(count).toBe(0);
    });
  });

  describe('removeBatch', () => {
    it('removes batch metadata', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      await manager.handleRetry(batchId, 500);
      expect(await manager.getBatchRetryCount(batchId)).toBe(1);

      await manager.removeBatch(batchId);

      expect(await manager.getBatchRetryCount(batchId)).toBe(0);
    });
  });

  describe('getRetryableBatches', () => {
    it('returns empty array initially', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const batches = await manager.getRetryableBatches();
      expect(batches).toEqual([]);
    });

    it('returns batches that can be retried', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const batch1Id = manager.createBatch(createMockEvents(5));
      const batch2Id = manager.createBatch(createMockEvents(5));

      await manager.handleRetry(batch1Id, 500);
      await manager.handleRetry(batch2Id, 500);

      // Advance time so batches can be retried
      jest.spyOn(Date, 'now').mockReturnValue(now + 2000);

      const batches = await manager.getRetryableBatches();
      expect(batches.length).toBe(2);
    });

    it('excludes batches not ready for retry', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      const batch1Id = manager.createBatch(createMockEvents(5));
      await manager.handleRetry(batch1Id, 500);

      // Don't advance time, batch shouldn't be retryable yet
      const batches = await manager.getRetryableBatches();
      expect(batches.length).toBe(0);
    });
  });

  describe('exponential backoff calculation', () => {
    it('applies exponential backoff correctly', async () => {
      // Use config with no jitter for predictable testing
      const noJitterConfig: BackoffConfig = {
        ...defaultConfig,
        jitterPercent: 0,
      };

      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        noJitterConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      // Test progression of backoff times
      const expectedBackoffs = [0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 300]; // Caps at 300

      for (let i = 0; i < 11; i++) {
        (mockLogger.info as jest.Mock).mockClear();
        await manager.handleRetry(batchId, 500);

        if (i < 10) {
          // Check the logged backoff time matches expected (within jitter tolerance)
          const logCall = (mockLogger.info as jest.Mock).mock.calls[0][0] as string;
          const match = logCall.match(/scheduled in ([\d.]+)s/);
          if (match) {
            const loggedTime = parseFloat(match[1]);
            expect(loggedTime).toBeCloseTo(expectedBackoffs[i], 0);
          }
        } else {
          // After maxRetryCount exceeded, batch should be dropped
          expect(mockLogger.warn).toHaveBeenCalled();
        }
      }
    });

    it('caps backoff at maxBackoffInterval', async () => {
      const cappedConfig: BackoffConfig = {
        ...defaultConfig,
        maxBackoffInterval: 10, // Cap at 10 seconds
        jitterPercent: 0,
      };

      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        cappedConfig,
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      // Retry many times
      for (let i = 0; i < 10; i++) {
        await manager.handleRetry(batchId, 500);
      }

      // Last retry should have capped backoff
      const infoMock = mockLogger.info as jest.Mock;
      const lastLog = (infoMock.mock.calls[infoMock.mock.calls.length - 1][0] as string);
      const match = lastLog.match(/scheduled in ([\d.]+)s/);
      if (match) {
        const loggedTime = parseFloat(match[1]);
        expect(loggedTime).toBeLessThanOrEqual(10);
      }
    });

    it('adds jitter to backoff time', async () => {
      const manager = new BatchUploadManager(
        'test-key',
        mockPersistor,
        defaultConfig, // Has 10% jitter
        mockLogger
      );

      const events = createMockEvents(5);
      const batchId = manager.createBatch(events);

      await manager.handleRetry(batchId, 500);

      const logCall = (mockLogger.info as jest.Mock).mock.calls[0][0] as string;
      const match = logCall.match(/scheduled in ([\d.]+)s/);
      if (match) {
        const loggedTime = parseFloat(match[1]);
        // Should be baseBackoffInterval (0.5) + up to 10% jitter
        expect(loggedTime).toBeGreaterThanOrEqual(0.5);
        expect(loggedTime).toBeLessThan(0.55); // 0.5 + 0.05 jitter
      }
    });
  });

  describe('persistence', () => {
    it('persists batch metadata across instances', async () => {
      const storeId = 'persist-test';

      // Create first instance and add batch
      const manager1 = new BatchUploadManager(
        storeId,
        mockPersistor,
        defaultConfig,
        mockLogger
      );
      const events = createMockEvents(5);
      const batchId = manager1.createBatch(events);
      await manager1.handleRetry(batchId, 500);

      // Create second instance with same persistor
      const manager2 = new BatchUploadManager(
        storeId,
        mockPersistor,
        defaultConfig,
        mockLogger
      );

      // Wait for state to load
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Batch metadata should be restored
      const retryCount = await manager2.getBatchRetryCount(batchId);
      expect(retryCount).toBe(1);
    });
  });
});
