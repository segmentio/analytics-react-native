import { DestinationPlugin } from '../plugin';
import {
  PluginType,
  SegmentAPIIntegrations,
  SegmentAPISettings,
  SegmentEvent,
  UpdateType,
} from '../types';
import { chunk } from '../util';
import { sendEvents } from '../api';

const MAX_EVENTS_PER_BATCH = 100;

export class SegmentDestination extends DestinationPlugin {
  type = PluginType.destination;

  key = 'Segment.io';

  update(_: SegmentAPISettings, __: UpdateType) {
    // this is where analytics-swift initalizes the HTTP client
    // no need to do this for React Native where we just use the fetch polyfill directly
    // see flush() below
  }

  execute(event: SegmentEvent): SegmentEvent {
    const pluginSettings = this.analytics?.settings.get();
    const plugins = this.analytics?.getPlugins(PluginType.destination);

    // Disable all destinations that have a device mode plugin
    const deviceModePlugins =
      plugins?.map((plugin) => (plugin as DestinationPlugin).key) ?? [];
    const cloudSettings: SegmentAPIIntegrations = {
      ...pluginSettings,
    };
    for (const key of deviceModePlugins) {
      if (key in cloudSettings) {
        cloudSettings[key] = false;
      }
    }

    // User/event defined integrations override the cloud/device mode merge
    const mergedEvent = {
      ...event,
      integrations: {
        ...cloudSettings,
        ...event?.integrations,
      },
    };
    this.analytics?.queueEvent(mergedEvent);
    return mergedEvent;
  }

  async flush() {
    const events = this.analytics?.events.get() ?? [];
    const chunkedEvents: SegmentEvent[][] = chunk(
      events,
      this.analytics?.getConfig().maxBatchSize ?? MAX_EVENTS_PER_BATCH
    );

    let sentEvents: any[] = [];
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
