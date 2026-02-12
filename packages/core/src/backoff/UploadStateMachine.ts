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
    console.log('[UploadStateMachine] constructor called', { storeId, hasPersistor: !!persistor });
    this.config = config;
    this.logger = logger;

    // If persistor is provided, try persistent store; fall back to in-memory on error
    console.log('[UploadStateMachine] About to call createStore...');
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
      console.log('[UploadStateMachine] createStore succeeded with persistence');
      this.logger?.info('[UploadStateMachine] Store created with persistence');
    } catch (e) {
      console.error('[UploadStateMachine] createStore with persistence FAILED, falling back to in-memory:', e);
      this.logger?.error(`[UploadStateMachine] Persistence failed, using in-memory store: ${e}`);

      // Fall back to in-memory store (no persistence)
      try {
        this.store = createStore<UploadStateData>(INITIAL_STATE);
        console.log('[UploadStateMachine] Fallback in-memory createStore succeeded');
        this.logger?.warn('[UploadStateMachine] Using in-memory store (no persistence)');
      } catch (fallbackError) {
        console.error('[UploadStateMachine] Even fallback createStore FAILED:', fallbackError);
        this.logger?.error(`[UploadStateMachine] CRITICAL: In-memory store creation failed: ${fallbackError}`);
        throw fallbackError;
      }
    }
  }

  /**
   * Upload gate: checks if uploads are allowed
   * Returns true if READY or if waitUntilTime has passed
   */
  async canUpload(): Promise<boolean> {
    if (!this.config.enabled) {
      this.logger?.info('[canUpload] Rate limiting disabled, allowing upload');
      return true; // Legacy behavior when disabled
    }

    const state = await this.store.getState();
    const now = Date.now();

    this.logger?.info(`[canUpload] Current state: ${state.state}, waitUntil: ${state.waitUntilTime}, now: ${now}, globalRetry: ${state.globalRetryCount}`);

    if (state.state === 'READY') {
      this.logger?.info('[canUpload] State is READY, allowing upload');
      return true;
    }

    // Check if wait period has elapsed
    if (now >= state.waitUntilTime) {
      this.logger?.info('[canUpload] Wait period elapsed, transitioning to READY');
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
      this.logger?.info('[handle429] Rate limiting disabled, skipping');
      return; // No-op when disabled
    }

    const now = Date.now();
    const state = await this.store.getState();

    this.logger?.info(`[handle429] BEFORE: state=${state.state}, waitUntil=${state.waitUntilTime}, globalRetry=${state.globalRetryCount}`);

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

    this.logger?.info(`[handle429] Setting WAITING state: waitUntil=${waitUntilTime}, newRetryCount=${newRetryCount}`);

    await this.store.dispatch(() => ({
      state: 'WAITING' as const,
      waitUntilTime,
      globalRetryCount: newRetryCount,
      firstFailureTime,
    }));

    // Verify state was set
    const newState = await this.store.getState();
    this.logger?.info(`[handle429] AFTER: state=${newState.state}, waitUntil=${newState.waitUntilTime}, globalRetry=${newState.globalRetryCount}`);

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
