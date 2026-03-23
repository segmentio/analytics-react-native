import { createStore } from '@segment/sovran-react-native';
import type { Store, Persistor } from '@segment/sovran-react-native';
import type { LoggerType, RateLimitConfig, BackoffConfig } from '../types';

export enum RetryState {
  READY = 'READY',
  RATE_LIMITED = 'RATE_LIMITED',
  BACKING_OFF = 'BACKING_OFF',
}

export enum RetryResult {
  RATE_LIMITED = 'rate_limited',
  BACKED_OFF = 'backed_off',
  LIMIT_EXCEEDED = 'limit_exceeded',
}

type RetryStateData = {
  state: RetryState;
  waitUntilTime: number;
  retryCount: number;
  firstFailureTime: number | null;
};

const INITIAL_STATE: RetryStateData = {
  state: RetryState.READY,
  waitUntilTime: 0,
  retryCount: 0,
  firstFailureTime: null,
};

/**
 * Manages retry state for rate limiting (429) and transient errors (5xx).
 *
 * State machine: READY → RATE_LIMITED (429) or BACKING_OFF (5xx) → READY
 * - READY: uploads proceed normally
 * - RATE_LIMITED: server returned 429; uploads blocked until Retry-After expires
 * - BACKING_OFF: transient error; exponential backoff until wait expires
 *
 * Designed for concurrent batch uploads (Promise.all). Multiple batches can
 * fail simultaneously with different errors or partially succeed. When
 * consolidating concurrent wait times, takes the shorter wait (eager retry).
 *
 * Uses a global retry counter since batches are re-chunked from the event
 * queue on each flush and have no stable identities.
 */
export class RetryManager {
  private store: Store<RetryStateData>;
  private rateLimitConfig?: RateLimitConfig;
  private backoffConfig?: BackoffConfig;
  private logger?: LoggerType;

  constructor(
    storeId: string,
    persistor: Persistor | undefined,
    rateLimitConfig?: RateLimitConfig,
    backoffConfig?: BackoffConfig,
    logger?: LoggerType
  ) {
    this.rateLimitConfig = rateLimitConfig;
    this.backoffConfig = backoffConfig;
    this.logger = logger;
    this.store = this.createStore(storeId, persistor);
  }

  /**
   * Create sovran store with persistence fallback.
   * Tries persisted store first, falls back to in-memory on failure.
   */
  private createStore(
    storeId: string,
    persistor: Persistor | undefined
  ): Store<RetryStateData> {
    // Try persisted store first
    if (persistor) {
      try {
        return createStore<RetryStateData>(INITIAL_STATE, {
          persist: {
            storeId: `${storeId}-retryState`,
            persistor,
          },
        });
      } catch (e) {
        this.logger?.error(
          `[RetryManager] Persistence failed, falling back to in-memory: ${this.getErrorMessage(
            e
          )}`
        );
      }
    }

    // Fall back to in-memory store
    try {
      return createStore<RetryStateData>(INITIAL_STATE);
    } catch (e) {
      this.logger?.error(
        `[RetryManager] CRITICAL: In-memory store creation failed: ${this.getErrorMessage(
          e
        )}`
      );
      throw e;
    }
  }

