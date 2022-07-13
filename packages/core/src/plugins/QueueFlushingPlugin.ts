import { createStore, Store, Unsubscribe } from '@segment/sovran-react-native';
import type { SegmentClient } from '../analytics';
import { defaultConfig } from '../constants';
import { UtilityPlugin } from '../plugin';
import { PluginType, type SegmentEvent } from '../types';

/**
 * This plugin manages a queue where all events get added to after timeline processing.
 * It takes a onFlush callback to trigger any action particular to your destination sending events.
 * It can autotrigger a flush of the queue when it reaches the config flushAt limit.
 */
export class QueueFlushingPlugin extends UtilityPlugin {
  // Gets executed last to keep the queue after all timeline processing is done
  type = PluginType.after;

  private isPendingUpload = false;
  private queueStore: Store<{ events: SegmentEvent[] }> | undefined;
  private unsubscribe: Unsubscribe | undefined;
  private onFlush: (events: SegmentEvent[]) => Promise<void>;

  /**
   * @param onFlush callback to execute when the queue is flushed (either by reaching the limit or manually) e.g. code to upload events to your destination
   */
  constructor(onFlush: (events: SegmentEvent[]) => Promise<void>) {
    super();
    this.onFlush = onFlush;
  }

  configure(analytics: SegmentClient): void {
    super.configure(analytics);

    const config = analytics?.getConfig() ?? defaultConfig;

    // Create its own storage per SegmentDestination instance to support multiple instances
    this.queueStore = createStore(
      { events: [] as SegmentEvent[] },
      {
        persist: { storeId: `${config.writeKey}-events` },
      }
    );

    // Setup subscribers to flush the events
    this.unsubscribe?.();
    this.unsubscribe = this.queueStore.subscribe(({ events }) => {
      if (events.length >= config.flushAt!) {
        this.flush();
      }
    });
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    this.queueStore?.dispatch((state) => {
      const events = [...state.events, event];
      return { events };
    });
    return event;
  }

  /**
   * Calls the onFlush callback with the events in the queue
   */
  async flush() {
    const events = this.queueStore?.getState().events ?? [];
    if (!this.isPendingUpload) {
      try {
        this.isPendingUpload = true;
        await this.onFlush(events);
      } finally {
        this.isPendingUpload = false;
      }
    }
  }

  /**
   * Removes one or multiple events from the queue
   * @param events events to remove
   */
  dequeue(events: SegmentEvent | SegmentEvent[]) {
    this.queueStore?.dispatch((state) => {
      const eventsToRemove = Array.isArray(events) ? events : [events];

      if (eventsToRemove.length === 0 || state.events.length === 0) {
        return state;
      }

      const setToRemove = new Set(eventsToRemove);
      const filteredEvents = state.events.filter((e) => !setToRemove.has(e));
      return { events: filteredEvents };
    });
  }
}
