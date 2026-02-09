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
import { defaultApiHost, defaultHttpConfig } from '../constants';
import { translateHTTPError, classifyError, parseRetryAfter } from '../errors';
import { defaultConfig } from '../constants';
import { UploadStateMachine, BatchUploadManager } from '../backoff';

const MAX_EVENTS_PER_BATCH = 100;
const MAX_PAYLOAD_SIZE_IN_KB = 500;
export const SEGMENT_DESTINATION_KEY = 'Segment.io';

export class SegmentDestination extends DestinationPlugin {
  type = PluginType.destination;
  key = SEGMENT_DESTINATION_KEY;
  private apiHost?: string;
  private settingsResolve: () => void;
  private settingsPromise: Promise<void>;
  private uploadStateMachine?: UploadStateMachine;
  private batchUploadManager?: BatchUploadManager;
  private settings?: SegmentAPISettings;

  constructor() {
    super();
    // We don't timeout this promise. We strictly need the response from Segment before sending things
    const { promise, resolve } = createPromise<void>();
    this.settingsPromise = promise;
    this.settingsResolve = resolve;
  }

  private sendEvents = async (events: SegmentEvent[]): Promise<void> => {
    if (events.length === 0) {
      return Promise.resolve();
    }

    // We're not sending events until Segment has loaded all settings
    await this.settingsPromise;

    // Upload gate: check if uploads are allowed
    if (this.uploadStateMachine) {
      const canUpload = await this.uploadStateMachine.canUpload();
      if (!canUpload) {
        // Still in WAITING state, defer upload
        return Promise.resolve();
      }
    }

    const config = this.analytics?.getConfig() ?? defaultConfig;

    const chunkedEvents: SegmentEvent[][] = chunk(
      events,
      config.maxBatchSize ?? MAX_EVENTS_PER_BATCH,
      MAX_PAYLOAD_SIZE_IN_KB
    );

    let sentEvents: SegmentEvent[] = [];
    let numFailedEvents = 0;

    // CRITICAL: Process batches SEQUENTIALLY (not parallel)
    for (const batch of chunkedEvents) {
      try {
        const result = await this.uploadBatch(batch);

        if (result.success) {
          sentEvents = sentEvents.concat(batch);
        } else if (result.halt) {
          // 429 response: halt upload loop immediately
          break;
        }
        // Transient error: continue to next batch
      } catch (e) {
        this.analytics?.reportInternalError(translateHTTPError(e));
        this.analytics?.logger.warn(e);
        numFailedEvents += batch.length;
      }
    }

    // Dequeue successfully sent events
    await this.queuePlugin.dequeue(sentEvents);

    if (sentEvents.length) {
      if (config.debug === true) {
        this.analytics?.logger.info(`Sent ${sentEvents.length} events`);
      }
    }

    if (numFailedEvents) {
      this.analytics?.logger.error(`Failed to send ${numFailedEvents} events.`);
    }

    return Promise.resolve();
  };

  private async uploadBatch(
    batch: SegmentEvent[]
  ): Promise<{ success: boolean; halt: boolean }> {
    const config = this.analytics?.getConfig() ?? defaultConfig;
    const httpConfig = this.settings?.httpConfig ?? defaultHttpConfig;

    // Create batch metadata for retry tracking
    const batchId = this.batchUploadManager?.createBatch(batch) ?? '';

    // Get retry count (per-batch preferred, fall back to global for 429)
    const batchRetryCount = this.batchUploadManager
      ? await this.batchUploadManager.getBatchRetryCount(batchId)
      : 0;
    const globalRetryCount = this.uploadStateMachine
      ? await this.uploadStateMachine.getGlobalRetryCount()
      : 0;
    const retryCount = batchRetryCount > 0 ? batchRetryCount : globalRetryCount;

    try {
      const res = await uploadEvents({
        writeKey: config.writeKey,
        url: this.getEndpoint(),
        events: batch,
        retryCount, // Send X-Retry-Count header
      });

      // Success case
      if (res.ok) {
        await this.uploadStateMachine?.reset();
        await this.batchUploadManager?.removeBatch(batchId);
        this.analytics?.logger.info(
          `Batch uploaded successfully (${batch.length} events)`
        );
        return { success: true, halt: false };
      }

      // Error classification
      const classification = classifyError(
        res.status,
        httpConfig.backoffConfig?.retryableStatusCodes
      );

      // Handle 429 rate limiting
      if (classification.errorType === 'rate_limit') {
        const retryAfterValue = res.headers.get('retry-after');
        const retryAfterSeconds =
          parseRetryAfter(
            retryAfterValue,
            httpConfig.rateLimitConfig?.maxRetryInterval
          ) ?? 60; // Default 60s if missing

        await this.uploadStateMachine?.handle429(retryAfterSeconds);

        this.analytics?.logger.warn(
          `Rate limited (429): retry after ${retryAfterSeconds}s`
        );
        return { success: false, halt: true }; // HALT upload loop
      }

      // Handle transient errors with exponential backoff
      if (classification.isRetryable && classification.errorType === 'transient') {
        await this.batchUploadManager?.handleRetry(batchId, res.status);
        return { success: false, halt: false }; // Continue to next batch
      }

      // Permanent error: drop batch
      this.analytics?.logger.warn(
        `Permanent error (${res.status}): dropping batch (${batch.length} events)`
      );
      await this.batchUploadManager?.removeBatch(batchId);
      return { success: false, halt: false };

    } catch (e) {
      // Network error: treat as transient
      await this.batchUploadManager?.handleRetry(batchId, -1);
      throw e;
    }
  }

  private readonly queuePlugin = new QueueFlushingPlugin(this.sendEvents);

  private getEndpoint(): string {
    const config = this.analytics?.getConfig();
    const hasProxy = !!(config?.proxy ?? '');
    const useSegmentEndpoints = Boolean(config?.useSegmentEndpoints);
    let baseURL = '';
    let endpoint = '';
    if (hasProxy) {
      //baseURL is always config?.proxy if hasProxy
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

    // If the client has a proxy we don't need to await for settings apiHost, we can send events directly
    // Important! If new settings are required in the future you probably want to change this!
    if (analytics.getConfig().proxy !== undefined) {
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

    // Store settings for httpConfig access
    this.settings = settings;

    // Initialize backoff components when settings arrive
    const httpConfig = settings.httpConfig ?? defaultHttpConfig;
    const config = this.analytics?.getConfig();

    if (config?.storePersistor) {
      this.uploadStateMachine = new UploadStateMachine(
        config.writeKey,
        config.storePersistor,
        httpConfig.rateLimitConfig ?? defaultHttpConfig.rateLimitConfig!,
        this.analytics?.logger
      );

      this.batchUploadManager = new BatchUploadManager(
        config.writeKey,
        config.storePersistor,
        httpConfig.backoffConfig ?? defaultHttpConfig.backoffConfig!,
        this.analytics?.logger
      );
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
