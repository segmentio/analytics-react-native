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
    const { promise, resolve } = createPromise<void>();
    this.settingsPromise = promise;
    this.settingsResolve = resolve;
  }

  private sendEvents = async (events: SegmentEvent[]): Promise<void> => {
    if (events.length === 0) {
      return Promise.resolve();
    }

    await this.settingsPromise;

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

    for (const batch of chunkedEvents) {
      try {
        const result = await this.uploadBatch(batch);

        if (result.success) {
          sentEvents = sentEvents.concat(batch);
          eventsToDequeue = eventsToDequeue.concat(batch);
        } else if (result.dropped) {
          eventsToDequeue = eventsToDequeue.concat(batch);
        } else if (result.halt) {
          break;
        }
      } catch (e) {
        this.analytics?.reportInternalError(translateHTTPError(e));
        this.analytics?.logger.warn(e);
        numFailedEvents += batch.length;
      }
    }

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
        retryCount,
      });

      if (res.ok) {
        if (this.backoffInitialized) {
          try {
            await this.uploadStateMachine?.reset();
            if (this.batchUploadManager) {
              await this.batchUploadManager.removeBatch(batchId);
            }
          } catch (e) {}
        }
        this.analytics?.logger.info(
          `Batch uploaded successfully (${batch.length} events)`
        );
        return { success: true, halt: false, dropped: false };
      }

      const classification = classifyError(res.status, {
        default4xxBehavior: httpConfig.backoffConfig?.default4xxBehavior,
        default5xxBehavior: httpConfig.backoffConfig?.default5xxBehavior,
        statusCodeOverrides: httpConfig.backoffConfig?.statusCodeOverrides,
        rateLimitEnabled: httpConfig.rateLimitConfig?.enabled,
      });

      if (classification.errorType === 'rate_limit') {
        const retryAfterValue = res.headers.get('retry-after');
        const retryAfterSeconds =
          parseRetryAfter(
            retryAfterValue,
            httpConfig.rateLimitConfig?.maxRetryInterval
          ) ?? 60;

        if (this.backoffInitialized && this.uploadStateMachine) {
          try {
            await this.uploadStateMachine.handle429(retryAfterSeconds);
          } catch (e) {}
        }

        this.analytics?.logger.warn(
          `Rate limited (429): retry after ${retryAfterSeconds}s`
        );
        return { success: false, halt: true, dropped: false };
      }

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
        return { success: false, halt: false, dropped: false };
      }

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

    this.add(new DestinationMetadataEnrichment(SEGMENT_DESTINATION_KEY));
    this.add(this.queuePlugin);
  }

  update(settings: SegmentAPISettings, _type: UpdateType): void {
    const segmentSettings = settings.integrations[
      this.key
    ] as SegmentAPIIntegration;
    if (
      segmentSettings?.apiHost !== undefined &&
      segmentSettings?.apiHost !== null
    ) {
      this.apiHost = `https://${segmentSettings.apiHost}/b`;
    }

    this.settings = settings;

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

          this.backoffInitialized = true;
          this.analytics?.logger.info(
            '[BACKOFF_INIT] Backoff fully initialized'
          );
        } catch (e) {
          this.analytics?.logger.error(
            `[BACKOFF_INIT] CRITICAL: Failed to create backoff components: ${e}`
          );
        }

        this.settingsResolve();
        this.analytics?.logger.info(
          '[BACKOFF_INIT] Settings promise resolved - uploads can proceed'
        );
      })
      .catch((e) => {
        this.analytics?.logger.error(
          `[BACKOFF_INIT] CRITICAL: Failed to import backoff module: ${e}`
        );
        this.settingsResolve();
        this.analytics?.logger.info(
          '[BACKOFF_INIT] Settings promise resolved despite error - uploads proceeding without backoff'
        );
      });
  }

  execute(event: SegmentEvent): Promise<SegmentEvent | undefined> {
    const enrichedEvent = super.execute(event);
    return enrichedEvent;
  }

  async flush() {
    // Wait until the queue is done restoring before flushing
    return this.queuePlugin.flush();
  }
}
