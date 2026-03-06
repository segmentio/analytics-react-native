import { createStore } from '@segment/sovran-react-native';
import type { Store, Persistor } from '@segment/sovran-react-native';
import type { UploadStateData, RateLimitConfig, LoggerType } from '../types';

const INITIAL_STATE: UploadStateData = {
  state: 'READY',
  waitUntilTime: 0,
  globalRetryCount: 0,
  firstFailureTime: null,
};

/**
 * State machine managing global rate limiting for 429 responses per the TAPI SDD.
 * Implements READY/RATE_LIMITED states with persistence across app restarts.
 */
export class UploadStateMachine {
  private store: Store<UploadStateData>;
  private config: RateLimitConfig;
  private logger?: LoggerType;

  /**
   * Creates an UploadStateMachine instance.
   *
   * @param storeId - Unique identifier for the store (typically writeKey)
   * @param persistor - Optional persistor for state persistence
   * @param config - Rate limit configuration from Settings object
   * @param logger - Optional logger for debugging
   */
  constructor(
    storeId: string,
    persistor: Persistor | undefined,
    config: RateLimitConfig,
    logger?: LoggerType
  ) {
    this.config = config;
    this.logger = logger;

    try {
      this.store = createStore<UploadStateData>(
        INITIAL_STATE,
        persistor
          ? {
              persist: {
                storeId: `${storeId}-uploadState`,
                persistor,
              },
            }
          : undefined
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger?.error(
        `[UploadStateMachine] Persistence failed, using in-memory store: ${errorMessage}`
      );

      try {
        this.store = createStore<UploadStateData>(INITIAL_STATE);
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
        this.logger?.error(
          `[UploadStateMachine] CRITICAL: In-memory store creation failed: ${fallbackMessage}`
        );
        throw fallbackError;
      }
    }
  }

  /**
   * Check if uploads can proceed based on rate limit state.
   * Automatically transitions from RATE_LIMITED to READY when wait time has passed.
   *
   * @returns true if uploads should proceed, false if rate limited
   */
  async canUpload(): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

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
    this.logger?.info(
      `Upload blocked: rate limited, retry in ${waitSeconds}s (retry ${state.globalRetryCount}/${this.config.maxRetryCount})`
    );
    return false;
  }

  /**
   * Handle a 429 rate limit response by setting RATE_LIMITED state.
   * Increments global retry count and enforces max retry/duration limits.
   *
   * @param retryAfterSeconds - Delay in seconds from Retry-After header (validated and clamped)
   */
  async handle429(retryAfterSeconds: number): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Validate and clamp input
    if (retryAfterSeconds < 0) {
      this.logger?.warn(
        `Invalid retryAfterSeconds ${retryAfterSeconds}, using 0`
      );
      retryAfterSeconds = 0;
    }
    if (retryAfterSeconds > this.config.maxRetryInterval) {
      this.logger?.warn(
        `retryAfterSeconds ${retryAfterSeconds}s exceeds maxRetryInterval, clamping to ${this.config.maxRetryInterval}s`
      );
      retryAfterSeconds = this.config.maxRetryInterval;
    }

    const now = Date.now();
    const state = await this.store.getState();

    const newRetryCount = state.globalRetryCount + 1;
    const firstFailureTime = state.firstFailureTime ?? now;
    const totalBackoffDuration = (now - firstFailureTime) / 1000;

    if (newRetryCount > this.config.maxRetryCount) {
      this.logger?.warn(
        `Max retry count exceeded (${this.config.maxRetryCount}), resetting rate limiter`
      );
      await this.reset();
      return;
    }

    if (totalBackoffDuration > this.config.maxRateLimitDuration) {
      this.logger?.warn(
        `Max backoff duration exceeded (${this.config.maxRateLimitDuration}s), resetting rate limiter`
      );
      await this.reset();
      return;
    }

    const waitUntilTime = now + retryAfterSeconds * 1000;

    await this.store.dispatch(() => ({
      state: 'RATE_LIMITED' as const,
      waitUntilTime,
      globalRetryCount: newRetryCount,
      firstFailureTime,
    }));

    this.logger?.info(
      `Rate limited (429): waiting ${retryAfterSeconds}s before retry ${newRetryCount}/${this.config.maxRetryCount}`
    );
  }

  /**
   * Reset the state machine to READY with retry count 0.
   * Called on successful upload (2xx response).
   */
  async reset(): Promise<void> {
    await this.store.dispatch(() => INITIAL_STATE);
  }

  /**
   * Get the current global retry count for X-Retry-Count header.
   *
   * @returns Current global retry count
   */
  async getGlobalRetryCount(): Promise<number> {
    const state = await this.store.getState();
    return state.globalRetryCount;
  }

  private async transitionToReady(): Promise<void> {
    this.logger?.info('Rate limit period expired, resuming uploads');
    await this.store.dispatch((state: UploadStateData) => ({
      ...state,
      state: 'READY' as const,
    }));
  }
}
