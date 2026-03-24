import { DestinationPlugin } from '../plugin';
import {
  BackoffConfig,
  Config,
  HttpConfig,
  PluginType,
  RateLimitConfig,
  SegmentAPIIntegration,
  SegmentAPISettings,
  SegmentEvent,
  UpdateType,
} from '../types';
import { chunk, createPromise, getURL } from '../util';
import { uploadEvents } from '../api';
import type { SegmentClient } from '../analytics';
import { DestinationMetadataEnrichment } from './DestinationMetadataEnrichment';
import { QueueFlushingPlugin } from './QueueFlushingPlugin';
import { defaultApiHost, defaultConfig } from '../constants';
import {
  SegmentError,
  ErrorType,
  translateHTTPError,
  classifyError,
  parseRetryAfter,
} from '../errors';
import { RetryManager } from '../backoff/RetryManager';
import type { RetryResult } from '../backoff';

const MAX_EVENTS_PER_BATCH = 100;
const MAX_PAYLOAD_SIZE_IN_KB = 500;
export const SEGMENT_DESTINATION_KEY = 'Segment.io';

type BatchResult = {
  batch: SegmentEvent[];
  messageIds: string[];
  status: 'success' | '429' | 'transient' | 'permanent' | 'network_error';
  statusCode?: number;
  retryAfterSeconds?: number;
};

type ErrorAggregation = {
  successfulMessageIds: string[];
  rateLimitResults: BatchResult[];
  hasTransientError: boolean;
  permanentErrorMessageIds: string[];
  retryableMessageIds: string[];
};

export class SegmentDestination extends DestinationPlugin {
  type = PluginType.destination;
  key = SEGMENT_DESTINATION_KEY;
  private apiHost?: string;
  private httpConfig?: HttpConfig;
  private settingsResolve: () => void;
  private settingsPromise: Promise<void>;
  private retryManager?: RetryManager;

  constructor() {
    super();
    // We don't timeout this promise. We strictly need the response from Segment before sending things
    const { promise, resolve } = createPromise<void>();
    this.settingsPromise = promise;
    this.settingsResolve = resolve;
  }

  private getRateLimitConfig(): RateLimitConfig | undefined {
    return this.httpConfig?.rateLimitConfig;
  }

  private getBackoffConfig(): BackoffConfig | undefined {
    return this.httpConfig?.backoffConfig;
  }

  private classifyBatchResult(
    res: Response,
    batch: SegmentEvent[],
    messageIds: string[],
    retryAfterSeconds?: number
  ): BatchResult {
    if (res.ok) {
      return { batch, messageIds, status: 'success', statusCode: res.status };
    }

    const classification = classifyError(res.status, {
      default4xxBehavior: this.getBackoffConfig()?.default4xxBehavior,
      default5xxBehavior: this.getBackoffConfig()?.default5xxBehavior,
      statusCodeOverrides: this.getBackoffConfig()?.statusCodeOverrides,
      rateLimitEnabled: this.getRateLimitConfig()?.enabled,
    });

    switch (classification.errorType) {
      case 'rate_limit':
        return {
          batch,
          messageIds,
          status: '429',
          statusCode: res.status,
          retryAfterSeconds: retryAfterSeconds ?? 60,
        };
      case 'transient':
        return {
          batch,
          messageIds,
          status: 'transient',
          statusCode: res.status,
        };
      default:
        return {
          batch,
          messageIds,
          status: 'permanent',
          statusCode: res.status,
        };
    }
  }

  private async uploadBatch(batch: SegmentEvent[]): Promise<BatchResult> {
    const config = this.analytics?.getConfig() ?? defaultConfig;
    const messageIds = batch
      .map((e) => e.messageId)
      .filter((id): id is string => id !== undefined && id !== '');

    const retryCount = this.retryManager
      ? await this.retryManager.getRetryCount()
      : 0;

    const cleanedBatch = batch.map(({ _queuedAt, ...event }) => event);

    try {
      const res = await uploadEvents({
        writeKey: config.writeKey,
        url: this.getEndpoint(),
        events: cleanedBatch as SegmentEvent[],
        retryCount,
      });

      const retryAfterSeconds =
        res.status === 429
          ? parseRetryAfter(
              res.headers.get('Retry-After'),
              this.getRateLimitConfig()?.maxRetryInterval
            )
          : undefined;

      return this.classifyBatchResult(
        res,
        batch,
        messageIds,
        retryAfterSeconds
      );
    } catch (e) {
      this.analytics?.reportInternalError(translateHTTPError(e));
      return { batch, messageIds, status: 'network_error' };
    }
  }

