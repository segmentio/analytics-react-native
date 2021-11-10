import { EventType, TrackEventType } from '../../types';
import { SegmentDestination } from '../SegmentDestination';
import { SegmentClient } from '../../analytics';

jest.mock('../../analytics', () => ({
  SegmentClient: jest.fn().mockImplementation(() => {
    return {
      getSettings: jest.fn(),
      getPlugins: jest.fn(),
      store: {
        dispatch: jest.fn(),
      },
      actions: {
        main: {
          addEvent: jest.fn(),
        },
      },
    };
  }),
}));

describe('SegmentDestination', () => {
  beforeEach(() => {
    (SegmentClient as jest.Mock).mockClear();
  });

  it('executes', () => {
    const plugin = new SegmentDestination();
    // @ts-ignore
    plugin.analytics = new SegmentClient();
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
    // @ts-ignore
    plugin.analytics = new SegmentClient();
    plugin.analytics.getSettings = jest.fn().mockReturnValue({
      integrations: {
        firebase: {
          someConfig: 'someValue',
        },
      },
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
    plugin.analytics = new SegmentClient();
    plugin.analytics.getSettings = jest.fn().mockReturnValue({
      integrations: {
        firebase: {
          someConfig: 'someValue',
        },
      },
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
});
