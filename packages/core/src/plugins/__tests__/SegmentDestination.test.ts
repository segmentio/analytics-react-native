import { EventType, SegmentEvent, TrackEventType } from '../../types';
import { SegmentDestination } from '../SegmentDestination';
import { SegmentClient } from '../../analytics';
import { MockSegmentStore } from '../../__tests__/__helpers__/mockSegmentStore';
import { getMockLogger } from '../../__tests__/__helpers__/mockLogger';
import * as api from '../../api';

describe('SegmentDestination', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    logger: getMockLogger(),
    config: {
      writeKey: '123-456',
      maxBatchSize: 2,
    },
    store,
  };

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
  });

  it('executes', () => {
    const plugin = new SegmentDestination();
    // @ts-ignore
    plugin.analytics = new SegmentClient(clientArgs);
    const event: TrackEventType = {
      anonymousId: '3534a492-e975-4efa-a18b-3c70c562fec2',
      event: 'Awesome event',
      type: EventType.TrackEvent,
      properties: {},
      timestamp: '2000-01-01T00:00:00.000Z',
      messageId: '1d1744bf-5beb-41ac-ad7a-943eac33babc',
      context: { app: { name: 'TestApp' } },
      integrations: {
        Firebase: false,
      },
    };
    const result = plugin.execute(event);
    expect(result).toEqual(event);
  });

  it('disables device mode plugins to prevent dups', () => {
    const plugin = new SegmentDestination();
    plugin.analytics = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        settings: {
          firebase: {
            someConfig: 'someValue',
          },
        },
      }),
    });

    plugin.analytics.getPlugins = jest.fn().mockReturnValue([
      {
        key: 'firebase',
        type: 'destination',
      },
    ]);

    const event: TrackEventType = {
      anonymousId: '3534a492-e975-4efa-a18b-3c70c562fec2',
      event: 'Awesome event',
      type: EventType.TrackEvent,
      properties: {},
      timestamp: '2000-01-01T00:00:00.000Z',
      messageId: '1d1744bf-5beb-41ac-ad7a-943eac33babc',
      context: { app: { name: 'TestApp' } },
      integrations: {},
    };

    const expectedIntegrations = {
      firebase: false,
    };

    const result = plugin.execute(event);
    expect(result).toEqual({
      ...event,
      integrations: expectedIntegrations,
    });
  });

  it('lets plugins/events override destination settings', () => {
    const plugin = new SegmentDestination();
    // @ts-ignore
    plugin.analytics = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        settings: {
          firebase: {
            someConfig: 'someValue',
          },
        },
      }),
    });

    plugin.analytics.getPlugins = jest.fn().mockReturnValue([
      {
        key: 'firebase',
        type: 'destination',
      },
    ]);

    const event: TrackEventType = {
      anonymousId: '3534a492-e975-4efa-a18b-3c70c562fec2',
      event: 'Awesome event',
      type: EventType.TrackEvent,
      properties: {},
      timestamp: '2000-01-01T00:00:00.000Z',
      messageId: '1d1744bf-5beb-41ac-ad7a-943eac33babc',
      context: { app: { name: 'TestApp' } },
      integrations: {
        firebase: true,
      },
    };

    const result = plugin.execute(event);
    expect(result).toEqual(event);
  });

  it('chunks the events correctly', async () => {
    const plugin = new SegmentDestination();

    const events = [
      { messageId: 'message-1' },
      { messageId: 'message-2' },
      { messageId: 'message-3' },
      { messageId: 'message-4' },
    ] as SegmentEvent[];

    plugin.analytics = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        events,
      }),
    });

    const sendEventsSpy = jest.spyOn(api, 'sendEvents').mockResolvedValue();

    await plugin.flush();

    expect(sendEventsSpy).toHaveBeenCalledTimes(2);
    expect(sendEventsSpy).toHaveBeenCalledWith({
      config: {
        maxBatchSize: 2,
        writeKey: '123-456',
      },
      events: events.slice(0, 2).map((e) => ({
        ...e,
      })),
    });
    expect(sendEventsSpy).toHaveBeenCalledWith({
      config: {
        maxBatchSize: 2,
        writeKey: '123-456',
      },
      events: events.slice(2, 4).map((e) => ({
        ...e,
      })),
    });
  });
});