  private reportDroppedEvents(
    count: number,
    reason: 'max_age_exceeded' | 'permanent_error' | 'retry_limit_exceeded',
    logMessage: string
  ): void {
    this.analytics?.reportInternalError(
      new SegmentError(ErrorType.EventsDropped, logMessage, undefined, {
        droppedCount: count,
        reason,
      })
    );
    this.analytics?.logger.error(logMessage);
  }

  private aggregateErrors(results: BatchResult[]): ErrorAggregation {
    const aggregation: ErrorAggregation = {
      successfulMessageIds: [],
      rateLimitResults: [],
      hasTransientError: false,
      permanentErrorMessageIds: [],
      retryableMessageIds: [],
    };

    for (const result of results) {
      switch (result.status) {
        case 'success':
          aggregation.successfulMessageIds.push(...result.messageIds);
          break;
        case '429':
          aggregation.rateLimitResults.push(result);
          aggregation.retryableMessageIds.push(...result.messageIds);
          break;
        case 'transient':
        case 'network_error':
          aggregation.hasTransientError = true;
          aggregation.retryableMessageIds.push(...result.messageIds);
          break;
        case 'permanent':
          aggregation.permanentErrorMessageIds.push(...result.messageIds);
          break;
      }
    }

    return aggregation;
  }

  /**
   * Drop events whose _queuedAt exceeds maxTotalBackoffDuration.
   * Returns the remaining fresh events.
   */
  private async pruneExpiredEvents(
    events: SegmentEvent[]
  ): Promise<SegmentEvent[]> {
    const maxAge = this.httpConfig?.backoffConfig?.maxTotalBackoffDuration ?? 0;
    if (maxAge <= 0) {
      return events;
    }

    const now = Date.now();
    const maxAgeMs = maxAge * 1000;
    const expiredMessageIds: string[] = [];
    const freshEvents: SegmentEvent[] = [];

    for (const event of events) {
      if (event._queuedAt !== undefined && now - event._queuedAt > maxAgeMs) {
        if (event.messageId !== undefined && event.messageId !== '') {
          expiredMessageIds.push(event.messageId);
        }
      } else {
        freshEvents.push(event);
      }
    }

    if (expiredMessageIds.length > 0) {
      await this.queuePlugin.dequeueByMessageIds(expiredMessageIds);
      this.reportDroppedEvents(
        expiredMessageIds.length,
        'max_age_exceeded',
        `Dropped ${expiredMessageIds.length} events exceeding max age (${maxAge}s)`
      );
      this.analytics?.logger.warn(
        `Pruned ${expiredMessageIds.length} events older than ${maxAge}s`
      );
    }

    return freshEvents;
  }

  /**
   * Update retry state based on aggregated batch results.
   * 429 takes precedence over transient errors.
   * Returns true if retry limits were exceeded (caller should drop events).
   */
  private async updateRetryState(
    aggregation: ErrorAggregation
  ): Promise<boolean> {
    if (!this.retryManager) {
      return false;
    }

    const has429 = aggregation.rateLimitResults.length > 0;
    let result: RetryResult | undefined;

    if (has429) {
      for (const r of aggregation.rateLimitResults) {
        result = await this.retryManager.handle429(r.retryAfterSeconds ?? 60);
      }
    } else if (aggregation.hasTransientError) {
      result = await this.retryManager.handleTransientError();
    } else if (aggregation.successfulMessageIds.length > 0) {
      await this.retryManager.reset();
    }

    return result === 'limit_exceeded';
  }

  private async processUploadResults(
    events: SegmentEvent[],
    aggregation: ErrorAggregation,
    limitExceeded: boolean,
    config: Config
  ): Promise<void> {
    if (aggregation.successfulMessageIds.length > 0) {
      await this.queuePlugin.dequeueByMessageIds(
        aggregation.successfulMessageIds
      );
      if (config.debug === true) {
        this.analytics?.logger.info(
          `Sent ${aggregation.successfulMessageIds.length} events`
        );
      }
    }

    if (aggregation.permanentErrorMessageIds.length > 0) {
      await this.queuePlugin.dequeueByMessageIds(
        aggregation.permanentErrorMessageIds
      );
      this.reportDroppedEvents(
        aggregation.permanentErrorMessageIds.length,
        'permanent_error',
        `Dropped ${aggregation.permanentErrorMessageIds.length} events due to permanent errors`
      );
    }

    if (limitExceeded && aggregation.retryableMessageIds.length > 0) {
      await this.queuePlugin.dequeueByMessageIds(
        aggregation.retryableMessageIds
      );
      this.reportDroppedEvents(
        aggregation.retryableMessageIds.length,
        'retry_limit_exceeded',
        `Dropped ${aggregation.retryableMessageIds.length} events due to retry limit exceeded`
      );
    }

    const failedCount =
      events.length -
      aggregation.successfulMessageIds.length -
      aggregation.permanentErrorMessageIds.length;
    if (failedCount > 0) {
      const has429 = aggregation.rateLimitResults.length > 0;
      this.analytics?.logger.warn(
        `${failedCount} events will retry (429: ${has429}, transient: ${aggregation.hasTransientError})`
      );
    }
  }

