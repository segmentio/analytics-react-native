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
import { getUUID } from '../uuid';
import type { SegmentClient } from '../analytics';
import { DestinationMetadataEnrichment } from './DestinationMetadataEnrichment';
import { QueueFlushingPlugin } from './QueueFlushingPlugin';
import { defaultApiHost, defaultHttpConfig } from '../constants';
import { translateHTTPError, classifyError, parseRetryAfter } from '../errors';
import { defaultConfig } from '../constants';
import type { UploadStateMachine, BatchUploadManager } from '../backoff';
import {
  validateBackoffConfig,
  validateRateLimitConfig,
} from '../config-validation';

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
    if (this.backoffInitialized) {
      if (!this.uploadStateMachine) {
        this.analytics?.logger.error(
          'CRITICAL: backoffInitialized=true but uploadStateMachine undefined!'
        );
      } else {
        try {
          this.analytics?.logger.info(
            `[UPLOAD_GATE] Checking canUpload() for ${events.length} events`
          );
          const canUpload = await this.uploadStateMachine.canUpload();
          this.analytics?.logger.info(
            `[UPLOAD_GATE] canUpload() returned: ${canUpload}`
          );
          if (!canUpload) {
            this.analytics?.logger.info(
              'Upload deferred: rate limit in effect'
            );
            return Promise.resolve();
          }
        } catch (e) {
          this.analytics?.logger.error(
            `uploadStateMachine.canUpload() threw error: ${e}`
          );
        }
      }
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
    const batchId = getUUID();
    const config = this.analytics?.getConfig() ?? defaultConfig;
    const httpConfig = this.settings?.httpConfig ?? defaultHttpConfig;
    const endpoint = this.getEndpoint();

    // Get retry count (per-batch preferred, fall back to global for 429)
    let retryCount = 0;
    if (this.backoffInitialized) {
      try {
        const batchRetryCount =
          this.batchUploadManager && batchId
            ? await this.batchUploadManager.getBatchRetryCount(batchId)
            : 0;
        const globalRetryCount = this.uploadStateMachine
          ? await this.uploadStateMachine.getGlobalRetryCount()
          : 0;
        retryCount = batchRetryCount || globalRetryCount;
      } catch (e) {
        this.analytics?.logger.error(`Failed to get retry count: ${e}`);
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
            if (this.batchUploadManager) {
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
      const classification = classifyError(res.status, {
        default4xxBehavior: httpConfig.backoffConfig?.default4xxBehavior,
        default5xxBehavior: httpConfig.backoffConfig?.default5xxBehavior,
        statusCodeOverrides: httpConfig.backoffConfig?.statusCodeOverrides,
        rateLimitEnabled: httpConfig.rateLimitConfig?.enabled,
      });

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
        if (this.backoffInitialized && this.batchUploadManager) {
          try {
            const existingRetryCount =
              await this.batchUploadManager.getBatchRetryCount(batchId);
            if (existingRetryCount === 0) {
              this.batchUploadManager.createBatch(batch, batchId);
            }
            await this.batchUploadManager.handleRetry(batchId, res.status);
          } catch (e) {
            this.analytics?.logger.error(`Failed to handle batch retry: ${e}`);
          }
        }
        return { success: false, halt: false, dropped: false }; // Continue to next batch
      }

      // Permanent error: drop batch
      this.analytics?.logger.warn(
        `Permanent error (${res.status}): dropping batch (${batch.length} events)`
      );
      if (this.backoffInitialized && this.batchUploadManager) {
        try {
          await this.batchUploadManager.removeBatch(batchId);
        } catch (e) {
          this.analytics?.logger.error(`Failed to remove batch metadata: ${e}`);
        }
      }
      return { success: false, halt: false, dropped: true };
    } catch (e) {
      // Network error: treat as transient
      if (this.backoffInitialized && this.batchUploadManager) {
        try {
          await this.batchUploadManager.handleRetry(batchId, -1);
        } catch (retryError) {
          this.analytics?.logger.error(
            `Failed to handle retry for network error: ${retryError}`
          );
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
      this.analytics?.logger.error(
        `Error in getEndpoint, fallback to ${defaultApiHost}: ${error}`
      );
      return defaultApiHost;
    }
  }
  configure(analytics: SegmentClient): void {
    super.configure(analytics);

    // NOTE: We used to resolve settings early here if proxy was configured,
    // but now we must wait for backoff components to initialize in update()
    // before allowing uploads to proceed. The proxy flag is checked in update()
    // to skip waiting for apiHost from settings.

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

    // Initialize backoff components when settings arrive (using dynamic import to avoid circular dependency)
    // CRITICAL: We must await the import and initialization before resolving settingsPromise to avoid race conditions
    const httpConfig = settings.httpConfig ?? defaultHttpConfig;
    const config = this.analytics?.getConfig();

    this.analytics?.logger.info(
      '[BACKOFF_INIT] Starting backoff component initialization'
    );

    // Await the import to ensure components are fully initialized before uploads can start
    import('../backoff')
      .then(({ UploadStateMachine, BatchUploadManager }) => {
        this.analytics?.logger.info(
          '[BACKOFF_INIT] Backoff module imported successfully'
        );
        const persistor = config?.storePersistor;

        try {
          // Validate configs before passing to constructors
          const validatedRateLimitConfig = validateRateLimitConfig(
            httpConfig.rateLimitConfig ?? defaultHttpConfig.rateLimitConfig!,
            this.analytics?.logger
          );
          const validatedBackoffConfig = validateBackoffConfig(
            httpConfig.backoffConfig ?? defaultHttpConfig.backoffConfig!,
            this.analytics?.logger
          );

          this.uploadStateMachine = new UploadStateMachine(
            config?.writeKey ?? '',
            persistor,
            validatedRateLimitConfig,
            this.analytics?.logger
          );
          this.analytics?.logger.info(
            '[BACKOFF_INIT] UploadStateMachine created'
          );

          this.batchUploadManager = new BatchUploadManager(
            config?.writeKey ?? '',
            persistor,
            validatedBackoffConfig,
            this.analytics?.logger
          );
          this.analytics?.logger.info(
            '[BACKOFF_INIT] BatchUploadManager created'
          );

          // Mark as initialized ONLY after both components are created
          this.backoffInitialized = true;
          this.analytics?.logger.info(
            '[BACKOFF_INIT] ✅ Backoff fully initialized'
          );
        } catch (e) {
          this.analytics?.logger.error(
            `[BACKOFF_INIT] ⚠️ CRITICAL: Failed to create backoff components: ${e}`
          );
          // Don't set backoffInitialized to true if construction failed
        }

        // ALWAYS resolve settings promise after backoff initialization attempt
        // This allows uploads to proceed either with or without backoff
        this.settingsResolve();
        this.analytics?.logger.info(
          '[BACKOFF_INIT] Settings promise resolved - uploads can proceed'
        );
      })
      .catch((e) => {
        this.analytics?.logger.error(
          `[BACKOFF_INIT] ⚠️ CRITICAL: Failed to import backoff module: ${e}`
        );
        // Still resolve settings to allow uploads without backoff
        this.settingsResolve();
        this.analytics?.logger.info(
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
