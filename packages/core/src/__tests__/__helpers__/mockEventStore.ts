import type { SegmentEvent } from '../../types';
import { createMockStoreGetter } from './mockSegmentStore';
// import { createMockStoreGetter } from './mockSegmentStore';
import { createCallbackManager } from './utils';

export class MockEventStore {
  private initialData: SegmentEvent[] = [];
  private events: SegmentEvent[] = [];

  private callbackManager = createCallbackManager<{ events: SegmentEvent[] }>();

  constructor(initialData?: SegmentEvent[]) {
    this.events = [...(initialData ?? [])];
    this.initialData = JSON.parse(JSON.stringify(initialData ?? []));
  }

  reset = () => {
    this.events = JSON.parse(JSON.stringify(this.initialData));
  };

  getState = createMockStoreGetter(() => ({ events: this.events }));

  subscribe = (callback: (value: { events: SegmentEvent[] }) => void) =>
    this.callbackManager.register(callback);

  dispatch = (
    callback: (value: { events: SegmentEvent[] }) => { events: SegmentEvent[] }
  ) => {
    this.events = callback({ events: this.events }).events;
    this.callbackManager.run({ events: this.events });
  };
}
