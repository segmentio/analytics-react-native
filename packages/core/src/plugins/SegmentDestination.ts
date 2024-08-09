import { DestinationPlugin } from '../plugin';
import {
  PluginType,
  SegmentAPIIntegration,
  SegmentAPISettings,
  SegmentEvent,
  UpdateType,
} from '../types';
import { chunk, createPromise } from '../util';
import { uploadEvents } from '../api';
import type { SegmentClient } from '../analytics';
import { DestinationMetadataEnrichment } from './DestinationMetadataEnrichment';
import { QueueFlushingPlugin } from './QueueFlushingPlugin';
import { defaultApiHost } from '../constants';
import { checkResponseForErrors, translateHTTPError } from '../errors';
import { defaultConfig } from '../constants';

const MAX_EVENTS_PER_BATCH = 100;
const MAX_PAYLOAD_SIZE_IN_KB = 500;
export const SEGMENT_DESTINATION_KEY = 'Segment.io';

export class SegmentDestination extends DestinationPlugin {
  type = PluginType.destination;
  key = SEGMENT_DESTINATION_KEY;
  private apiHost?: string;
  private settingsResolve: () => void;
  private settingsPromise: Promise<void>;

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

    const config = this.analytics?.getConfig() ?? defaultConfig;

    const chunkedEvents: SegmentEvent[][] = chunk(
      events,
      config.maxBatchSize ?? MAX_EVENTS_PER_BATCH,
      MAX_PAYLOAD_SIZE_IN_KB
    );

    let sentEvents: SegmentEvent[] = [];
    let numFailedEvents = 0;

    await Promise.all(
      chunkedEvents.map(async (batch: SegmentEvent[]) => {
        try {
          const res = await uploadEvents({
            writeKey: config.writeKey,
            url: this.getEndpoint(),
            events: batch,
          });
          checkResponseForErrors(res);
          sentEvents = sentEvents.concat(batch);
        } catch (e) {
          this.analytics?.reportInternalError(translateHTTPError(e));
          this.analytics?.logger.warn(e);
          numFailedEvents += batch.length;
        } finally {
          await this.queuePlugin.dequeue(sentEvents);
        }
      })
    );

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

  private readonly queuePlugin = new QueueFlushingPlugin(this.sendEvents);

  private getEndpoint(): string {
    const config = this.analytics?.getConfig();
    return config?.proxy ?? this.apiHost ?? defaultApiHost;
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
  async clearFlushQueue() {
    //Wait until clearing current Flush queue
    return this.queuePlugin.clearQueue();
  }
  async getQueueCount() {
    // Wait until getting the count of queue
    const eventsCount = await this.queuePlugin.getQueueCount();
    return eventsCount;
  }
}
