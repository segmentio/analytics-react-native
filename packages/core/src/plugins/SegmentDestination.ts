import { DestinationPlugin } from '../plugin';
import { PluginType, SegmentEvent } from '../types';
import { chunk } from '../util';
import { sendEvents } from '../api';
import type { SegmentClient } from '../analytics';
import { DestinationMetadataEnrichment } from './DestinationMetadataEnrichment';

const MAX_EVENTS_PER_BATCH = 100;
export const SEGMENT_DESTINATION_KEY = 'Segment.io';

export class SegmentDestination extends DestinationPlugin {
  type = PluginType.destination;

  key = SEGMENT_DESTINATION_KEY;

  configure(analytics: SegmentClient): void {
    super.configure(analytics);

    // Enrich events with the Destination metadata
    this.add(new DestinationMetadataEnrichment(SEGMENT_DESTINATION_KEY));
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    const enrichedEvent = super.execute(event);
    if (enrichedEvent !== undefined) {
      this.analytics?.queueEvent(enrichedEvent);
    }
    return enrichedEvent;
  }

  async flush() {
    const events = this.analytics?.events.get() ?? [];
    const chunkedEvents: SegmentEvent[][] = chunk(
      events,
      this.analytics?.getConfig().maxBatchSize ?? MAX_EVENTS_PER_BATCH
    );

    let sentEvents: SegmentEvent[] = [];
    let numFailedEvents = 0;

    await Promise.all(
      chunkedEvents.map(async (batch: SegmentEvent[]) => {
        try {
          await sendEvents({
            config: this.analytics?.getConfig()!,
            events: batch,
          });
          sentEvents = sentEvents.concat(batch);
        } catch (e) {
          console.warn(e);
          numFailedEvents += batch.length;
        } finally {
          this.analytics?.removeEvents(sentEvents);
        }
      })
    );

    if (sentEvents.length) {
      if (this.analytics?.getConfig().debug) {
        console.info(`Sent ${sentEvents.length} events`);
      }
    }

    if (numFailedEvents) {
      console.error(`Failed to send ${numFailedEvents} events.`);
    }
  }
}
