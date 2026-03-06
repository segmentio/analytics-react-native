import { createStore } from '@segment/sovran-react-native';
import type { Store, Persistor } from '@segment/sovran-react-native';
import type {
  BatchMetadata,
  BackoffConfig,
  SegmentEvent,
  LoggerType,
} from '../types';
import { getUUID } from '../uuid';

type BatchMetadataStore = {
  batches: Record<string, BatchMetadata>;
};

export class BatchUploadManager {
  private store: Store<BatchMetadataStore>;
  private config: BackoffConfig;
  private logger?: LoggerType;

  constructor(
    storeId: string,
    persistor: Persistor | undefined,
    config: BackoffConfig,
    logger?: LoggerType
  ) {
    this.config = config;
    this.logger = logger;

    // If persistor is provided, try persistent store; fall back to in-memory on error
    try {
      this.store = createStore<BatchMetadataStore>(
        { batches: {} },
        persistor
          ? {
              persist: {
                storeId: `${storeId}-batchMetadata`,
                persistor,
              },
            }
          : undefined
      );
      this.logger?.info('[BatchUploadManager] Store created with persistence');
    } catch (e) {
      this.logger?.error(`[BatchUploadManager] Persistence failed, using in-memory store: ${e}`);

      // Fall back to in-memory store (no persistence)
      try {
        this.store = createStore<BatchMetadataStore>({ batches: {} });
        this.logger?.warn('[BatchUploadManager] Using in-memory store (no persistence)');
      } catch (fallbackError) {
        this.logger?.error(`[BatchUploadManager] CRITICAL: In-memory store creation failed: ${fallbackError}`);
        throw fallbackError;
      }
    }
  }

  /**
   * Creates metadata for a new batch
   */
  createBatch(events: SegmentEvent[]): string {
    const batchId = getUUID();
    const now = Date.now();

    const metadata: BatchMetadata = {
      batchId,
      events,
      retryCount: 0,
      nextRetryTime: now,
      firstFailureTime: now,
    };

    // Store metadata synchronously for tests and immediate access
    // In production, this is fast since it's just in-memory state update
    this.store.dispatch((state: BatchMetadataStore) => ({
      batches: {
        ...state.batches,
        [batchId]: metadata,
      },
    }));

    return batchId;
  }

  /**
   * Handles retry for a failed batch with exponential backoff
   */
  async handleRetry(batchId: string, statusCode: number): Promise<void> {
    if (!this.config.enabled) {
      return; // Legacy behavior when disabled
    }

    const state = await this.store.getState();
    const metadata = state.batches[batchId];
    if (metadata === undefined) return;

    const now = Date.now();
    const totalBackoffDuration = (now - metadata.firstFailureTime) / 1000;

    // Calculate backoff based on CURRENT retry count before incrementing
    const backoffSeconds = this.calculateBackoff(metadata.retryCount);
    const nextRetryTime = now + backoffSeconds * 1000;
    const newRetryCount = metadata.retryCount + 1;

    // Check max retry count
    if (newRetryCount > this.config.maxRetryCount) {
      this.logger?.warn(
        `Batch ${batchId}: max retry count exceeded (${this.config.maxRetryCount}), dropping batch`
      );
      await this.removeBatch(batchId);
      return;
    }

    // Check max total backoff duration
    if (totalBackoffDuration > this.config.maxTotalBackoffDuration) {
      this.logger?.warn(
        `Batch ${batchId}: max backoff duration exceeded (${this.config.maxTotalBackoffDuration}s), dropping batch`
      );
      await this.removeBatch(batchId);
      return;
    }

    await this.store.dispatch((state: BatchMetadataStore) => ({
      batches: {
        ...state.batches,
        [batchId]: {
          ...metadata,
          retryCount: newRetryCount,
          nextRetryTime,
        },
      },
    }));

    this.logger?.info(
      `Batch ${batchId}: retry ${newRetryCount}/${this.config.maxRetryCount} scheduled in ${backoffSeconds}s (status ${statusCode})`
    );
  }

  /**
   * Checks if a batch can be retried (respects nextRetryTime)
   */
  async canRetryBatch(batchId: string): Promise<boolean> {
    if (!this.config.enabled) {
      return true; // Legacy behavior
    }

    const state = await this.store.getState();
    const metadata = state.batches[batchId];
    if (metadata === undefined) return false;

    return Date.now() >= metadata.nextRetryTime;
  }

  /**
   * Gets retry count for a batch
   */
  async getBatchRetryCount(batchId: string): Promise<number> {
    const state = await this.store.getState();
    const metadata = state.batches[batchId];
    return metadata?.retryCount ?? 0;
  }

  /**
   * Removes batch metadata after successful upload or drop
   */
  async removeBatch(batchId: string): Promise<void> {
    await this.store.dispatch((state: BatchMetadataStore) => {
      const { [batchId]: _, ...remainingBatches } = state.batches;
      return { batches: remainingBatches };
    });
  }

  /**
   * Gets all retryable batches (respects nextRetryTime)
   */
  async getRetryableBatches(): Promise<BatchMetadata[]> {
    const state = await this.store.getState();
    const now = Date.now();

    return (Object.values(state.batches) as BatchMetadata[]).filter(
      (batch) => now >= batch.nextRetryTime
    );
  }

  /**
   * Calculates exponential backoff with jitter
   * Formula: min(baseBackoffInterval * 2^retryCount, maxBackoffInterval) + jitter
   */
  private calculateBackoff(retryCount: number): number {
    const { baseBackoffInterval, maxBackoffInterval, jitterPercent } =
      this.config;

    // Exponential backoff
    const backoff = Math.min(
      baseBackoffInterval * Math.pow(2, retryCount),
      maxBackoffInterval
    );

    // Add jitter (0 to jitterPercent% of backoff time)
    const jitterMax = backoff * (jitterPercent / 100);
    const jitter = Math.random() * jitterMax;

    return backoff + jitter;
  }
}
