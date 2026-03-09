import { createStore } from '@segment/sovran-react-native';
import type { Store, Persistor } from '@segment/sovran-react-native';
import type { LoggerType, RateLimitConfig, BackoffConfig } from '../types';

type RetryStateData = {
  state: 'READY' | 'RATE_LIMITED' | 'BACKING_OFF';
  waitUntilTime: number;
  retryCount: number;
  firstFailureTime: number | null;
};

const INITIAL_STATE: RetryStateData = {
  state: 'READY',
  waitUntilTime: 0,
  retryCount: 0,
  firstFailureTime: null,
};

/**
 * Manages retry state for rate limiting (429) and transient errors (5xx).
 * Handles wait times from server (429 Retry-After) or calculated exponential backoff (5xx).
 *
 * State machine: READY → RATE_LIMITED (429) or BACKING_OFF (5xx) → READY
 * - READY: uploads proceed normally
 * - RATE_LIMITED: server returned 429 with Retry-After; uploads blocked until wait expires
 * - BACKING_OFF: transient error (5xx/network); exponential backoff until wait expires
 *
 * ARCHITECTURE: Concurrent Batch Submission
 *
 * DEVIATION FROM SDD: The SDD specifies sequential batch processing where a 429
 * halts the upload loop. This implementation is designed for CONCURRENT batch
 * submission — the RN SDK uploads all batches in parallel via Promise.all().
 *
 * This means multiple batches can fail simultaneously with different error codes,
 * and some may succeed while others fail (partial success). Error aggregation in
 * SegmentDestination compensates:
 * - Single retry increment per flush (not per failed batch)
 * - Longest Retry-After from multiple 429s used (most conservative)
 * - Partial successes dequeued immediately
 * - Retry strategy (eager/lazy) controls how concurrent wait times are combined
 *
 * ARCHITECTURE: Global Retry Counter
 *
 * DEVIATION FROM SDD: Uses a global retry counter instead of per-batch counters.
 * The RN SDK has no stable batch identities — batches are re-chunked from the
 * event queue on each flush. During TAPI outages all batches fail together,
 * making a global counter equivalent in practice. This aligns with the SDK's
 * ephemeral batch architecture where persistence is at the event level.
 */
export class RetryManager {
  private store: Store<RetryStateData>;
  private rateLimitConfig?: RateLimitConfig;
  private backoffConfig?: BackoffConfig;
  private logger?: LoggerType;
  private retryStrategy: 'eager' | 'lazy';
  private autoFlushCallback?: () => void;
  private autoFlushTimer?: ReturnType<typeof setTimeout>;

