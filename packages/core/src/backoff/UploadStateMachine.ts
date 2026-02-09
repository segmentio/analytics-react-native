import { createStore } from '@segment/sovran-react-native';
import type { Persistor } from '@segment/sovran-react-native';
import type { UploadStateData, RateLimitConfig, LoggerType } from '../types';

const INITIAL_STATE: UploadStateData = {
  state: 'READY',
  waitUntilTime: 0,
  globalRetryCount: 0,
  firstFailureTime: null,
};

export class UploadStateMachine {
  private store: any;
  private config: RateLimitConfig;
  private logger?: LoggerType;

  constructor(
    storeId: string,
    persistor: Persistor,
    config: RateLimitConfig,
    logger?: LoggerType
  ) {
    this.config = config;
    this.logger = logger;

    this.store = createStore<UploadStateData>(INITIAL_STATE, {
      persist: {
        storeId: `${storeId}-uploadState`,
        persistor,
      },
    });
  }

  /**
   * Upload gate: checks if uploads are allowed
   * Returns true if READY or if waitUntilTime has passed
   */
  async canUpload(): Promise<boolean> {
    if (!this.config.enabled) {
      return true; // Legacy behavior when disabled
    }

    const state = await this.store.getState();
    const now = Date.now();

    if (state.state === 'READY') {
      return true;
    }

    // Check if wait period has elapsed
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
   * Handles 429 rate limiting response
   */
  async handle429(retryAfterSeconds: number): Promise<void> {
    if (!this.config.enabled) {
      return; // No-op when disabled
    }

    const now = Date.now();
    const state = await this.store.getState();

    const newRetryCount = state.globalRetryCount + 1;
    const firstFailureTime = state.firstFailureTime ?? now;
    const totalBackoffDuration = (now - firstFailureTime) / 1000;

    // Check max retry count
    if (newRetryCount > this.config.maxRetryCount) {
      this.logger?.warn(
        `Max retry count exceeded (${this.config.maxRetryCount}), resetting rate limiter`
      );
      await this.reset();
      return;
    }

    // Check max total backoff duration
    if (totalBackoffDuration > this.config.maxTotalBackoffDuration) {
      this.logger?.warn(
        `Max backoff duration exceeded (${this.config.maxTotalBackoffDuration}s), resetting rate limiter`
      );
      await this.reset();
      return;
    }

    const waitUntilTime = now + retryAfterSeconds * 1000;

    await this.store.dispatch(() => ({
      state: 'WAITING' as const,
      waitUntilTime,
      globalRetryCount: newRetryCount,
      firstFailureTime,
    }));

    this.logger?.info(
      `Rate limited (429): waiting ${retryAfterSeconds}s before retry ${newRetryCount}/${this.config.maxRetryCount}`
    );
  }

  /**
   * Resets state to READY on successful upload
   */
  async reset(): Promise<void> {
    await this.store.dispatch(() => INITIAL_STATE);
    this.logger?.info('Upload state reset to READY');
  }

  /**
   * Gets current global retry count
   */
  async getGlobalRetryCount(): Promise<number> {
    const state = await this.store.getState();
    return state.globalRetryCount;
  }

  private async transitionToReady(): Promise<void> {
    await this.store.dispatch((state: UploadStateData) => ({
      ...state,
      state: 'READY' as const,
    }));
    this.logger?.info('Upload state transitioned to READY');
  }
}
