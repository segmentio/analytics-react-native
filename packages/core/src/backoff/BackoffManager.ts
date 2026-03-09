import { createStore } from '@segment/sovran-react-native';
import type { Store, Persistor } from '@segment/sovran-react-native';
import type { BackoffStateData, BackoffConfig, LoggerType } from '../types';

const INITIAL_STATE: BackoffStateData = {
  state: 'READY',
  retryCount: 0,
  nextRetryTime: 0,
  firstFailureTime: 0,
};

/**
 * Global backoff manager for transient errors (5xx, 408, 410, 460) per the TAPI SDD.
 * Implements exponential backoff with jitter and enforces retry limits.
 *
 * DESIGN NOTE: This implementation uses GLOBAL backoff state rather than per-batch tracking.
 * The TAPI SDD specifies per-batch backoff with stable file identifiers, but the RN SDK
 * architecture uses an in-memory queue where chunk() creates new batch arrays on each flush.
 * Without stable batch identities, global backoff is the practical implementation.
 *
 * Behavior difference from SDD:
 * - SDD: If batch A fails with 503, only batch A waits; batch B uploads immediately
 * - This: If any batch fails with 503, ALL batches wait the backoff period
 *
 * Rationale: During TAPI outages, all batches typically fail anyway, making global backoff
 * equivalent in practice while being simpler and safer (reduces load on degraded service).
 */
export class BackoffManager {
  private store: Store<BackoffStateData>;
  private config: BackoffConfig;
  private logger?: LoggerType;

  /**
   * Creates a BackoffManager instance.
   *
   * @param storeId - Unique identifier for the store (typically writeKey)
   * @param persistor - Optional persistor for state persistence
   * @param config - Backoff configuration from Settings object
   * @param logger - Optional logger for debugging
   */
  constructor(
    storeId: string,
    persistor: Persistor | undefined,
    config: BackoffConfig,
    logger?: LoggerType
  ) {
    this.config = config;
    this.logger = logger;

    try {
      this.store = createStore<BackoffStateData>(
        INITIAL_STATE,
        persistor
          ? {
              persist: {
                storeId: `${storeId}-backoffState`,
                persistor,
              },
            }
          : undefined
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger?.error(
        `[BackoffManager] Persistence failed, using in-memory store: ${errorMessage}`
      );

      try {
        this.store = createStore<BackoffStateData>(INITIAL_STATE);
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
        this.logger?.error(
          `[BackoffManager] CRITICAL: In-memory store creation failed: ${fallbackMessage}`
        );
        throw fallbackError;
      }
    }
  }

  /**
   * Check if retries can proceed based on backoff state.
   * Automatically transitions from BACKING_OFF to READY when wait time has passed.
   *
   * @returns true if retries should proceed, false if backing off
   */
  async canRetry(): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

    const state = await this.store.getState();

    if (state.state === 'READY') {
      return true;
    }

    const now = Date.now();
    if (now >= state.nextRetryTime) {
      this.logger?.info('Backoff period expired, resuming retries');
      await this.store.dispatch((s: BackoffStateData) => ({
        ...s,
        state: 'READY' as const,
      }));
      return true;
    }

    const waitSeconds = Math.ceil((state.nextRetryTime - now) / 1000);
    this.logger?.info(
      `Backoff active: retry in ${waitSeconds}s (attempt ${state.retryCount}/${this.config.maxRetryCount})`
    );
    return false;
  }

  /**
   * Handle a transient error response by setting exponential backoff.
   * Increments retry count and enforces max retry/duration limits.
   * Thread-safe: uses atomic dispatch to handle concurrent transient errors.
   *
   * @param statusCode - HTTP status code of the transient error (5xx, 408, 410, 460)
   */
  async handleTransientError(statusCode: number): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();

    // Atomic dispatch prevents async interleaving when multiple batches fail
    await this.store.dispatch((state: BackoffStateData) => {
      const newRetryCount = state.retryCount + 1;
      const firstFailureTime =
        state.firstFailureTime > 0 ? state.firstFailureTime : now;
      const totalDuration = (now - firstFailureTime) / 1000;

      // Max retry count check
      if (newRetryCount > this.config.maxRetryCount) {
        this.logger?.warn(
          `Max retry count exceeded (${this.config.maxRetryCount}), resetting backoff`
        );
        return INITIAL_STATE;
      }

      // Max duration check
      if (totalDuration > this.config.maxTotalBackoffDuration) {
        this.logger?.warn(
          `Max backoff duration exceeded (${this.config.maxTotalBackoffDuration}s), resetting backoff`
        );
        return INITIAL_STATE;
      }

      // Use current retryCount (not newRetryCount) for SDD-compliant progression
      // Retry 1: retryCount=0 → 0.5 * 2^0 = 0.5s
      // Retry 2: retryCount=1 → 0.5 * 2^1 = 1.0s
      // Retry 3: retryCount=2 → 0.5 * 2^2 = 2.0s
      const backoffSeconds = this.calculateBackoff(state.retryCount);
      const nextRetryTime = now + backoffSeconds * 1000;

      this.logger?.info(
        `Transient error (${statusCode}): backoff ${backoffSeconds.toFixed(1)}s, attempt ${newRetryCount}/${this.config.maxRetryCount}`
      );

      return {
        state: 'BACKING_OFF' as const,
        retryCount: newRetryCount,
        nextRetryTime,
        firstFailureTime,
      };
    });
  }

  /**
   * Reset the backoff manager to READY with retry count 0.
   * Called on successful upload (2xx response).
   */
  async reset(): Promise<void> {
    await this.store.dispatch(() => INITIAL_STATE);
  }

  /**
   * Get the current retry count for X-Retry-Count header.
   *
   * @returns Current retry count
   */
  async getRetryCount(): Promise<number> {
    const state = await this.store.getState();
    return state.retryCount;
  }

  /**
   * Calculate exponential backoff with jitter.
   * Formula: min(baseBackoffInterval * 2^retryCount, maxBackoffInterval) + jitter
   *
   * @param retryCount - Current retry attempt number
   * @returns Backoff delay in seconds
   */
  private calculateBackoff(retryCount: number): number {
    const { baseBackoffInterval, maxBackoffInterval, jitterPercent } =
      this.config;

    const backoff = Math.min(
      baseBackoffInterval * Math.pow(2, retryCount),
      maxBackoffInterval
    );

    const jitterMax = backoff * (jitterPercent / 100);
    const jitter = Math.random() * jitterMax;

    return backoff + jitter;
  }
}
