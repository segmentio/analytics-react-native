import { SegmentClient } from '../../analytics';
import * as api from '../../api';
import { defaultApiHost } from '../../constants';
import {
  createMockStoreGetter,
  getMockLogger,
  MockSegmentStore,
} from '../../test-helpers';
import {
  Config,
  EventType,
  SegmentAPIIntegration,
  SegmentEvent,
  TrackEventType,
  UpdateType,
} from '../../types';
import {
  SEGMENT_DESTINATION_KEY,
  SegmentDestination,
} from '../SegmentDestination';
import { getURL } from '../../util';

jest.mock('uuid');

describe('SegmentDestination', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    logger: getMockLogger(),
    config: {
      writeKey: '123-456',
      maxBatchSize: 2,
      flushInterval: 0,
    },
    store,
  };

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
  });

  it('executes', async () => {
    const plugin = new SegmentDestination();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
    const result = await plugin.execute(event);
    expect(result).toEqual(event);
  });

  it('disables device mode plugins to prevent dups', async () => {
    const plugin = new SegmentDestination();
    const analytics = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        settings: {
          firebase: {
            someConfig: 'someValue',
          },
          [SEGMENT_DESTINATION_KEY]: {},
        },
      }),
    });
    plugin.configure(analytics);

    plugin.analytics!.getPlugins = jest.fn().mockReturnValue([
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

    const result = await plugin.execute(event);
    expect(result).toEqual({
      ...event,
      _metadata: {
        bundled: ['firebase'],
        unbundled: [],
        bundledIds: [],
      },
    });
  });

  it('marks unbundled plugins where the cloud mode is disabled', async () => {
    const plugin = new SegmentDestination();
    const analytics = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        settings: {
          [SEGMENT_DESTINATION_KEY]: {
            unbundledIntegrations: ['firebase'],
            maybeBundledConfigIds: {},
          },
        },
      }),
    });
    plugin.configure(analytics);

    plugin.analytics!.getPlugins = jest.fn().mockReturnValue([
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

    const result = await plugin.execute(event);
    expect(result).toEqual({
      ...event,
      _metadata: {
        bundled: [],
        unbundled: ['firebase'],
        bundledIds: [],
      },
    });
  });

  it('marks active integrations as unbundled if plugin is not bundled', async () => {
    const plugin = new SegmentDestination();
    const analytics = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        settings: {
          [SEGMENT_DESTINATION_KEY]: {
            unbundledIntegrations: ['Amplitude'],
          },
          Mixpanel: {}, // Mixpanel is active but not bundled
        },
      }),
    });
    plugin.configure(analytics);

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

    const result = await plugin.execute(event);
    expect(result).toEqual({
      ...event,
      _metadata: {
        bundled: [],
        unbundled: ['Mixpanel', 'Amplitude'],
        bundledIds: [],
      },
    });
  });

  it('lets plugins/events override destination settings', async () => {
    const plugin = new SegmentDestination();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    plugin.analytics = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        settings: {
          firebase: {
            someConfig: 'someValue',
          },
          [SEGMENT_DESTINATION_KEY]: {},
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

    const result = await plugin.execute(event);
    expect(result).toEqual(event);
  });

  it('lets plugins/events disable destinations individually', async () => {
    const plugin = new SegmentDestination();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    plugin.analytics = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        settings: {
          [SEGMENT_DESTINATION_KEY]: {},
        },
      }),
    });

    const event: TrackEventType = {
      anonymousId: '3534a492-e975-4efa-a18b-3c70c562fec2',
      event: 'Awesome event',
      type: EventType.TrackEvent,
      properties: {},
      timestamp: '2000-01-01T00:00:00.000Z',
      messageId: '1d1744bf-5beb-41ac-ad7a-943eac33babc',
      context: { app: { name: 'TestApp' } },
      integrations: {
        [SEGMENT_DESTINATION_KEY]: false,
      },
    };

    const result = await plugin.execute(event);
    expect(result).toEqual(undefined);
  });

  describe('uploads', () => {
    const createTestWith = ({
      config,
      settings,
      events,
    }: {
      config?: Config;
      settings?: SegmentAPIIntegration;
      events: SegmentEvent[];
    }) => {
      const plugin = new SegmentDestination();

      const analytics = new SegmentClient({
        ...clientArgs,
        config: config ?? clientArgs.config,
        store: new MockSegmentStore({
          settings: {
            [SEGMENT_DESTINATION_KEY]: {},
          },
        }),
      });

      plugin.configure(analytics);
      // The settings store won't match but that's ok, the plugin should rely only on the settings it receives during update
      plugin.update(
        {
          integrations: {
            [SEGMENT_DESTINATION_KEY]: settings ?? {},
          },
        },
        UpdateType.initial
      );

      jest
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .spyOn(plugin.queuePlugin.queueStore!, 'getState')
        .mockImplementation(createMockStoreGetter(() => ({ events })));

      const sendEventsSpy = jest
        .spyOn(api, 'uploadEvents')
        .mockResolvedValue({ ok: true } as Response);

      return {
        plugin,
        sendEventsSpy,
      };
    };

    it('chunks the events correctly', async () => {
      const events = [
        { messageId: 'message-1' },
        { messageId: 'message-2' },
        { messageId: 'message-3' },
        { messageId: 'message-4' },
      ] as SegmentEvent[];

      const { plugin, sendEventsSpy } = createTestWith({
        events: events,
      });

      await plugin.flush();

      expect(sendEventsSpy).toHaveBeenCalledTimes(2);
      expect(sendEventsSpy).toHaveBeenCalledWith({
        url: getURL(defaultApiHost, '/b'),
        writeKey: '123-456',
        events: events.slice(0, 2).map((e) => ({
          ...e,
        })),
      });
      expect(sendEventsSpy).toHaveBeenCalledWith({
        url: getURL(defaultApiHost, '/b'),
        writeKey: '123-456',
        events: events.slice(2, 4).map((e) => ({
          ...e,
        })),
      });
    });

    it('uses segment settings apiHost for uploading events', async () => {
      const customEndpoint = 'events.eu1.segmentapis.com';
      const events = [
        { messageId: 'message-1' },
        { messageId: 'message-2' },
      ] as SegmentEvent[];

      const { plugin, sendEventsSpy } = createTestWith({
        events: events,
        settings: {
          apiKey: '',
          apiHost: customEndpoint,
        },
      });

      await plugin.flush();

      expect(sendEventsSpy).toHaveBeenCalledTimes(1);
      expect(sendEventsSpy).toHaveBeenCalledWith({
        url: getURL(customEndpoint, '/b'),
        writeKey: '123-456',
        events: events.slice(0, 2).map((e) => ({
          ...e,
        })),
      });
    });

    it.each([
      [false, false], // No proxy, No segment endpoint
      [false, true], // No proxy, Yes segment endpoint
      [true, false], // Yes proxy, No segment endpoint
      [true, true], // Yes proxy, Yes segment endpoint
    ])(
      'lets user override apiHost with proxy when hasProxy is %s and useSegmentEndpoints is %s',
      async (hasProxy, useSegmentEndpoints) => {
        const customEndpoint = 'https://customproxy.com/batchEvents';
        const events = [
          { messageId: 'message-1' },
          { messageId: 'message-2' },
        ] as SegmentEvent[];

        const { plugin, sendEventsSpy } = createTestWith({
          events,
          settings: {
            apiKey: '',
            apiHost: 'events.eu1.segmentapis.com',
          },
          config: {
            ...clientArgs.config,
            proxy: hasProxy ? customEndpoint : undefined, // Only set proxy when true
            useSegmentEndpoints, // Pass the flag dynamically
          },
        });

        // Determine expected URL logic
        let expectedUrl: string;
        if (hasProxy) {
          if (useSegmentEndpoints) {
            expectedUrl = getURL(customEndpoint, '/b');
          } else {
            expectedUrl = getURL(customEndpoint, '');
            console.log('expected URL---->', expectedUrl);
          }
        } else {
          expectedUrl = getURL('events.eu1.segmentapis.com', '/b');
        }

        // let expectedUrl = hasProxy
        //   ? getURL(customEndpoint, useSegmentEndpoints ? '/b' : '')
        //   : getURL('events.eu1.segmentapis.com', '/b');

        await plugin.flush();

        expect(sendEventsSpy).toHaveBeenCalledTimes(1);
        expect(sendEventsSpy).toHaveBeenCalledWith({
          url: expectedUrl,
          writeKey: '123-456',
          events: events.map((e) => ({
            ...e,
          })),
        });
      }
    );
  });
});
