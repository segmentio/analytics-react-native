import { DestinationPlugin } from '../plugin';
import {
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
import {
  translateHTTPError,
  classifyError,
  parseRetryAfter,
} from '../errors';
import { UploadStateMachine } from '../backoff/UploadStateMachine';
import { BackoffManager } from '../backoff/BackoffManager';

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
  has429: boolean;
  longestRetryAfter: number;
  hasTransientError: boolean;
  permanentErrorMessageIds: string[];
};

export class SegmentDestination extends DestinationPlugin {
  type = PluginType.destination;
  key = SEGMENT_DESTINATION_KEY;
  private apiHost?: string;
  private settingsResolve: () => void;
  private settingsPromise: Promise<void>;
  private uploadStateMachine?: UploadStateMachine;
  private backoffManager?: BackoffManager;

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
    const messageIds = batch.map((e) => e.messageId).filter((id): id is string => !!id);

    try {
      const res = await uploadEvents({
        writeKey: config.writeKey,
        url: this.getEndpoint(),
        events: batch,
      });

      if (res.status === 200) {
        return {
          batch,
          messageIds,
          status: 'success',
          statusCode: 200,
        };
      }

      // Parse retry-after for 429
      const retryAfterSeconds =
        res.status === 429
          ? parseRetryAfter(
              res.headers.get('Retry-After'),
              config.httpConfig?.rateLimitConfig?.maxRetryInterval
            )
          : undefined;

      // Classify error
      const classification = classifyError(res.status, {
        default4xxBehavior: config.httpConfig?.backoffConfig?.default4xxBehavior,
        default5xxBehavior: config.httpConfig?.backoffConfig?.default5xxBehavior,
        statusCodeOverrides: config.httpConfig?.backoffConfig?.statusCodeOverrides,
        rateLimitEnabled: config.httpConfig?.rateLimitConfig?.enabled,
      });

      if (classification.errorType === 'rate_limit') {
        return {
          batch,
          messageIds,
          status: '429',
          statusCode: res.status,
          retryAfterSeconds: retryAfterSeconds || 60, // Default to 60s if not provided
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
      has429: false,
      longestRetryAfter: 0,
      hasTransientError: false,
      permanentErrorMessageIds: [],
    };

    for (const result of results) {
      switch (result.status) {
        case 'success':
          aggregation.successfulMessageIds.push(...result.messageIds);
          break;

        case '429':
          aggregation.has429 = true;
          if (result.retryAfterSeconds) {
            aggregation.longestRetryAfter = Math.max(
              aggregation.longestRetryAfter,
              result.retryAfterSeconds
            );
          }
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
      return Promise.resolve();
    }

    // We're not sending events until Segment has loaded all settings
    await this.settingsPromise;

    const config = this.analytics?.getConfig() ?? defaultConfig;

    // Check upload gates before sending
    if (this.uploadStateMachine) {
      const canUpload = await this.uploadStateMachine.canUpload();
      if (!canUpload) {
        this.analytics?.logger.info('Upload blocked by rate limiter');
        return;
      }
    }

    if (this.backoffManager) {
      const canRetry = await this.backoffManager.canRetry();
      if (!canRetry) {
        this.analytics?.logger.info('Upload blocked by backoff');
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

    // Handle 429 - ONCE per flush with longest retry-after
    if (aggregation.has429 && this.uploadStateMachine) {
      await this.uploadStateMachine.handle429(aggregation.longestRetryAfter);
      this.analytics?.logger.warn(
        `Rate limited (429): waiting ${aggregation.longestRetryAfter}s before retry`
      );
      // Events stay in queue
    }

    // Handle transient errors - ONCE per flush
    if (aggregation.hasTransientError && this.backoffManager) {
      await this.backoffManager.handleTransientError(500);
      // Events stay in queue
    }

    // Handle successes - dequeue
    if (aggregation.successfulMessageIds.length > 0) {
      await this.queuePlugin.dequeueByMessageIds(aggregation.successfulMessageIds);

      // Reset state machines on success
      if (this.uploadStateMachine) {
        await this.uploadStateMachine.reset();
      }
      if (this.backoffManager) {
        await this.backoffManager.reset();
      }

      if (config.debug === true) {
        this.analytics?.logger.info(
          `Sent ${aggregation.successfulMessageIds.length} events`
        );
      }
    }

    // Handle permanent errors - dequeue (drop)
    if (aggregation.permanentErrorMessageIds.length > 0) {
      await this.queuePlugin.dequeueByMessageIds(aggregation.permanentErrorMessageIds);
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
        `${failedCount} events will retry (429: ${aggregation.has429}, transient: ${aggregation.hasTransientError})`
      );
    }

    return Promise.resolve();
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

    // Initialize state machines
    if (config.httpConfig?.rateLimitConfig) {
      this.uploadStateMachine = new UploadStateMachine(
        config.writeKey,
        config.storePersistor,
        config.httpConfig.rateLimitConfig,
        analytics.logger
      );
    }

    if (config.httpConfig?.backoffConfig) {
      this.backoffManager = new BackoffManager(
        config.writeKey,
        config.storePersistor,
        config.httpConfig.backoffConfig,
        analytics.logger
      );
    }

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
}
