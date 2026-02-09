import { createStore } from '@segment/sovran-react-native';
import type { Persistor } from '@segment/sovran-react-native';
import type { BatchMetadata, BackoffConfig, SegmentEvent, LoggerType } from '../types';
import { getUUID } from '../uuid';

type BatchMetadataStore = {
  batches: Record<string, BatchMetadata>;
};

export class BatchUploadManager {
  private store: any;
  private config: BackoffConfig;
  private logger?: LoggerType;

  constructor(
    storeId: string,
    persistor: Persistor,
    config: BackoffConfig,
    logger?: LoggerType
  ) {
    this.config = config;
    this.logger = logger;

    this.store = createStore<BatchMetadataStore>(
      { batches: {} },
      {
        persist: {
          storeId: `${storeId}-batchMetadata`,
          persistor,
        },
      }
    );
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

    // Dispatch asynchronously but don't wait for it
    // The metadata will be available when needed for retry
    void this.store.dispatch({
      type: 'ADD_BATCH',
      payload: { batchId, metadata },
    });

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
    if (!metadata) return;

    const now = Date.now();
    const newRetryCount = metadata.retryCount + 1;
    const totalBackoffDuration = (now - metadata.firstFailureTime) / 1000;

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

    // Calculate exponential backoff with jitter
    const backoffSeconds = this.calculateBackoff(newRetryCount);
    const nextRetryTime = now + backoffSeconds * 1000;

    await this.store.dispatch({
      type: 'UPDATE_BATCH',
      payload: {
        batchId,
        metadata: {
          ...metadata,
          retryCount: newRetryCount,
          nextRetryTime,
        },
      },
    });

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
    if (!metadata) return false;

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
    await this.store.dispatch({
      type: 'REMOVE_BATCH',
      payload: { batchId },
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
    const { baseBackoffInterval, maxBackoffInterval, jitterPercent } = this.config;

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
