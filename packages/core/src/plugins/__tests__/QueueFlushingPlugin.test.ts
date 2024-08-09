import { createStore } from '@segment/sovran-react-native';

import { MockEventStore } from '../../test-helpers';
import { EventType, SegmentEvent } from '../../types';
import { QueueFlushingPlugin } from '../QueueFlushingPlugin';

import type { SegmentClient } from '../../analytics';
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

    const result = await queuePlugin.execute({
      type: EventType.TrackEvent,
      event: 'test1',
      properties: {
        test: 'test1',
      },
    } as SegmentEvent);

    expect(result).not.toBeUndefined();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(queuePlugin.queueStore?.getState().events).toHaveLength(1);

    // No flush called yet
    expect(onFlush).not.toHaveBeenCalled();
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

    const result = await queuePlugin.execute(event);

    expect(result).not.toBeUndefined();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(queuePlugin.queueStore?.getState().events).toHaveLength(1);
    await queuePlugin.dequeue(event);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(queuePlugin.queueStore?.getState().events).toHaveLength(0);
  });

  it('should clear all events from the queue', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const queuePlugin = setupQueuePlugin(onFlush, 10);

    const event1: SegmentEvent = {
      type: EventType.TrackEvent,
      event: 'test1',
      properties: {
        test: 'test1',
      },
    };

    const event2: SegmentEvent = {
      type: EventType.TrackEvent,
      event: 'test2',
      properties: {
        test: 'test2',
      },
    };

    await queuePlugin.execute(event1);
    await queuePlugin.execute(event2);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(queuePlugin.queueStore?.getState().events).toHaveLength(2);

    await queuePlugin.clearQueue();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(queuePlugin.queueStore?.getState().events).toHaveLength(0);
  });

  it('should return the count of items in the queue', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const queuePlugin = setupQueuePlugin(onFlush, 10);

    const event1: SegmentEvent = {
      type: EventType.TrackEvent,
      event: 'test1',
      properties: {
        test: 'test1',
      },
    };

    const event2: SegmentEvent = {
      type: EventType.TrackEvent,
      event: 'test2',
      properties: {
        test: 'test2',
      },
    };

    await queuePlugin.execute(event1);
    await queuePlugin.execute(event2);

    let eventsCount = await queuePlugin.getQueueCount();
    expect(eventsCount).toBe(2);

    await queuePlugin.dequeue(event1);

    eventsCount = await queuePlugin.getQueueCount();
    expect(eventsCount).toBe(1);

    await queuePlugin.clearQueue();

    eventsCount = await queuePlugin.getQueueCount();
    expect(eventsCount).toBe(0);
  });
});
