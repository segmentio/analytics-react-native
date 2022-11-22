import { DestinationPlugin } from '../plugin';
import { PluginType, SegmentEvent } from '../types';
import { chunk } from '../util';
import { uploadEvents } from '../api';
import type { SegmentClient } from '../analytics';
import { DestinationMetadataEnrichment } from './DestinationMetadataEnrichment';
import { QueueFlushingPlugin } from './QueueFlushingPlugin';
import { defaultApiHost } from '../constants';

const MAX_EVENTS_PER_BATCH = 100;
const MAX_PAYLOAD_SIZE_IN_KB = 500;
export const SEGMENT_DESTINATION_KEY = 'Segment.io';

export class SegmentDestination extends DestinationPlugin {
  type = PluginType.destination;

  key = SEGMENT_DESTINATION_KEY;

  private sendEvents = async (events: SegmentEvent[]): Promise<void> => {
    if (events.length === 0) {
      return Promise.resolve();
    }

    const chunkedEvents: SegmentEvent[][] = chunk(
      events,
      this.analytics?.getConfig().maxBatchSize ?? MAX_EVENTS_PER_BATCH,
      MAX_PAYLOAD_SIZE_IN_KB
    );

    let sentEvents: SegmentEvent[] = [];
    let numFailedEvents = 0;
    const config = this.analytics?.getConfig();

    await Promise.all(
      chunkedEvents.map(async (batch: SegmentEvent[]) => {
        try {
          await uploadEvents({
            writeKey: config!.writeKey,
            url: this.getEndpoint(),
            events: batch,
          });
          sentEvents = sentEvents.concat(batch);
        } catch (e) {
          this.analytics?.logger.warn(e);
          numFailedEvents += batch.length;
        } finally {
          this.queuePlugin.dequeue(sentEvents);
        }
      })
    );

    if (sentEvents.length) {
      if (this.analytics?.getConfig().debug) {
        this.analytics?.logger.info(`Sent ${sentEvents.length} events`);
      }
    }

    if (numFailedEvents) {
      this.analytics?.logger.error(`Failed to send ${numFailedEvents} events.`);
    }

    return Promise.resolve();
  };

  private readonly queuePlugin = new QueueFlushingPlugin(this.sendEvents);

  getEndpoint(): RequestInfo {
    const config = this.analytics?.getConfig();
    let api;
    let settings = this.analytics?.settings.get();

    if (
      settings !== undefined &&
      Object.keys(settings).includes(SEGMENT_DESTINATION_KEY)
    ) {
      const segmentInfo =
        (settings[SEGMENT_DESTINATION_KEY] as Record<string, any>) ?? {};
      api = segmentInfo.apiHost;
    }

    let requestUrl = config!.proxy || api || defaultApiHost;
    requestUrl = 'https://' + requestUrl + '/b';
    return requestUrl;
  }

  configure(analytics: SegmentClient): void {
    super.configure(analytics);

    // Enrich events with the Destination metadata
    this.add(new DestinationMetadataEnrichment(SEGMENT_DESTINATION_KEY));
    this.add(this.queuePlugin);
  }

  execute(event: SegmentEvent): Promise<SegmentEvent | undefined> {
    // Execute the internal timeline here, the queue plugin will pick up the event and add it to the queue automatically
    const enrichedEvent = super.execute(event);
    return enrichedEvent;
  }

  async flush() {
    return this.queuePlugin.flush();
  }
}
