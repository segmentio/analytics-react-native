import {
  Plugin,
  PluginType,
  SegmentEvent,
} from '@segment/analytics-react-native';

export type EventEntry = {
  type: string;
  name: string;
  timestamp: string;
  sent: boolean;
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
      sent: false,
    };
    this.events = [...this.events, entry];
    this.notify();
    return event;
  }

  markAllSent() {
    this.events = this.events.map((e) => (e.sent ? e : { ...e, sent: true }));
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
