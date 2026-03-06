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
      this.logger?.error(
        `[UploadStateMachine] Persistence failed, using in-memory store: ${e}`
      );

      try {
        this.store = createStore<UploadStateData>(INITIAL_STATE);
      } catch (fallbackError) {
        this.logger?.error(
          `[UploadStateMachine] CRITICAL: In-memory store creation failed: ${fallbackError}`
        );
        throw fallbackError;
      }
    }
  }

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

  async handle429(retryAfterSeconds: number): Promise<void> {
    if (!this.config.enabled) {
      return;
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

  async reset(): Promise<void> {
    await this.store.dispatch(() => INITIAL_STATE);
  }

  async getGlobalRetryCount(): Promise<number> {
    const state = await this.store.getState();
    return state.globalRetryCount;
  }

  private async transitionToReady(): Promise<void> {
    await this.store.dispatch((state: UploadStateData) => ({
      ...state,
      state: 'READY' as const,
    }));
  }
}
