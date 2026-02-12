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
import type { UploadStateMachine, BatchUploadManager } from '../backoff';

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
  private backoffInitialized = false;

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
    // Only check if backoff is fully initialized to avoid race conditions
    if (this.backoffInitialized && this.uploadStateMachine) {
      try {
        this.analytics?.logger.info(`[UPLOAD_GATE] Checking canUpload() for ${events.length} events`);
        const canUpload = await this.uploadStateMachine.canUpload();
        this.analytics?.logger.info(`[UPLOAD_GATE] canUpload() returned: ${canUpload}`);
        if (!canUpload) {
          // Still in WAITING state, defer upload
          this.analytics?.logger.info('Upload deferred: rate limit in effect');
          return Promise.resolve();
        }
      } catch (e) {
        // If upload gate check fails, log warning but allow upload to proceed
        this.analytics?.logger.error(
          `uploadStateMachine.canUpload() threw error: ${e}`
        );
      }
    } else if (!this.backoffInitialized) {
      this.analytics?.logger.warn(
        'Backoff not initialized: upload proceeding without rate limiting'
      );
    } else if (!this.uploadStateMachine) {
      this.analytics?.logger.error(
        'CRITICAL: backoffInitialized=true but uploadStateMachine undefined!'
      );
    }

    const config = this.analytics?.getConfig() ?? defaultConfig;

    const chunkedEvents: SegmentEvent[][] = chunk(
      events,
      config.maxBatchSize ?? MAX_EVENTS_PER_BATCH,
      MAX_PAYLOAD_SIZE_IN_KB
    );

    let sentEvents: SegmentEvent[] = [];
    let eventsToDequeue: SegmentEvent[] = [];
    let numFailedEvents = 0;

    // CRITICAL: Process batches SEQUENTIALLY (not parallel)
    for (const batch of chunkedEvents) {
      try {
        const result = await this.uploadBatch(batch);

        if (result.success) {
          sentEvents = sentEvents.concat(batch);
          eventsToDequeue = eventsToDequeue.concat(batch);
        } else if (result.dropped) {
          // Permanent error: dequeue but don't count as sent
          eventsToDequeue = eventsToDequeue.concat(batch);
        } else if (result.halt) {
          // 429 response: halt upload loop immediately
          break;
        }
        // Transient error: continue to next batch (don't dequeue, will retry)
      } catch (e) {
        this.analytics?.reportInternalError(translateHTTPError(e));
        this.analytics?.logger.warn(e);
        numFailedEvents += batch.length;
      }
    }

    // Dequeue both successfully sent events AND permanently dropped events
    await this.queuePlugin.dequeue(eventsToDequeue);

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
  ): Promise<{ success: boolean; halt: boolean; dropped: boolean }> {
    const config = this.analytics?.getConfig() ?? defaultConfig;
    const httpConfig = this.settings?.httpConfig ?? defaultHttpConfig;
    const endpoint = this.getEndpoint();

    // Create batch metadata for retry tracking (only if backoff is initialized)
    let batchId: string | null = null;
    if (this.backoffInitialized && this.batchUploadManager) {
      try {
        batchId = this.batchUploadManager.createBatch(batch);
      } catch (e) {
        this.analytics?.logger.error(
          `BatchUploadManager.createBatch() failed: ${e}`
        );
      }
    }

    // Get retry count (per-batch preferred, fall back to global for 429)
    let retryCount = 0;
    if (this.backoffInitialized) {
      try {
        const batchRetryCount =
          this.batchUploadManager !== undefined && batchId !== null
            ? await this.batchUploadManager.getBatchRetryCount(batchId)
            : 0;
        const globalRetryCount = this.uploadStateMachine
          ? await this.uploadStateMachine.getGlobalRetryCount()
          : 0;
        retryCount = batchRetryCount > 0 ? batchRetryCount : globalRetryCount;
      } catch (e) {
        this.analytics?.logger.error(
          `Failed to get retry count from backoff components: ${e}`
        );
      }
    }

    try {
      const res = await uploadEvents({
        writeKey: config.writeKey,
        url: endpoint,
        events: batch,
        retryCount, // Send X-Retry-Count header
      });

      // Success case
      if (res.ok) {
        if (this.backoffInitialized) {
          try {
            await this.uploadStateMachine?.reset();
            if (this.batchUploadManager !== undefined && batchId !== null) {
              await this.batchUploadManager.removeBatch(batchId);
            }
          } catch (e) {
            // Silently handle cleanup errors - not critical
          }
        }
        this.analytics?.logger.info(
          `Batch uploaded successfully (${batch.length} events)`
        );
        return { success: true, halt: false, dropped: false };
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

        if (this.backoffInitialized && this.uploadStateMachine) {
          try {
            await this.uploadStateMachine.handle429(retryAfterSeconds);
          } catch (e) {
            // Silently handle - already logged in handle429
          }
        }

        this.analytics?.logger.warn(
          `Rate limited (429): retry after ${retryAfterSeconds}s`
        );
        return { success: false, halt: true, dropped: false }; // HALT upload loop
      }

      // Handle transient errors with exponential backoff
      if (
        classification.isRetryable &&
        classification.errorType === 'transient'
      ) {
        if (
          this.backoffInitialized &&
          this.batchUploadManager !== undefined &&
          batchId !== null
        ) {
          try {
            await this.batchUploadManager.handleRetry(batchId, res.status);
          } catch (e) {
            // Silently handle - not critical
          }
        }
        return { success: false, halt: false, dropped: false }; // Continue to next batch
      }

      // Permanent error: drop batch
      this.analytics?.logger.warn(
        `Permanent error (${res.status}): dropping batch (${batch.length} events)`
      );
      if (
        this.backoffInitialized &&
        this.batchUploadManager !== undefined &&
        batchId !== null
      ) {
        try {
          await this.batchUploadManager.removeBatch(batchId);
        } catch (e) {
          // Silently handle - not critical
        }
      }
      return { success: false, halt: false, dropped: true };
    } catch (e) {
      // Network error: treat as transient
      if (
        this.backoffInitialized &&
        this.batchUploadManager !== undefined &&
        batchId !== null
      ) {
        try {
          await this.batchUploadManager.handleRetry(batchId, -1);
        } catch (retryError) {
          // Silently handle - not critical
        }
      }
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
      this.analytics?.logger.error(`Error in getEndpoint, fallback to ${defaultApiHost}: ${error}`);
      return defaultApiHost;
    }
  }
  configure(analytics: SegmentClient): void {
    super.configure(analytics);

    console.log('[SegmentDestination] configure() called');

    // NOTE: We used to resolve settings early here if proxy was configured,
    // but now we must wait for backoff components to initialize in update()
    // before allowing uploads to proceed. The proxy flag is checked in update()
    // to skip waiting for apiHost from settings.

    // Enrich events with the Destination metadata
    this.add(new DestinationMetadataEnrichment(SEGMENT_DESTINATION_KEY));
    this.add(this.queuePlugin);
    console.log('[SegmentDestination] configure() complete');
  }

  // We block sending stuff to segment until we get the settings
  update(settings: SegmentAPISettings, _type: UpdateType): void {
    console.log('[SegmentDestination] update() called');

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

    console.log('[SegmentDestination] Storing settings');
    // Store settings for httpConfig access
    this.settings = settings;

    // Initialize backoff components when settings arrive (using dynamic import to avoid circular dependency)
    // CRITICAL: We must await the import and initialization before resolving settingsPromise to avoid race conditions
    const httpConfig = settings.httpConfig ?? defaultHttpConfig;
    const config = this.analytics?.getConfig();

    console.log('[SegmentDestination] Starting backoff initialization');
    this.analytics?.logger.warn(
      '[BACKOFF_INIT] Starting backoff component initialization'
    );

    // Await the import to ensure components are fully initialized before uploads can start
    void import('../backoff')
      .then(({ UploadStateMachine, BatchUploadManager }) => {
        console.log('[SegmentDestination] Backoff module imported');
        this.analytics?.logger.warn(
          '[BACKOFF_INIT] Backoff module imported successfully'
        );
        const persistor = config?.storePersistor;
        console.log(`[SegmentDestination] persistor available: ${!!persistor}`);

        try {
          console.log('[SegmentDestination] Creating UploadStateMachine...');
          this.uploadStateMachine = new UploadStateMachine(
            config?.writeKey ?? '',
            persistor,
            httpConfig.rateLimitConfig ?? defaultHttpConfig.rateLimitConfig!,
            this.analytics?.logger
          );
          console.log('[SegmentDestination] UploadStateMachine created');
          this.analytics?.logger.warn(
            '[BACKOFF_INIT] UploadStateMachine created'
          );

          console.log('[SegmentDestination] Creating BatchUploadManager...');
          this.batchUploadManager = new BatchUploadManager(
            config?.writeKey ?? '',
            persistor,
            httpConfig.backoffConfig ?? defaultHttpConfig.backoffConfig!,
            this.analytics?.logger
          );
          console.log('[SegmentDestination] BatchUploadManager created');
          this.analytics?.logger.warn(
            '[BACKOFF_INIT] BatchUploadManager created'
          );

          // Mark as initialized ONLY after both components are created
          this.backoffInitialized = true;
          console.log('[SegmentDestination] Backoff fully initialized');
          this.analytics?.logger.warn(
            '[BACKOFF_INIT] ✅ Backoff fully initialized'
          );
        } catch (e) {
          console.error(`[SegmentDestination] CRITICAL: Failed to create backoff components: ${e}`);
          this.analytics?.logger.error(
            `[BACKOFF_INIT] ⚠️ CRITICAL: Failed to create backoff components: ${e}`
          );
          // Don't set backoffInitialized to true if construction failed
        }

        // ALWAYS resolve settings promise after backoff initialization attempt
        // This allows uploads to proceed either with or without backoff
        this.settingsResolve();
        console.log('[SegmentDestination] Settings promise resolved');
        this.analytics?.logger.warn(
          '[BACKOFF_INIT] Settings promise resolved - uploads can proceed'
        );
      })
      .catch((e) => {
        console.error(`[SegmentDestination] CRITICAL: Failed to import backoff module: ${e}`);
        this.analytics?.logger.error(
          `[BACKOFF_INIT] ⚠️ CRITICAL: Failed to import backoff module: ${e}`
        );
        // Still resolve settings to allow uploads without backoff
        this.settingsResolve();
        console.log('[SegmentDestination] Settings promise resolved despite error');
        this.analytics?.logger.warn(
          '[BACKOFF_INIT] Settings promise resolved despite error - uploads proceeding without backoff'
        );
      });
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
