import { createStore } from '@segment/sovran-react-native';
import type { Store, Persistor } from '@segment/sovran-react-native';
import type { UploadStateData, RateLimitConfig, LoggerType } from '../types';

const INITIAL_STATE: UploadStateData = {
  state: 'READY',
  waitUntilTime: 0,
  globalRetryCount: 0,
  firstFailureTime: null,
};

export class UploadStateMachine {
  private store: Store<UploadStateData>;
  private config: RateLimitConfig;
  private logger?: LoggerType;

  constructor(
    storeId: string,
    persistor: Persistor | undefined,
    config: RateLimitConfig,
    logger?: LoggerType
  ) {
    this.config = config;
    this.logger = logger;

    // If persistor is provided, use persistent store; otherwise use in-memory store
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
  }

  /**
   * Upload gate: checks if uploads are allowed
   * Returns true if READY or if waitUntilTime has passed
   */
  async canUpload(): Promise<boolean> {
    console.log(`[UploadStateMachine.canUpload] config.enabled=${this.config.enabled}`);
    if (!this.config.enabled) {
      console.log('[UploadStateMachine.canUpload] Rate limiting disabled - allowing upload');
      return true; // Legacy behavior when disabled
    }

    const state = await this.store.getState();
    const now = Date.now();
    console.log(`[UploadStateMachine.canUpload] state=${state.state}, waitUntilTime=${state.waitUntilTime}, now=${now}, diff=${state.waitUntilTime - now}ms`);

    if (state.state === 'READY') {
      console.log('[UploadStateMachine.canUpload] State is READY - allowing upload');
      return true;
    }

    // Check if wait period has elapsed
    if (now >= state.waitUntilTime) {
      console.log('[UploadStateMachine.canUpload] Wait period elapsed - transitioning to READY');
      await this.transitionToReady();
      return true;
    }

    const waitSeconds = Math.ceil((state.waitUntilTime - now) / 1000);
    console.log(`[UploadStateMachine.canUpload] ❌ Upload blocked - ${waitSeconds}s remaining`);
    this.logger?.info(
      `Upload blocked: rate limited, retry in ${waitSeconds}s (retry ${state.globalRetryCount}/${this.config.maxRetryCount})`
    );
    return false;
  }

  /**
   * Handles 429 rate limiting response
   */
  async handle429(retryAfterSeconds: number): Promise<void> {
    console.log(`[UploadStateMachine.handle429] Called with retryAfterSeconds=${retryAfterSeconds}, config.enabled=${this.config.enabled}`);
    if (!this.config.enabled) {
      console.log('[UploadStateMachine.handle429] Rate limiting disabled - skipping');
      return; // No-op when disabled
    }

    const now = Date.now();
    const state = await this.store.getState();
    console.log(`[UploadStateMachine.handle429] Current state: ${state.state}, retryCount=${state.globalRetryCount}`);

    const newRetryCount = state.globalRetryCount + 1;
    const firstFailureTime = state.firstFailureTime ?? now;
    const totalBackoffDuration = (now - firstFailureTime) / 1000;

    // Check max retry count
    if (newRetryCount > this.config.maxRetryCount) {
      console.log(`[UploadStateMachine.handle429] Max retry count exceeded - resetting`);
      this.logger?.warn(
        `Max retry count exceeded (${this.config.maxRetryCount}), resetting rate limiter`
      );
      await this.reset();
      return;
    }

    // Check max total backoff duration
    if (totalBackoffDuration > this.config.maxTotalBackoffDuration) {
      console.log(`[UploadStateMachine.handle429] Max backoff duration exceeded - resetting`);
      this.logger?.warn(
        `Max backoff duration exceeded (${this.config.maxTotalBackoffDuration}s), resetting rate limiter`
      );
      await this.reset();
      return;
    }

    const waitUntilTime = now + retryAfterSeconds * 1000;
    console.log(`[UploadStateMachine.handle429] Setting state to WAITING until ${waitUntilTime} (${retryAfterSeconds}s from now)`);

    await this.store.dispatch(() => ({
      state: 'WAITING' as const,
      waitUntilTime,
      globalRetryCount: newRetryCount,
      firstFailureTime,
    }));

    console.log(`[UploadStateMachine.handle429] State updated successfully`);
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
