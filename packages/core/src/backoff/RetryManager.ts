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

const VALID_STATES = new Set(['READY', 'RATE_LIMITED', 'BACKING_OFF']);

export type RetryResult = 'rate_limited' | 'backed_off' | 'limit_exceeded';

/**
 * Manages retry state for rate limiting (429) and transient errors (5xx).
 *
 * State machine: READY → RATE_LIMITED (429) or BACKING_OFF (5xx) → READY
 * - READY: uploads proceed normally
 * - RATE_LIMITED: server returned 429; uploads blocked until Retry-After expires
 * - BACKING_OFF: transient error; exponential backoff until wait expires
 *
 * Designed for concurrent batch uploads (Promise.all). Multiple batches can
 * fail simultaneously with different errors or partially succeed. The retry
 * strategy (eager/lazy) controls how concurrent wait times are consolidated.
 *
 * Uses a global retry counter since batches are re-chunked from the event
 * queue on each flush and have no stable identities.
 */
export class RetryManager {
  private store: Store<RetryStateData>;
  private rateLimitConfig?: RateLimitConfig;
  private backoffConfig?: BackoffConfig;
  private logger?: LoggerType;
  private retryStrategy: 'eager' | 'lazy';
  private autoFlushCallback?: () => void;
  private autoFlushTimer?: ReturnType<typeof setTimeout>;

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
   * Check if uploads can proceed. Transitions to READY if wait time has passed.
   * Validates persisted state to handle clock changes or corruption.
   */
  async canRetry(): Promise<boolean> {
    const state = await this.store.getState(true);
    const now = Date.now();

    if (state.state === 'READY') {
      return true;
    }

    if (!this.isPersistedStateValid(state, now)) {
      this.logger?.warn(
        'Persisted retry state failed validation, resetting to READY'
      );
      await this.reset();
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
   * Returns 'limit_exceeded' if retry limits are hit, otherwise 'rate_limited'.
   */
  async handle429(retryAfterSeconds: number): Promise<RetryResult | undefined> {
    if (this.rateLimitConfig?.enabled !== true) {
      return undefined;
    }

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

    return this.handleError(
      'RATE_LIMITED',
      (_state) => waitUntilTime,
      this.rateLimitConfig.maxRetryCount,
      this.rateLimitConfig.maxRateLimitDuration,
      now
    );
  }

  /**
   * Handle a transient error (5xx, network failure).
   * Uses exponential backoff to calculate wait time.
   * Returns 'limit_exceeded' if retry limits are hit, otherwise 'backed_off'.
   */
  async handleTransientError(): Promise<RetryResult | undefined> {
    if (this.backoffConfig?.enabled !== true) {
      return undefined;
    }

    const now = Date.now();
    // Pre-compute random value outside the dispatch reducer for purity
    const random = Math.random();

    return this.handleError(
      'BACKING_OFF',
      (state) => {
        const backoffSeconds = this.calculateBackoff(state.retryCount, random);
        return now + backoffSeconds * 1000;
      },
      this.backoffConfig.maxRetryCount,
      this.backoffConfig.maxTotalBackoffDuration,
      now
    );
  }

  /** Set a callback to invoke when the wait period expires (auto-flush). */
  setAutoFlushCallback(callback: () => void): void {
    this.autoFlushCallback = callback;
  }

  /** Reset the state machine to READY with retry count 0. */
  async reset(): Promise<void> {
    this.clearAutoFlushTimer();
    await this.store.dispatch(() => INITIAL_STATE);
  }

  /** Clean up timers. */
  destroy(): void {
    this.clearAutoFlushTimer();
  }

  /** Get the current retry count (used for X-Retry-Count header). */
  async getRetryCount(): Promise<number> {
    const state = await this.store.getState(true);
    return state.retryCount;
  }

  /**
   * Unified error handler for both 429 and transient errors.
   * Dispatches atomically to handle concurrent batch failures.
   *
   * @param newState - The target state (RATE_LIMITED or BACKING_OFF)
   * @param computeWaitUntilTime - Function to compute wait time from current state.
   *   For 429: returns server-specified Retry-After time (ignores state).
   *   For transient: computes exponential backoff from state.retryCount.
   * @param maxRetryCount - Maximum allowed retry count before reset
   * @param maxRetryDuration - Maximum allowed total retry duration (seconds)
   * @param now - Current timestamp
   */
  private async handleError(
    newState: 'RATE_LIMITED' | 'BACKING_OFF',
    computeWaitUntilTime: (state: RetryStateData) => number,
    maxRetryCount: number,
    maxRetryDuration: number,
    now: number
  ): Promise<RetryResult> {
    let limitExceeded = false;

    const newStateData = await this.store.dispatch(
      (state: RetryStateData): RetryStateData => {
        const newRetryCount = state.retryCount + 1;
        const firstFailureTime = state.firstFailureTime ?? now;
        const totalDuration = (now - firstFailureTime) / 1000;

        if (newRetryCount > maxRetryCount || totalDuration > maxRetryDuration) {
          limitExceeded = true;
          return INITIAL_STATE;
        }

        const waitUntilTime = computeWaitUntilTime(state);

        // RATE_LIMITED takes precedence over BACKING_OFF
        const resolvedState =
          state.state === 'RATE_LIMITED' && newState === 'BACKING_OFF'
            ? 'RATE_LIMITED'
            : newState;

        // Consolidate wait times when already blocked.
        // 429 Retry-After is authoritative when overriding a transient backoff —
        // the server is giving an explicit timing signal that supersedes our
        // calculated backoff. For same-state consolidation (e.g. two 429s),
        // apply the retry strategy (lazy=max, eager=min).
        let finalWaitUntilTime: number;
        if (state.state === 'READY') {
          finalWaitUntilTime = waitUntilTime;
        } else if (
          newState === 'RATE_LIMITED' &&
          state.state === 'BACKING_OFF'
        ) {
          finalWaitUntilTime = waitUntilTime;
        } else {
          finalWaitUntilTime = this.applyRetryStrategy(
            state.waitUntilTime,
            waitUntilTime
          );
        }

        return {
          state: resolvedState,
          waitUntilTime: finalWaitUntilTime,
          retryCount: newRetryCount,
          firstFailureTime,
        };
      }
    );

    // Log after dispatch (side-effect-free reducer)
    if (limitExceeded) {
      this.logger?.warn(
        `Max retry limit exceeded (count: ${maxRetryCount}, duration: ${maxRetryDuration}s), resetting retry manager`
      );
      return 'limit_exceeded';
    }

    const stateType =
      newStateData.state === 'RATE_LIMITED'
        ? 'Rate limited (429)'
        : 'Transient error';
    this.logger?.info(
      `${stateType}: waiting ${Math.ceil(
        (newStateData.waitUntilTime - now) / 1000
      )}s before retry ${newStateData.retryCount}`
    );

    await this.scheduleAutoFlush();

    return newState === 'RATE_LIMITED' ? 'rate_limited' : 'backed_off';
  }

  private calculateBackoff(retryCount: number, random: number): number {
    if (!this.backoffConfig) {
      return 0;
    }

    const { baseBackoffInterval, maxBackoffInterval, jitterPercent } =
      this.backoffConfig;

    // Uses pre-increment retryCount (0-based): first retry gets 2^0 = 1x base,
    // matching the SDD worked example: 0.5s, 1s, 2s, 4s, ...
    const exponentialBackoff = baseBackoffInterval * Math.pow(2, retryCount);
    const clampedBackoff = Math.min(exponentialBackoff, maxBackoffInterval);

    // Additive-only jitter: adds 0 to jitterPercent of the backoff
    const jitterRange = clampedBackoff * (jitterPercent / 100);
    const jitter = random * jitterRange;

    return clampedBackoff + jitter;
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
   * Schedule auto-flush callback for when the wait period expires.
   * Replaces any existing timer when a new wait supersedes the previous one.
   */
  private async scheduleAutoFlush(): Promise<void> {
    if (!this.autoFlushCallback) {
      return;
    }

    this.clearAutoFlushTimer();

    const state = await this.store.getState(true);
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
    this.clearAutoFlushTimer();
    const state = await this.store.getState(true);
    const stateType = state.state === 'RATE_LIMITED' ? 'Rate limit' : 'Backoff';
    this.logger?.info(`${stateType} period expired, resuming uploads`);

    await this.store.dispatch((state: RetryStateData) => ({
      ...state,
      state: 'READY' as const,
    }));
  }

  /**
   * Validate persisted state loaded from storage on app restart.
   * Detects clock changes, corruption, or impossibly stale data.
   */
  private isPersistedStateValid(state: RetryStateData, now: number): boolean {
    // State string must be a valid value
    if (!VALID_STATES.has(state.state)) {
      this.logger?.warn(`Invalid persisted state: ${state.state}`);
      return false;
    }

    // firstFailureTime must be in the past
    if (state.firstFailureTime !== null && state.firstFailureTime > now) {
      this.logger?.warn(
        `firstFailureTime ${state.firstFailureTime} is in the future`
      );
      return false;
    }

    // waitUntilTime must not be impossibly far in the future
    const maxWaitMs =
      state.state === 'RATE_LIMITED'
        ? (this.rateLimitConfig?.maxRetryInterval ?? 300) * 1000
        : (this.backoffConfig?.maxBackoffInterval ?? 300) * 1000;

    // Allow up to maxWait + 10% jitter headroom
    const maxReasonableWait = now + maxWaitMs * 1.1;
    if (state.waitUntilTime > maxReasonableWait) {
      this.logger?.warn(
        `waitUntilTime is unreasonably far in the future ` +
          `(${Math.ceil((state.waitUntilTime - now) / 1000)}s from now, ` +
          `max expected ~${Math.ceil(maxWaitMs / 1000)}s)`
      );
      return false;
    }

    // retryCount must be non-negative
    if (state.retryCount < 0) {
      this.logger?.warn(`retryCount is negative: ${state.retryCount}`);
      return false;
    }

    return true;
  }
}
