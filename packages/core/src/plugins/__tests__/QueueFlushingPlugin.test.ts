import { MockEventStore } from '../../__tests__/__helpers__/mockEventStore';
import type { SegmentClient } from '../../analytics';
import { QueueFlushingPlugin } from '../QueueFlushingPlugin';
import { EventType, SegmentEvent } from '../../types';
import { createStore } from '@segment/sovran-react-native';

jest.mock('@segment/sovran-react-native');

describe('QueueFlushingPlugin', () => {
  function setupQueuePlugin(
    onFlush: (events: SegmentEvent[]) => Promise<void>,
    flushAt: number
  ) {
    const queuePlugin = new QueueFlushingPlugin(onFlush);
    // We override the createStore before the queue plugin is initialized to use our own mocked event store
    (createStore as jest.Mock).mockReturnValue(new MockEventStore());
    queuePlugin.configure({
      getConfig: () => ({
        writeKey: 'SEGMENT_KEY',
        flushAt,
      }),
    } as unknown as SegmentClient);

    // Mock the create store just before the queue plugin creates its store
    return queuePlugin;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('should queue events when executed in the timeline', async () => {
    const onFlush = jest.fn();
    const queuePlugin = setupQueuePlugin(onFlush, 10);

    const result = queuePlugin.execute({
      type: EventType.TrackEvent,
      event: 'test1',
      properties: {
        test: 'test1',
      },
    } as SegmentEvent);

    expect(result).not.toBeUndefined();

    // Await Sovran updates
    await new Promise(process.nextTick);

    // @ts-ignore
    expect(queuePlugin.queueStore?.getState().events).toHaveLength(1);

    // No flush called yet
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('should call onFlush when queue reaches limit', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const queuePlugin = setupQueuePlugin(onFlush, 1);

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
    const queuePlugin = setupQueuePlugin(onFlush, 10);

    const event: SegmentEvent = {
      type: EventType.TrackEvent,
      event: 'test2',
      properties: {
        test: 'test2',
      },
    };

    const result = queuePlugin.execute(event);

    expect(result).not.toBeUndefined();

    // Await Sovran updates
    await new Promise(process.nextTick);

    // @ts-ignore
    expect(queuePlugin.queueStore?.getState().events).toHaveLength(1);
    queuePlugin.dequeue(event);
    // @ts-ignore
    expect(queuePlugin.queueStore?.getState().events).toHaveLength(0);
  });
});