  /**
   * Creates a RetryManager instance.
   *
   * @param storeId - Unique identifier for the store (typically writeKey)
   * @param persistor - Optional persistor for state persistence
   * @param rateLimitConfig - Optional rate limit configuration (for 429 handling)
   * @param backoffConfig - Optional backoff configuration (for transient errors)
   * @param logger - Optional logger for debugging
   * @param retryStrategy - 'lazy' (default, most conservative) or 'eager' (retry sooner)
   */
  constructor(
    storeId: string,
    persistor: Persistor | undefined,
    rateLimitConfig?: RateLimitConfig,
    backoffConfig?: BackoffConfig,
    logger?: LoggerType,
    retryStrategy: 'eager' | 'lazy' = 'lazy'
  ) {
    this.rateLimitConfig = rateLimitConfig;
    this.backoffConfig = backoffConfig;
    this.logger = logger;
    this.retryStrategy = retryStrategy;

    try {
      this.store = createStore<RetryStateData>(
        INITIAL_STATE,
        persistor
          ? {
              persist: {
                storeId: `${storeId}-retryState`,
                persistor,
              },
            }
          : undefined
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger?.error(
        `[RetryManager] Persistence failed, using in-memory store: ${errorMessage}`
      );

      try {
        this.store = createStore<RetryStateData>(INITIAL_STATE);
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
        this.logger?.error(
          `[RetryManager] CRITICAL: In-memory store creation failed: ${fallbackMessage}`
        );
        throw fallbackError;
      }
    }
  }

  /**
   * Check if retries can proceed based on current state.
   * Automatically transitions to READY when wait time has passed.
   *
   * @returns true if operations should proceed, false if blocked
   */
  async canRetry(): Promise<boolean> {
    const state = await this.store.getState();
    const now = Date.now();

    if (state.state === 'READY') {
      return true;
    }

    if (now >= state.waitUntilTime) {
      await this.transitionToReady();
      return true;
    }

    const waitSeconds = Math.ceil((state.waitUntilTime - now) / 1000);
    const stateType =
      state.state === 'RATE_LIMITED' ? 'rate limited' : 'backing off';
    this.logger?.info(
      `Upload blocked: ${stateType}, retry in ${waitSeconds}s (retry ${state.retryCount})`
    );
    return false;
  }

  /**
   * Handle a 429 rate limit response.
   * Uses server-specified wait time from Retry-After header.
   *
   * @param retryAfterSeconds - Delay in seconds from Retry-After header (validated and clamped)
   */
  async handle429(retryAfterSeconds: number): Promise<void> {
    if (this.rateLimitConfig?.enabled !== true) {
      return;
    }

    // If already backing off from transient errors, ignore 429
    const currentState = await this.store.getState();
    if (currentState.state === 'BACKING_OFF') {
      this.logger?.info(
        'Ignoring 429 while already backing off (will respect existing backoff)'
      );
      return;
    }

    // Validate and clamp input
    if (retryAfterSeconds < 0) {
      this.logger?.warn(
        `Invalid retryAfterSeconds ${retryAfterSeconds}, using 0`
      );
      retryAfterSeconds = 0;
    }
    if (retryAfterSeconds > this.rateLimitConfig.maxRetryInterval) {
      this.logger?.warn(
        `retryAfterSeconds ${retryAfterSeconds}s exceeds maxRetryInterval, clamping to ${this.rateLimitConfig.maxRetryInterval}s`
      );
      retryAfterSeconds = this.rateLimitConfig.maxRetryInterval;
    }

    const now = Date.now();
    const waitUntilTime = now + retryAfterSeconds * 1000;

    await this.handleError(
      'RATE_LIMITED',
      waitUntilTime,
      this.rateLimitConfig.maxRetryCount,
      this.rateLimitConfig.maxRateLimitDuration,
      now
    );
  }

  /**
   * Handle a transient error (5xx, network failure).
   * Uses exponential backoff to calculate wait time.
   */
  async handleTransientError(): Promise<void> {
    if (this.backoffConfig?.enabled !== true) {
      return;
    }

    const now = Date.now();
    const state = await this.store.getState();

    // Calculate exponential backoff
    const backoffSeconds = this.calculateBackoff(state.retryCount);
    const waitUntilTime = now + backoffSeconds * 1000;

    await this.handleError(
      'BACKING_OFF',
      waitUntilTime,
      this.backoffConfig.maxRetryCount,
      this.backoffConfig.maxTotalBackoffDuration,
      now
    );
  }

  /**
   * Set a callback to be invoked when the retry wait period expires.
   * Used to trigger an automatic flush when transitioning back to READY.
   */
  setAutoFlushCallback(callback: () => void): void {
    this.autoFlushCallback = callback;
  }

  /**
   * Reset the state machine to READY with retry count 0.
   * Called on successful upload (2xx response).
   */
  async reset(): Promise<void> {
    this.clearAutoFlushTimer();
    await this.store.dispatch(() => INITIAL_STATE);
  }

  /**
   * Clean up timers. Call when the plugin is being destroyed.
   */
  destroy(): void {
    this.clearAutoFlushTimer();
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
   * Core error handling logic - atomic dispatch for thread safety
   */
  private async handleError(
    newState: 'RATE_LIMITED' | 'BACKING_OFF',
    waitUntilTime: number,
    maxRetryCount: number,
    maxRetryDuration: number,
    now: number
  ): Promise<void> {
    // Atomic dispatch prevents async interleaving when multiple batches fail
    await this.store.dispatch((state: RetryStateData) => {
      const newRetryCount = state.retryCount + 1;
      const firstFailureTime = state.firstFailureTime ?? now;
      const totalDuration = (now - firstFailureTime) / 1000;

      // Max retry count check
      if (newRetryCount > maxRetryCount) {
        this.logger?.warn(
          `Max retry count exceeded (${maxRetryCount}), resetting retry manager`
        );
        return INITIAL_STATE;
      }

      // Max duration check
      if (totalDuration > maxRetryDuration) {
        this.logger?.warn(
          `Max retry duration exceeded (${maxRetryDuration}s), resetting retry manager`
        );
        return INITIAL_STATE;
      }

      // Consolidate wait times when already blocked
      const finalWaitUntilTime =
        state.state !== 'READY'
          ? this.applyRetryStrategy(state.waitUntilTime, waitUntilTime)
          : waitUntilTime;

      const stateType =
        newState === 'RATE_LIMITED' ? 'Rate limited (429)' : 'Transient error';
      this.logger?.info(
        `${stateType}: waiting ${Math.ceil(
          (finalWaitUntilTime - now) / 1000
        )}s before retry ${newRetryCount}`
      );

      return {
        state: newState,
        waitUntilTime: finalWaitUntilTime,
        retryCount: newRetryCount,
        firstFailureTime,
      };
    });

    // Schedule auto-flush after state update
    await this.scheduleAutoFlush();
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(retryCount: number): number {
    if (!this.backoffConfig) {
      return 0;
    }

    const { baseBackoffInterval, maxBackoffInterval, jitterPercent } =
      this.backoffConfig;

    // Base exponential backoff: base * 2^retryCount
    const exponentialBackoff = baseBackoffInterval * Math.pow(2, retryCount);

    // Clamp to max
    const clampedBackoff = Math.min(exponentialBackoff, maxBackoffInterval);

    // Add jitter: ±jitterPercent
    const jitterRange = clampedBackoff * (jitterPercent / 100);
    const jitter = (Math.random() * 2 - 1) * jitterRange;

    return Math.max(0, clampedBackoff + jitter);
  }

  /**
   * Consolidate two wait-until times based on retry strategy.
   * - 'lazy': take the longer wait (most conservative, default)
   * - 'eager': take the shorter wait (retry sooner)
   */
  private applyRetryStrategy(existing: number, incoming: number): number {
    return this.retryStrategy === 'eager'
      ? Math.min(existing, incoming)
      : Math.max(existing, incoming);
  }

  /**
   * Schedule auto-flush callback to fire when the wait period expires.
   * Replaces any existing timer (e.g., when a longer wait supersedes a shorter one).
   */
  private async scheduleAutoFlush(): Promise<void> {
    if (!this.autoFlushCallback) {
      return;
    }

    this.clearAutoFlushTimer();

    const state = await this.store.getState();
    if (state.state === 'READY') {
      return;
    }

    const delay = Math.max(0, state.waitUntilTime - Date.now());
    this.logger?.info(`Auto-flush scheduled in ${Math.ceil(delay / 1000)}s`);

    this.autoFlushTimer = setTimeout(() => {
      this.logger?.info('Auto-flush timer fired, triggering flush');
      this.autoFlushCallback?.();
    }, delay);
  }

  private clearAutoFlushTimer(): void {
    if (this.autoFlushTimer !== undefined) {
      clearTimeout(this.autoFlushTimer);
      this.autoFlushTimer = undefined;
    }
  }

  private async transitionToReady(): Promise<void> {
    const state = await this.store.getState();
    const stateType = state.state === 'RATE_LIMITED' ? 'Rate limit' : 'Backoff';
    this.logger?.info(`${stateType} period expired, resuming uploads`);

    await this.store.dispatch((state: RetryStateData) => ({
      ...state,
      state: 'READY' as const,
    }));
  }
}
