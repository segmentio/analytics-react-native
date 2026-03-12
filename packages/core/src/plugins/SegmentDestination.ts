import { DestinationPlugin } from '../plugin';
import {
  HttpConfig,
  PluginType,
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
import { translateHTTPError, classifyError, parseRetryAfter } from '../errors';
import { RetryManager } from '../backoff/RetryManager';

const MAX_EVENTS_PER_BATCH = 100;
const MAX_PAYLOAD_SIZE_IN_KB = 500;
export const SEGMENT_DESTINATION_KEY = 'Segment.io';

/**
 * Result of uploading a single batch
 */
type BatchResult = {
  batch: SegmentEvent[];
  messageIds: string[];
  status: 'success' | '429' | 'transient' | 'permanent' | 'network_error';
  statusCode?: number;
  retryAfterSeconds?: number;
};

/**
 * Aggregated error information from parallel batch uploads
 */
type ErrorAggregation = {
  successfulMessageIds: string[];
  rateLimitResults: BatchResult[];
  hasTransientError: boolean;
  permanentErrorMessageIds: string[];
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

  /**
   * Upload a single batch and return structured result
   */
  private async uploadBatch(batch: SegmentEvent[]): Promise<BatchResult> {
    const config = this.analytics?.getConfig() ?? defaultConfig;
    const messageIds = batch
      .map((e) => e.messageId)
      .filter((id): id is string => id !== undefined && id !== '');

    const retryCount = this.retryManager
      ? await this.retryManager.getRetryCount()
      : 0;

    // Strip internal metadata before sending upstream
    const cleanedBatch = batch.map(({ _queuedAt, ...event }) => event);

    try {
      const res = await uploadEvents({
        writeKey: config.writeKey,
        url: this.getEndpoint(),
        events: cleanedBatch as SegmentEvent[],
        retryCount,
      });

      if (res.ok) {
        return {
          batch,
          messageIds,
          status: 'success',
          statusCode: res.status,
        };
      }

      // Parse retry-after for 429
      const retryAfterSeconds =
        res.status === 429
          ? parseRetryAfter(
              res.headers.get('Retry-After'),
              this.httpConfig?.rateLimitConfig?.maxRetryInterval
            )
          : undefined;

      // Classify error
      const classification = classifyError(res.status, {
        default4xxBehavior: this.httpConfig?.backoffConfig?.default4xxBehavior,
        default5xxBehavior: this.httpConfig?.backoffConfig?.default5xxBehavior,
        statusCodeOverrides:
          this.httpConfig?.backoffConfig?.statusCodeOverrides,
        rateLimitEnabled: this.httpConfig?.rateLimitConfig?.enabled,
      });

      if (classification.errorType === 'rate_limit') {
        return {
          batch,
          messageIds,
          status: '429',
          statusCode: res.status,
          retryAfterSeconds: retryAfterSeconds ?? 60,
        };
      } else if (classification.errorType === 'transient') {
        return {
          batch,
          messageIds,
          status: 'transient',
          statusCode: res.status,
        };
      } else {
        // Permanent error
        return {
          batch,
          messageIds,
          status: 'permanent',
          statusCode: res.status,
        };
      }
    } catch (e) {
      // Network error
      this.analytics?.reportInternalError(translateHTTPError(e));
      return {
        batch,
        messageIds,
        status: 'network_error',
      };
    }
  }

  /**
   * Aggregate errors from parallel batch results
   */
  private aggregateErrors(results: BatchResult[]): ErrorAggregation {
    const aggregation: ErrorAggregation = {
      successfulMessageIds: [],
      rateLimitResults: [],
      hasTransientError: false,
      permanentErrorMessageIds: [],
    };

    for (const result of results) {
      switch (result.status) {
        case 'success':
          aggregation.successfulMessageIds.push(...result.messageIds);
          break;

        case '429':
          aggregation.rateLimitResults.push(result);
          break;

        case 'transient':
          aggregation.hasTransientError = true;
          break;

        case 'permanent':
          aggregation.permanentErrorMessageIds.push(...result.messageIds);
          break;

        case 'network_error':
          // Treat as transient
          aggregation.hasTransientError = true;
          break;
      }
    }

    return aggregation;
  }

  private sendEvents = async (events: SegmentEvent[]): Promise<void> => {
    if (events.length === 0) {
      await this.retryManager?.reset();
      return;
    }

    // We're not sending events until Segment has loaded all settings
    await this.settingsPromise;

    const config = this.analytics?.getConfig() ?? defaultConfig;

    // Prune events that have exceeded maxTotalBackoffDuration
    const maxAge = this.httpConfig?.backoffConfig?.maxTotalBackoffDuration ?? 0;
    if (maxAge > 0) {
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
        this.analytics?.logger.warn(
          `Pruned ${expiredMessageIds.length} events older than ${maxAge}s`
        );
      }

      events = freshEvents;

      if (events.length === 0) {
        await this.retryManager?.reset();
        return;
      }
    }

    // Check if blocked by rate limit or backoff
    if (this.retryManager) {
      const canRetry = await this.retryManager.canRetry();
      if (!canRetry) {
        this.analytics?.logger.info('Upload blocked by retry manager');
        return;
      }
    }

    // Chunk events into batches
    const batches: SegmentEvent[][] = chunk(
      events,
      config.maxBatchSize ?? MAX_EVENTS_PER_BATCH,
      MAX_PAYLOAD_SIZE_IN_KB
    );

    // Upload all batches in parallel
    const results: BatchResult[] = await Promise.all(
      batches.map((batch) => this.uploadBatch(batch))
    );

    // Aggregate errors
    const aggregation = this.aggregateErrors(results);
    const has429 = aggregation.rateLimitResults.length > 0;

    // Handle 429 — call handle429 per result so RetryManager.applyRetryStrategy
    // consolidates wait times according to the configured retry strategy (eager/lazy)
    if (has429 && this.retryManager) {
      for (const result of aggregation.rateLimitResults) {
        await this.retryManager.handle429(result.retryAfterSeconds ?? 60);
      }
    } else if (aggregation.hasTransientError && this.retryManager) {
      // Only handle transient backoff if no 429 (429 blocks everything anyway)
      await this.retryManager.handleTransientError();
    }

    // Handle successes - dequeue
    if (aggregation.successfulMessageIds.length > 0) {
      await this.queuePlugin.dequeueByMessageIds(
        aggregation.successfulMessageIds
      );

      // Only reset retry state on full success (no concurrent failures)
      if (this.retryManager && !has429 && !aggregation.hasTransientError) {
        await this.retryManager.reset();
      }

      if (config.debug === true) {
        this.analytics?.logger.info(
          `Sent ${aggregation.successfulMessageIds.length} events`
        );
      }
    }

    // Handle permanent errors - dequeue (drop)
    if (aggregation.permanentErrorMessageIds.length > 0) {
      await this.queuePlugin.dequeueByMessageIds(
        aggregation.permanentErrorMessageIds
      );
      this.analytics?.logger.error(
        `Dropped ${aggregation.permanentErrorMessageIds.length} events due to permanent errors`
      );
    }

    // Log summary
    const failedCount =
      events.length -
      aggregation.successfulMessageIds.length -
      aggregation.permanentErrorMessageIds.length;
    if (failedCount > 0) {
      this.analytics?.logger.warn(
        `${failedCount} events will retry (429: ${has429}, transient: ${aggregation.hasTransientError})`
      );
    }
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

    // Initialize httpConfig and retry manager from server-side CDN config
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
          this.analytics?.logger,
          config?.retryStrategy ?? 'lazy'
        );

        if (config?.autoFlushOnRetryReady === true) {
          this.retryManager.setAutoFlushCallback(() => {
            void this.flush();
          });
        }
      }
    }

    this.settingsResolve();
  }

  execute(event: SegmentEvent): Promise<SegmentEvent | undefined> {
    // Execute the internal timeline here, the queue plugin will pick up the event and add it to the queue automatically
    const enrichedEvent = super.execute(event);
    return enrichedEvent;
  }

  async flush() {
    // Wait until the queue is done restoring before flushing
    return this.queuePlugin.flush();
  }

  /**
   * Clean up resources. Clears RetryManager auto-flush timer.
   */
  destroy(): void {
    this.retryManager?.destroy();
  }
}
