import type { SegmentEvent } from '../../core/src/types';
import { createMockStoreGetter } from './mockSegmentStore';
import { createCallbackManager } from './utils';
import { getStateFunc } from '../../core/lib/typescript/src/storage/types';

export class MockEventStore {
  private initialData: SegmentEvent[] = [];
  private events: SegmentEvent[] = [];

  private callbackManager = createCallbackManager<{ events: SegmentEvent[] }>();

  constructor(initialData?: SegmentEvent[]) {
    this.events = [...(initialData ?? [])];
    this.initialData = JSON.parse(
      JSON.stringify(initialData ?? [])
    ) as SegmentEvent[];
  }

  reset = () => {
    this.events = JSON.parse(
      JSON.stringify(this.initialData)
    ) as SegmentEvent[];
  };

  getState: getStateFunc<{
    events: SegmentEvent[];
  }> = createMockStoreGetter(() => ({ events: this.events }));

  subscribe = (callback: (value: { events: SegmentEvent[] }) => void) =>
    this.callbackManager.register(callback);

  dispatch = (
    callback: (value: { events: SegmentEvent[] }) => { events: SegmentEvent[] }
  ) => {
    this.events = callback({ events: this.events }).events;
    this.callbackManager.run({ events: this.events });
  };
}
