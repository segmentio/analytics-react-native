import { DestinationPlugin } from '../plugin';
import { PluginType, SegmentEvent } from '../types';
import { chunk } from '../util';
import { uploadEvents } from '../api';
import type { SegmentClient } from '../analytics';
import { DestinationMetadataEnrichment } from './DestinationMetadataEnrichment';
import { QueueFlushingPlugin } from './QueueFlushingPlugin';
import { checkResponseForErrors, translateHTTPError } from '../errors';

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

    await Promise.all(
      chunkedEvents.map(async (batch: SegmentEvent[]) => {
        try {
          const res = await uploadEvents({
            config: this.analytics?.getConfig()!,
            events: batch,
          });
          checkResponseForErrors(res);
          sentEvents = sentEvents.concat(batch);
        } catch (e) {
          this.analytics?.reportInternalError(translateHTTPError(e));
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
