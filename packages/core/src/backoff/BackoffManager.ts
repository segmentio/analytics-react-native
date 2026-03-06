import { createStore } from '@segment/sovran-react-native';
import type { Store, Persistor } from '@segment/sovran-react-native';
import type { BackoffStateData, BackoffConfig, LoggerType } from '../types';

const INITIAL_STATE: BackoffStateData = {
  state: 'READY',
  retryCount: 0,
  nextRetryTime: 0,
  firstFailureTime: 0,
};

export class BackoffManager {
  private store: Store<BackoffStateData>;
  private config: BackoffConfig;
  private logger?: LoggerType;

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
      this.logger?.error(
        `[BackoffManager] Persistence failed, using in-memory store: ${e}`
      );

      try {
        this.store = createStore<BackoffStateData>(INITIAL_STATE);
      } catch (fallbackError) {
        this.logger?.error(
          `[BackoffManager] CRITICAL: In-memory store creation failed: ${fallbackError}`
        );
        throw fallbackError;
      }
    }
  }

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

  async handleTransientError(statusCode: number): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();
    const state = await this.store.getState();

    const newRetryCount = state.retryCount + 1;
    const firstFailureTime =
      state.firstFailureTime > 0 ? state.firstFailureTime : now;
    const totalDuration = (now - firstFailureTime) / 1000;

    if (newRetryCount > this.config.maxRetryCount) {
      this.logger?.warn(
        `Max retry count exceeded (${this.config.maxRetryCount}), resetting backoff`
      );
      await this.reset();
      return;
    }

    if (totalDuration > this.config.maxTotalBackoffDuration) {
      this.logger?.warn(
        `Max backoff duration exceeded (${this.config.maxTotalBackoffDuration}s), resetting backoff`
      );
      await this.reset();
      return;
    }

    const backoffSeconds = this.calculateBackoff(newRetryCount);
    const nextRetryTime = now + backoffSeconds * 1000;

    await this.store.dispatch(() => ({
      state: 'BACKING_OFF' as const,
      retryCount: newRetryCount,
      nextRetryTime,
      firstFailureTime,
    }));

    this.logger?.info(
      `Transient error (${statusCode}): backoff ${backoffSeconds.toFixed(1)}s, attempt ${newRetryCount}/${this.config.maxRetryCount}`
    );
  }

  async reset(): Promise<void> {
    await this.store.dispatch(() => INITIAL_STATE);
  }

  async getRetryCount(): Promise<number> {
    const state = await this.store.getState();
    return state.retryCount;
  }

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
