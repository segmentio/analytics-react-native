import { SegmentClient } from '../../analytics';
import { getMockLogger, MockSegmentStore } from '../../test-helpers';
import { EventType, SegmentEvent } from '../../types';

jest.mock('uuid');

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

describe('process', () => {
  const store = new MockSegmentStore({
    userInfo: {
      userId: 'current-user-id',
      anonymousId: 'very-anonymous',
    },
    context: {
      library: {
        name: 'test',
        version: '1.0',
      },
    },
  });

  const clientArgs = {
    config: {
      writeKey: 'mock-write-key',
      flushInterval: 0,
    },
    logger: getMockLogger(),
    store: store,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stamps basic data: timestamp and messageId for events when not ready', async () => {
    const client = new SegmentClient(clientArgs);
    jest.spyOn(client.isReady, 'value', 'get').mockReturnValue(false);
    // @ts-ignore
    const timeline = client.timeline;
    jest.spyOn(timeline, 'process');

    await client.track('Some Event', { id: 1 });

    let expectedEvent: Record<string, unknown> = {
      event: 'Some Event',
      properties: {
        id: 1,
      },
      type: EventType.TrackEvent,
    };

    // While not ready only timestamp and messageId should be defined
    // @ts-ignore
    const pendingEvents = client.pendingEvents;
    expect(pendingEvents.length).toBe(1);
    const pendingEvent = pendingEvents[0];
    expect(pendingEvent).toMatchObject(expectedEvent);
    expect(pendingEvent.messageId).not.toBeUndefined();
    expect(pendingEvent.timestamp).not.toBeUndefined();

    // Not yet processed
    expect(timeline.process).not.toHaveBeenCalled();

    // When ready it replays events
    jest.spyOn(client.isReady, 'value', 'get').mockReturnValue(true);
    // @ts-ignore
    await client.onReady();
    expectedEvent = {
      ...expectedEvent,
      context: { ...store.context.get() },
      userId: store.userInfo.get().userId,
      anonymousId: store.userInfo.get().anonymousId,
    };

    // @ts-ignore
    expect(client.pendingEvents.length).toBe(0);

    expect(timeline.process).toHaveBeenCalledWith(
      expect.objectContaining(expectedEvent)
    );
  });

  it('stamps all context and userInfo data for events when ready', async () => {
    const client = new SegmentClient(clientArgs);
    jest.spyOn(client.isReady, 'value', 'get').mockReturnValue(true);

    // @ts-ignore
    const timeline = client.timeline;
    jest.spyOn(timeline, 'process');

    await client.track('Some Event', { id: 1 });

    const expectedEvent = {
      event: 'Some Event',
      properties: {
        id: 1,
      },
      type: EventType.TrackEvent,
      context: { ...store.context.get() },
      userId: store.userInfo.get().userId,
      anonymousId: store.userInfo.get().anonymousId,
    } as SegmentEvent;

    // @ts-ignore
    const pendingEvents = client.pendingEvents;
    expect(pendingEvents.length).toBe(0);

    expect(timeline.process).toHaveBeenCalledWith(
      expect.objectContaining(expectedEvent)
    );
  });
});
