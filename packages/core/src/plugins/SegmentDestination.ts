import { DestinationPlugin } from '../plugin';
import {
  IntegrationSettings,
  PluginType,
  SegmentAPIIntegrations,
  SegmentAPISettings,
  SegmentEvent,
  UpdateType,
} from '../types';
import { chunk } from '../util';
import { sendEvents } from '../api';

export class SegmentDestination extends DestinationPlugin {
  type = PluginType.destination;

  key = 'Segment.io';

  update(_: SegmentAPISettings, __: UpdateType) {
    // this is where analytics-swift initalizes the HTTP client
    // no need to do this for React Native where we just use the fetch polyfill directly
    // see flush() below
  }

  execute(event: SegmentEvent): SegmentEvent {
    const pluginSettings = this.analytics?.getSettings();
    const plugins = this.analytics?.getPlugins(PluginType.destination);

    // Disable all destinations that have a device mode plugin
    const deviceModePlugins =
      plugins?.map((plugin) => (plugin as DestinationPlugin).key) ?? [];
    const cloudSettings: SegmentAPIIntegrations = {
      ...pluginSettings?.integrations,
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
    this.queueEvent(mergedEvent);
    return mergedEvent;
  }

  queueEvent(event: SegmentEvent) {
    const { store, actions } = this.analytics!;
    store.dispatch(
      actions.main.addEvent({ event: event as unknown as SegmentEvent })
    );
  }

  async flush() {
    const { store, actions } = this.analytics!;
    const state = store.getState();

    const chunkedEvents = chunk(state.main.events, 1000);

    let sentEvents: any[] = [];
    let numFailedEvents = 0;

    await Promise.all(
      chunkedEvents.map(async (events) => {
        try {
          await sendEvents({
            config: state.system.configuration!,
            events,
          });
          sentEvents = sentEvents.concat(events);
        } catch (e) {
          console.warn(e);
          numFailedEvents += events.length;
        } finally {
          const messageIds = sentEvents.map(
            (evt: SegmentEvent) => evt.messageId as string
          );
          store.dispatch(
            actions.main.deleteEventsByMessageId({
              ids: messageIds,
            })
          );
        }
      })
    );

    if (sentEvents.length) {
      console.warn(`Sent ${sentEvents.length} events`);
    }

    if (numFailedEvents) {
      console.error(`Failed to send ${numFailedEvents} events.`);
    }
  }
}
