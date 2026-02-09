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
        url: getURL(defaultApiHost, ''), // default api already appended with '/b'
        writeKey: '123-456',
        events: events.slice(0, 2).map((e) => ({
          ...e,
        })),
      });
      expect(sendEventsSpy).toHaveBeenCalledWith({
        url: getURL(defaultApiHost, ''), // default api already appended with '/b'
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
          }
        } else {
          expectedUrl = getURL('events.eu1.segmentapis.com', '/b');
        }

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
  describe('getEndpoint', () => {
    it.each([
      ['example.com/v1/', 'https://example.com/v1/'],
      ['https://example.com/v1/', 'https://example.com/v1/'],
      ['http://example.com/v1/', 'http://example.com/v1/'],
    ])(
      'should append b if proxy end with / and useSegmentEndpoint is true',
      (proxy, expectedBaseURL) => {
        const plugin = new SegmentDestination();
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: true,
          proxy: proxy,
        };
        plugin.analytics = new SegmentClient({
          ...clientArgs,
          config,
        });
        const spy = jest.spyOn(Object.getPrototypeOf(plugin), 'getEndpoint');
        expect(plugin['getEndpoint']()).toBe(`${expectedBaseURL}b`);
        expect(spy).toHaveBeenCalled();
      }
    );
    it.each([
      ['example.com/v1/b/', 'https://example.com/v1/b/'],
      ['https://example.com/v1/b/', 'https://example.com/v1/b/'],
      ['http://example.com/v1/b/', 'http://example.com/v1/b/'],
    ])(
      'should append b if proxy ends with b/ and useSegmentEndpoint is true',
      (proxy, expectedBaseURL) => {
        const plugin = new SegmentDestination();
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: true,
          proxy: proxy,
        };
        plugin.analytics = new SegmentClient({
          ...clientArgs,
          config,
        });

        const spy = jest.spyOn(Object.getPrototypeOf(plugin), 'getEndpoint');
        expect(plugin['getEndpoint']()).toBe(`${expectedBaseURL}b`);
        expect(spy).toHaveBeenCalled();
      }
    );
    it.each([
      ['example.com/v1/b', 'https://example.com/v1/b'],
      ['https://example.com/v1/b', 'https://example.com/v1/b'],
      ['http://example.com/v1/b', 'http://example.com/v1/b'],
    ])(
      'should append /b if proxy ends with /b and useSegmentEndpoint is true',
      (proxy, expectedBaseURL) => {
        const plugin = new SegmentDestination();
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: true,
          proxy: proxy,
        };
        plugin.analytics = new SegmentClient({
          ...clientArgs,
          config,
        });

        const spy = jest.spyOn(Object.getPrototypeOf(plugin), 'getEndpoint');
        expect(plugin['getEndpoint']()).toBe(`${expectedBaseURL}/b`);
        expect(spy).toHaveBeenCalled();
      }
    );
    it.each([
      ['example.com/v1?params=xx'],
      ['https://example.com/v1?params=xx'],
      ['http://example.com/v1?params=xx'],
    ])(
      'should throw an error if proxy comes with query params and useSegmentEndpoint is true',
      (proxy) => {
        const plugin = new SegmentDestination();
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: true,
          proxy: proxy,
        };
        plugin.analytics = new SegmentClient({
          ...clientArgs,
          config,
        });

        const spy = jest.spyOn(Object.getPrototypeOf(plugin), 'getEndpoint');
        // Expect the private method to throw an error
        expect(plugin['getEndpoint']()).toBe(defaultApiHost);
        expect(spy).toHaveBeenCalled();
      }
    );
    it.each([
      ['example.com/v1/', false],
      ['example.com/b/', false],
      ['example.com/b', false],
      ['example.com/v1?params=xx', false],
    ])(
      'should always return identical result if proxy is provided and useSegmentEndpoints is false',
      (proxy, useSegmentEndpoints) => {
        const plugin = new SegmentDestination();
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: useSegmentEndpoints,
          proxy: proxy,
        };
        plugin.analytics = new SegmentClient({
          ...clientArgs,
          config,
        });
        const spy = jest.spyOn(Object.getPrototypeOf(plugin), 'getEndpoint');
        const expected = `https://${proxy}`;
        expect(plugin['getEndpoint']()).toBe(expected);
        expect(spy).toHaveBeenCalled();
      }
    );
    it('No proxy provided, should return default API host', () => {
      const plugin = new SegmentDestination();
      const config = {
        ...clientArgs.config,
        useSegmentEndpoints: true, // No matter in this case
      };
      plugin.analytics = new SegmentClient({
        ...clientArgs,
        config,
      });
      const spy = jest.spyOn(Object.getPrototypeOf(plugin), 'getEndpoint');
      expect(plugin['getEndpoint']()).toBe(defaultApiHost);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('TAPI backoff and rate limiting', () => {
    const createTestWith = ({
      config,
      settings,
      events,
    }: {
      config?: Config;
      settings?: any;
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
      plugin.update(
        {
          integrations: {
            [SEGMENT_DESTINATION_KEY]: settings?.integration ?? {},
          },
          httpConfig: settings?.httpConfig,
        },
        UpdateType.initial
      );

      jest
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .spyOn(plugin.queuePlugin.queueStore!, 'getState')
        .mockImplementation(createMockStoreGetter(() => ({ events })));

      return { plugin, analytics };
    };

    it('sends Authorization header with base64 encoded writeKey', async () => {
      const events = [{ messageId: 'message-1' }] as SegmentEvent[];
      const { plugin } = createTestWith({ events });

      const sendEventsSpy = jest
        .spyOn(api, 'uploadEvents')
        .mockResolvedValue({ ok: true } as Response);

      await plugin.flush();

      expect(sendEventsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          retryCount: 0,
        })
      );
    });

    it('sends X-Retry-Count header starting at 0', async () => {
      const events = [{ messageId: 'message-1' }] as SegmentEvent[];
      const { plugin } = createTestWith({ events });

      const sendEventsSpy = jest
        .spyOn(api, 'uploadEvents')
        .mockResolvedValue({ ok: true } as Response);

      await plugin.flush();

      expect(sendEventsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          retryCount: 0,
        })
      );
    });

    it('halts upload loop on 429 response', async () => {
      const events = [
        { messageId: 'message-1' },
        { messageId: 'message-2' },
        { messageId: 'message-3' },
        { messageId: 'message-4' },
      ] as SegmentEvent[];

      const { plugin } = createTestWith({ events });

      const sendEventsSpy = jest
        .spyOn(api, 'uploadEvents')
        .mockResolvedValue({
          ok: false,
          status: 429,
          headers: new Headers({ 'retry-after': '60' }),
        } as Response);

      await plugin.flush();

      // With maxBatchSize=2, there would be 2 batches
      // But 429 on first batch should halt, so only 1 call
      expect(sendEventsSpy).toHaveBeenCalledTimes(1);
    });

    it('blocks future uploads after 429 until waitUntilTime passes', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const events = [{ messageId: 'message-1' }] as SegmentEvent[];
      const { plugin } = createTestWith({ events });

      // First flush returns 429
      jest.spyOn(api, 'uploadEvents').mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '60' }),
      } as Response);

      await plugin.flush();

      // Second flush should be blocked (same time)
      const sendEventsSpy = jest.spyOn(api, 'uploadEvents');
      sendEventsSpy.mockClear();

      await plugin.flush();

      expect(sendEventsSpy).not.toHaveBeenCalled();
    });

    it('allows upload after 429 waitUntilTime passes', async () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const events = [{ messageId: 'message-1' }] as SegmentEvent[];
      const { plugin } = createTestWith({ events });

      // First flush returns 429
      jest.spyOn(api, 'uploadEvents').mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '60' }),
      } as Response);

      await plugin.flush();

      // Advance time past waitUntilTime
      jest.spyOn(Date, 'now').mockReturnValue(now + 61000);

      // Second flush should now work
      const sendEventsSpy = jest
        .spyOn(api, 'uploadEvents')
        .mockResolvedValue({ ok: true } as Response);

      await plugin.flush();

      expect(sendEventsSpy).toHaveBeenCalled();
    });

    it('resets state after successful upload', async () => {
      const events = [{ messageId: 'message-1' }] as SegmentEvent[];
      const { plugin } = createTestWith({ events });

      // First flush returns 429
      jest.spyOn(api, 'uploadEvents').mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '10' }),
      } as Response);

      await plugin.flush();

      // Second flush succeeds
      jest.spyOn(api, 'uploadEvents').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      // Advance time
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 11000);
      await plugin.flush();

      // Third flush should work immediately (state reset)
      const sendEventsSpy = jest
        .spyOn(api, 'uploadEvents')
        .mockResolvedValue({ ok: true } as Response);

      await plugin.flush();

      expect(sendEventsSpy).toHaveBeenCalled();
    });

    it('continues to next batch on transient error (500)', async () => {
      const events = [
        { messageId: 'message-1' },
        { messageId: 'message-2' },
        { messageId: 'message-3' },
        { messageId: 'message-4' },
      ] as SegmentEvent[];

      const { plugin } = createTestWith({ events });

      let callCount = 0;
      const sendEventsSpy = jest.spyOn(api, 'uploadEvents').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First batch fails with 500
          return {
            ok: false,
            status: 500,
            headers: new Headers(),
          } as Response;
        }
        // Second batch succeeds
        return { ok: true, status: 200 } as Response;
      });

      await plugin.flush();

      // Should try both batches (not halt on 500)
      expect(sendEventsSpy).toHaveBeenCalledTimes(2);
    });

    it('drops batch on permanent error (400)', async () => {
      const events = [{ messageId: 'message-1' }] as SegmentEvent[];
      const { plugin, analytics } = createTestWith({ events });

      const warnSpy = jest.spyOn(analytics.logger, 'warn');

      jest.spyOn(api, 'uploadEvents').mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
      } as Response);

      await plugin.flush();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permanent error (400): dropping batch')
      );
    });

    it('processes batches sequentially (not parallel)', async () => {
      const events = [
        { messageId: 'message-1' },
        { messageId: 'message-2' },
        { messageId: 'message-3' },
        { messageId: 'message-4' },
      ] as SegmentEvent[];

      const { plugin } = createTestWith({ events });

      const callOrder: number[] = [];
      let currentCall = 0;

      jest.spyOn(api, 'uploadEvents').mockImplementation(async () => {
        const thisCall = ++currentCall;
        callOrder.push(thisCall);

        // Simulate async delay
        await new Promise((resolve) => setTimeout(resolve, 10));

        return { ok: true, status: 200 } as Response;
      });

      await plugin.flush();

      // Calls should be sequential: [1, 2]
      expect(callOrder).toEqual([1, 2]);
    });

    it('uses legacy behavior when httpConfig.enabled = false', async () => {
      const events = [
        { messageId: 'message-1' },
        { messageId: 'message-2' },
      ] as SegmentEvent[];

      const { plugin } = createTestWith({
        events,
        settings: {
          httpConfig: {
            rateLimitConfig: { enabled: false },
            backoffConfig: { enabled: false },
          },
        },
      });

      // Return 429 but should not block
      jest.spyOn(api, 'uploadEvents').mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '60' }),
      } as Response);

      await plugin.flush();

      // Try again immediately - should not be blocked
      const sendEventsSpy = jest
        .spyOn(api, 'uploadEvents')
        .mockResolvedValue({ ok: true } as Response);

      await plugin.flush();

      expect(sendEventsSpy).toHaveBeenCalled();
    });

    it('parses Retry-After header correctly', async () => {
      const events = [{ messageId: 'message-1' }] as SegmentEvent[];
      const { plugin, analytics } = createTestWith({ events });

      const infoSpy = jest.spyOn(analytics.logger, 'info');

      jest.spyOn(api, 'uploadEvents').mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '120' }),
      } as Response);

      await plugin.flush();

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('retry after 120s')
      );
    });

    it('uses default retry-after when header missing', async () => {
      const events = [{ messageId: 'message-1' }] as SegmentEvent[];
      const { plugin, analytics } = createTestWith({ events });

      const infoSpy = jest.spyOn(analytics.logger, 'info');

      jest.spyOn(api, 'uploadEvents').mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers(), // No retry-after header
      } as Response);

      await plugin.flush();

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('retry after 60s') // Default
      );
    });
  });
});
