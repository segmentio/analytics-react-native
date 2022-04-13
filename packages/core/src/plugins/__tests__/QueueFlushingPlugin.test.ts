import { QueueFlushingPlugin } from '../QueueFlushingPlugin';
import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../../__tests__/__helpers__/mockLogger';
import {
  MockEventStore,
  MockSegmentStore,
} from '../../__tests__/__helpers__/mockSegmentStore';
import { EventType, SegmentEvent } from '../../types';

jest.mock('@segment/sovran-react-native', () => ({
  createStore: () => new MockEventStore(),
}));

describe('QueueFlushingPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should queue events when executed in the timeline', async () => {
    const onFlush = jest.fn();
    const queuePlugin = new QueueFlushingPlugin(onFlush);

    const client = new SegmentClient({
      config: {
        writeKey: 'SEGMENT_KEY',
        flushAt: 10,
      },
      logger: getMockLogger(),
      store: new MockSegmentStore(),
    });
    queuePlugin.configure(client);

    const result = queuePlugin.execute({
      type: EventType.TrackEvent,
      event: 'test',
      properties: {
        test: 'test',
      },
    } as SegmentEvent);

    expect(result).not.toBeUndefined();

    // Await Sovran updates
    await new Promise(process.nextTick);

    // @ts-ignore
    expect(queuePlugin.queueStore?.getState()).toHaveLength(1);

    // No flush called yet
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('should call onFlush when queue reaches limit', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const queuePlugin = new QueueFlushingPlugin(onFlush);

    const client = new SegmentClient({
      config: {
        writeKey: 'SEGMENT_KEY',
        flushAt: 1,
      },
      logger: getMockLogger(),
      store: new MockSegmentStore(),
    });
    queuePlugin.configure(client);

    const result = queuePlugin.execute({
      type: EventType.TrackEvent,
      event: 'test',
      properties: {
        test: 'test',
      },
    } as SegmentEvent);

    expect(result).not.toBeUndefined();

    // Await Sovran updates
    await new Promise(process.nextTick);

    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('should dequeue events on demand', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const queuePlugin = new QueueFlushingPlugin(onFlush);

    const client = new SegmentClient({
      config: {
        writeKey: 'SEGMENT_KEY',
        flushAt: 10,
      },
      logger: getMockLogger(),
      store: new MockSegmentStore(),
    });
    queuePlugin.configure(client);

    const result = queuePlugin.execute({
      type: EventType.TrackEvent,
      event: 'test',
      properties: {
        test: 'test',
      },
    } as SegmentEvent);

    expect(result).not.toBeUndefined();

    // Await Sovran updates
    await new Promise(process.nextTick);

    // @ts-ignore
    expect(queuePlugin.queueStore?.getState()).toHaveLength(1);
  });
});