  /** Extract error message from unknown error type. */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Check if uploads can proceed. Transitions to READY if wait time has passed.
   * Validates persisted state to handle clock changes or corruption.
   */
  async canRetry(): Promise<boolean> {
    const state = await this.store.getState(true);
    const now = Date.now();

    if (state.state === RetryState.READY) {
      return true;
    }

    if (!this.isPersistedStateValid(state, now)) {
      this.logger?.warn(
        'Persisted retry state failed validation, resetting to READY'
      );
      await this.reset();
      return true;
    }

    if (!this.isPersistedStateValid(state, now)) {
      this.logger?.warn(
        'Persisted retry state failed validation, resetting to READY'
      );
      await this.reset();
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
    const stateType = this.getStateDisplayName(state.state);
    this.logger?.info(
      `Upload blocked: ${stateType}, retry in ${waitSeconds}s (retry ${state.retryCount})`
    );
    return false;
  }

  /**
   * Clamp retry-after seconds to valid range [0, maxRetryInterval].
   */
  private clampRetryAfter(
    retryAfterSeconds: number,
    maxInterval: number
  ): number {
    if (retryAfterSeconds < 0) {
      this.logger?.warn(
        `Invalid retryAfterSeconds ${retryAfterSeconds}, using 0`
      );
      return 0;
    }

    if (retryAfterSeconds > maxInterval) {
      this.logger?.warn(
        `retryAfterSeconds ${retryAfterSeconds}s exceeds maxRetryInterval, clamping to ${maxInterval}s`
      );
      return maxInterval;
    }

    return retryAfterSeconds;
  }

  /**
   * Handle a 429 rate limit response.
   * Uses server-specified wait time from Retry-After header.
   */
  async handle429(retryAfterSeconds: number): Promise<RetryResult | undefined> {
    if (this.rateLimitConfig?.enabled !== true) {
      return undefined;
    }

    retryAfterSeconds = this.clampRetryAfter(
      retryAfterSeconds,
      this.rateLimitConfig.maxRetryInterval
    );

    const now = Date.now();
    const waitUntilTime = now + retryAfterSeconds * 1000;

    return this.handleError(
      RetryState.RATE_LIMITED,
      (_state) => waitUntilTime,
      this.rateLimitConfig.maxRetryCount,
      this.rateLimitConfig.maxRateLimitDuration,
      now
    );
  }

  /**
   * Handle a transient error (5xx, network failure).
   * Uses exponential backoff to calculate wait time.
   */
  async handleTransientError(): Promise<RetryResult | undefined> {
    if (this.backoffConfig?.enabled !== true) {
      return undefined;
    }

    const now = Date.now();
    const random = Math.random();

    return this.handleError(
      RetryState.BACKING_OFF,
      (state) => {
        const backoffSeconds = this.calculateBackoff(state.retryCount, random);
        return now + backoffSeconds * 1000;
      },
      this.backoffConfig.maxRetryCount,
      this.backoffConfig.maxTotalBackoffDuration,
      now
    );
  }

  /** Reset the state machine to READY with retry count 0. */
  async reset(): Promise<void> {
    await this.store.dispatch(() => INITIAL_STATE);
  }

  /** Get the current retry count (used for X-Retry-Count header). */
  async getRetryCount(): Promise<number> {
    const state = await this.store.getState(true);
    return state.retryCount;
  }

  /**
   * Compute new retry state based on current state and error type.
   * Returns the new state and whether retry limits were exceeded.
   */
  private computeNewState(
    state: RetryStateData,
    newState: RetryState.RATE_LIMITED | RetryState.BACKING_OFF,
    computeWaitUntilTime: (state: RetryStateData) => number,
    maxRetryCount: number,
    maxRetryDuration: number,
    now: number
  ): { newState: RetryStateData; limitExceeded: boolean } {
    const newRetryCount = state.retryCount + 1;
    const firstFailureTime = state.firstFailureTime ?? now;
    const totalDuration = (now - firstFailureTime) / 1000;

    if (newRetryCount > maxRetryCount || totalDuration > maxRetryDuration) {
      return { newState: INITIAL_STATE, limitExceeded: true };
    }

    const waitUntilTime = computeWaitUntilTime(state);
    const resolvedState = this.resolveStatePrecedence(state.state, newState);
    const finalWaitUntilTime = this.consolidateWaitTime(
      state.state,
      newState,
      state.waitUntilTime,
      waitUntilTime
    );

    return {
      newState: {
        state: resolvedState,
        waitUntilTime: finalWaitUntilTime,
        retryCount: newRetryCount,
        firstFailureTime,
      },
      limitExceeded: false,
    };
  }

  /**
   * Map retry state to result enum.
   */
  private stateToResult(
    state: RetryState.RATE_LIMITED | RetryState.BACKING_OFF
  ): RetryResult {
    switch (state) {
      case RetryState.RATE_LIMITED:
        return RetryResult.RATE_LIMITED;
      case RetryState.BACKING_OFF:
        return RetryResult.BACKED_OFF;
    }
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
    newState: RetryState.RATE_LIMITED | RetryState.BACKING_OFF,
    computeWaitUntilTime: (state: RetryStateData) => number,
    maxRetryCount: number,
    maxRetryDuration: number,
    now: number
  ): Promise<RetryResult> {
    let limitExceeded = false;

    const newStateData = await this.store.dispatch(
      (state: RetryStateData): RetryStateData => {
        const result = this.computeNewState(
          state,
          newState,
          computeWaitUntilTime,
          maxRetryCount,
          maxRetryDuration,
          now
        );
        limitExceeded = result.limitExceeded;
        return result.newState;
      }
    );

    if (limitExceeded) {
      this.logger?.warn(
        `Max retry limit exceeded (count: ${maxRetryCount}, duration: ${maxRetryDuration}s), resetting retry manager`
      );
      return RetryResult.LIMIT_EXCEEDED;
    }

    const stateType = this.getStateDisplayName(newStateData.state);
    this.logger?.info(
      `${stateType}: waiting ${Math.ceil(
        (newStateData.waitUntilTime - now) / 1000
      )}s before retry ${newStateData.retryCount}`
    );

    return this.stateToResult(newState);
  }

  /**
   * Resolve state precedence when multiple errors occur concurrently.
   * Rule: 429 rate limiting takes precedence over transient backoff.
   */
  private resolveStatePrecedence(
    currentState: RetryState,
    newState: RetryState.RATE_LIMITED | RetryState.BACKING_OFF
  ): RetryState.RATE_LIMITED | RetryState.BACKING_OFF {
    // If currently rate limited and a transient error occurs, stay rate limited
    if (
      currentState === RetryState.RATE_LIMITED &&
      newState === RetryState.BACKING_OFF
    ) {
      return RetryState.RATE_LIMITED;
    }
    return newState;
  }

  /**
   * Consolidate wait times when multiple errors occur.
   * Uses eager strategy (shorter wait) except when transitioning states.
   */
  private consolidateWaitTime(
    currentState: RetryState,
    newState: RetryState.RATE_LIMITED | RetryState.BACKING_OFF,
    currentWaitUntil: number,
    newWaitUntil: number
  ): number {
    switch (currentState) {
      case RetryState.READY:
        // First error: use the new wait time
        return newWaitUntil;

      case RetryState.BACKING_OFF:
        if (newState === RetryState.RATE_LIMITED) {
          // 429 overrides backoff: use new wait time
          return newWaitUntil;
        }
        // Both backing off: take shorter wait (eager strategy)
        return Math.min(currentWaitUntil, newWaitUntil);

      case RetryState.RATE_LIMITED:
        // Both rate limited: take shorter wait (eager strategy)
        return Math.min(currentWaitUntil, newWaitUntil);
    }
  }

  /** Get display name for logging based on retry state. */
  private getStateDisplayName(state: RetryState): string {
    switch (state) {
      case RetryState.RATE_LIMITED:
        return 'Rate limited (429)';
      case RetryState.BACKING_OFF:
        return 'Transient error';
      case RetryState.READY:
        return 'Ready';
    }
  }

  private calculateBackoff(retryCount: number, random: number): number {
    if (!this.backoffConfig) {
      return 0;
    }

    const { baseBackoffInterval, maxBackoffInterval, jitterPercent } =
      this.backoffConfig;

    const exponentialBackoff = baseBackoffInterval * Math.pow(2, retryCount);
    const clampedBackoff = Math.min(exponentialBackoff, maxBackoffInterval);
    const jitterRange = clampedBackoff * (jitterPercent / 100);
    const jitter = random * jitterRange;

    return clampedBackoff + jitter;
  }

  private async transitionToReady(): Promise<void> {
    const state = await this.store.getState(true);
    const stateType =
      state.state === RetryState.RATE_LIMITED ? 'Rate limit' : 'Backoff';
    this.logger?.info(`${stateType} period expired, resuming uploads`);

    await this.store.dispatch((s: RetryStateData) => ({
      ...s,
      state: RetryState.READY,
    }));
  }

  /** Check if state enum is valid. */
  private isValidStateEnum(state: RetryState): boolean {
    return Object.values(RetryState).includes(state);
  }

  /** Check if firstFailureTime is in the past or null. */
  private isValidFirstFailureTime(
    firstFailureTime: number | null,
    now: number
  ): boolean {
    return firstFailureTime === null || firstFailureTime <= now;
  }

  /** Check if waitUntilTime is within reasonable bounds. */
  private isValidWaitUntilTime(state: RetryStateData, now: number): boolean {
    const maxWaitMs =
      state.state === RetryState.RATE_LIMITED
        ? (this.rateLimitConfig?.maxRetryInterval ?? 300) * 1000
        : (this.backoffConfig?.maxBackoffInterval ?? 300) * 1000;

    // Allow up to maxWait + 10% jitter headroom
    const maxReasonableWait = now + maxWaitMs * 1.1;
    return state.waitUntilTime <= maxReasonableWait;
  }

  /** Check if retryCount is non-negative. */
  private isValidRetryCount(retryCount: number): boolean {
    return retryCount >= 0;
  }

  /**
   * Validate persisted state loaded from storage on app restart.
   * Detects clock changes, corruption, or impossibly stale data.
   */
  private isPersistedStateValid(state: RetryStateData, now: number): boolean {
    if (!this.isValidStateEnum(state.state)) {
      this.logger?.warn(`Invalid persisted state: ${state.state}`);
      return false;
    }

    if (!this.isValidFirstFailureTime(state.firstFailureTime, now)) {
      this.logger?.warn(
        `firstFailureTime ${state.firstFailureTime} is in the future`
      );
      return false;
    }

    if (!this.isValidWaitUntilTime(state, now)) {
      const maxWaitMs =
        state.state === RetryState.RATE_LIMITED
          ? (this.rateLimitConfig?.maxRetryInterval ?? 300) * 1000
          : (this.backoffConfig?.maxBackoffInterval ?? 300) * 1000;
      this.logger?.warn(
        'waitUntilTime is unreasonably far in the future ' +
          `(${Math.ceil((state.waitUntilTime - now) / 1000)}s from now, ` +
          `max expected ~${Math.ceil(maxWaitMs / 1000)}s)`
      );
      return false;
    }

    if (!this.isValidRetryCount(state.retryCount)) {
      this.logger?.warn(`retryCount is negative: ${state.retryCount}`);
      return false;
    }

    return true;
  }
}
