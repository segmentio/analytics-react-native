import {
  Plugin,
  PluginType,
  SegmentEvent,
} from '@segment/analytics-react-native';

export type EventStatus = 'queued' | 'sent' | 'failed';

export type EventEntry = {
  type: string;
  name: string;
  timestamp: string;
  status: EventStatus;
  statusCode?: number;
};

type Listener = (events: EventEntry[]) => void;

export class Logger extends Plugin {
  type = PluginType.before;
  private events: EventEntry[] = [];
  private listeners: Listener[] = [];

  execute(event: SegmentEvent) {
    if (__DEV__) {
      console.log(event);
    }
    const entry: EventEntry = {
      type: event.type,
      name: this.getEventName(event),
      timestamp: event.timestamp ?? new Date().toISOString(),
      status: 'queued',
    };
    this.events = [...this.events, entry];
    this.notify();
    return event;
  }

  markSent(count: number) {
    this.updateQueued(count, 'sent', 200);
  }

  markFailed(count: number, statusCode?: number) {
    this.updateQueued(count, 'failed', statusCode);
  }

  private updateQueued(
    count: number,
    newStatus: EventStatus,
    statusCode?: number
  ) {
    let remaining = count;
    this.events = this.events.map((e) => {
      if (remaining > 0 && e.status === 'queued') {
        remaining--;
        return { ...e, status: newStatus, statusCode };
      }
      return e;
    });
    this.notify();
  }

  getEvents(): EventEntry[] {
    return this.events;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.events));
  }

  private getEventName(event: SegmentEvent): string {
    switch (event.type) {
      case 'track':
        return (event as any).event ?? 'Track';
      case 'screen':
        return (event as any).name ?? 'Screen';
      case 'identify':
        return (event as any).userId ?? 'Identify';
      case 'group':
        return (event as any).groupId ?? 'Group';
      case 'alias':
        return (event as any).userId ?? 'Alias';
      default:
        return event.type;
    }
  }
}