  private sendEvents = async (events: SegmentEvent[]): Promise<void> => {
    if (events.length === 0) {
      await this.retryManager?.reset();
      return;
    }

    // We're not sending events until Segment has loaded all settings
    await this.settingsPromise;

    const config = this.analytics?.getConfig() ?? defaultConfig;

    const freshEvents = await this.pruneExpiredEvents(events);
    if (freshEvents.length === 0) {
      await this.retryManager?.reset();
      return;
    }

    if (this.retryManager && !(await this.retryManager.canRetry())) {
      this.analytics?.logger.info('Upload blocked by retry manager');
      return;
    }

    const batches: SegmentEvent[][] = chunk(
      freshEvents,
      config.maxBatchSize ?? MAX_EVENTS_PER_BATCH,
      MAX_PAYLOAD_SIZE_IN_KB
    );

    const results: BatchResult[] = await Promise.all(
      batches.map((batch) => this.uploadBatch(batch))
    );

    const aggregation = this.aggregateErrors(results);
    const limitExceeded = await this.updateRetryState(aggregation);

    await this.processUploadResults(
      freshEvents,
      aggregation,
      limitExceeded,
      config
    );
  };

  private readonly queuePlugin = new QueueFlushingPlugin(this.sendEvents);

  private getEndpoint(): string {
    const config = this.analytics?.getConfig();
    const hasProxy = !!(config?.proxy ?? '');
    const useSegmentEndpoints = Boolean(config?.useSegmentEndpoints);
    let baseURL = '';
    let endpoint = '';
    if (hasProxy) {
      //baseURL is always config?.proxy if hasProxy
      baseURL = config?.proxy ?? '';
      if (useSegmentEndpoints) {
        const isProxyEndsWithSlash = baseURL.endsWith('/');
        endpoint = isProxyEndsWithSlash ? 'b' : '/b';
      }
    } else {
      baseURL = this.apiHost ?? defaultApiHost;
    }
    try {
      return getURL(baseURL, endpoint);
    } catch (error) {
      console.error('Error in getEndpoint:', `fallback to ${defaultApiHost}`);
      return defaultApiHost;
    }
  }

  configure(analytics: SegmentClient): void {
    super.configure(analytics);

    const config = analytics.getConfig();

    // If the client has a proxy we don't need to await for settings apiHost, we can send events directly
    // Important! If new settings are required in the future you probably want to change this!
    if (config.proxy !== undefined) {
      this.settingsResolve();
    }

    // Enrich events with the Destination metadata
    this.add(new DestinationMetadataEnrichment(SEGMENT_DESTINATION_KEY));
    this.add(this.queuePlugin);
  }

  // We block sending stuff to segment until we get the settings
  update(settings: SegmentAPISettings, _type: UpdateType): void {
    const segmentSettings = settings.integrations[
      this.key
    ] as SegmentAPIIntegration;
    if (
      segmentSettings?.apiHost !== undefined &&
      segmentSettings?.apiHost !== null
    ) {
      //assign the api host from segment settings (domain/v1)
      this.apiHost = `https://${segmentSettings.apiHost}/b`;
    }

    const httpConfig = this.analytics?.getHttpConfig();
    if (httpConfig) {
      this.httpConfig = httpConfig;

      if (
        !this.retryManager &&
        (httpConfig.rateLimitConfig || httpConfig.backoffConfig)
      ) {
        const config = this.analytics?.getConfig();
        this.retryManager = new RetryManager(
          config?.writeKey ?? '',
          config?.storePersistor,
          httpConfig.rateLimitConfig,
          httpConfig.backoffConfig,
          this.analytics?.logger
        );
      }
    }

    this.settingsResolve();
  }

  execute(event: SegmentEvent): Promise<SegmentEvent | undefined> {
    // Execute the internal timeline here, the queue plugin will pick up the event and add it to the queue automatically
    return super.execute(event);
  }

  async flush() {
    // Wait until the queue is done restoring before flushing
    return this.queuePlugin.flush();
  }
}
