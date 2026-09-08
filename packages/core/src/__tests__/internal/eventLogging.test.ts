import { SegmentClient } from '../../analytics';
import {
  createMockStoreGetter,
  getMockLogger,
  MockSegmentStore,
} from '../../test-helpers';
import { EventType } from '../../types';

jest.mock('uuid');

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

describe('event logging', () => {
  const store = new MockSegmentStore({
    userInfo: {
      userId: 'current-user-id',
      anonymousId: 'very-anonymous',
    },
  });

  const baseConfig = {
    writeKey: 'mock-write-key',
    flushInterval: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    store.reset();
  });

  it('logs only non-sensitive metadata by default, not the full payload', async () => {
    const logger = getMockLogger();
    const client = new SegmentClient({
      config: baseConfig,
      logger,
      store,
    });

    await client.identify('user-with-secrets', { email: 'secret@example.com' });

    expect(logger.info).toHaveBeenCalledTimes(1);
    const [message, metadata] = (logger.info as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>
    ];
    expect(message).toBe('IDENTIFY event saved');
    expect(metadata).toEqual({
      type: EventType.IdentifyEvent,
      messageId: expect.any(String),
    });
    expect(JSON.stringify(metadata)).not.toContain('secret@example.com');
  });

  it('does not warn about debugPayloads when it is not enabled', () => {
    const logger = getMockLogger();
    // eslint-disable-next-line no-new
    new SegmentClient({ config: baseConfig, logger, store });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns once at startup when debugPayloads is enabled', () => {
    const logger = getMockLogger();
    // eslint-disable-next-line no-new
    new SegmentClient({
      config: { ...baseConfig, debugPayloads: true },
      logger,
      store,
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('debugPayloads is enabled')
    );
  });

  it('also logs the full payload when debugPayloads is enabled', async () => {
    const logger = getMockLogger();
    const client = new SegmentClient({
      config: { ...baseConfig, debugPayloads: true },
      logger,
      store,
    });

    await client.track('Some Event', { id: 1 });

    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(
      1,
      'TRACK event saved',
      expect.objectContaining({
        type: EventType.TrackEvent,
        name: 'Some Event',
      })
    );
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      'TRACK event payload',
      expect.objectContaining({
        event: 'Some Event',
        properties: { id: 1 },
      })
    );
  });

  it('redacts the deep-link URL query string even when debugPayloads is enabled', async () => {
    const logger = getMockLogger();
    const deepLinkData = {
      url: 'myapp://open?token=super-secret&other=1',
      referring_application: 'Safari',
    };
    jest
      .spyOn(store.deepLinkData, 'get')
      .mockImplementation(createMockStoreGetter(() => deepLinkData));

    const client = new SegmentClient({
      config: {
        ...baseConfig,
        trackDeepLinks: true,
        trackAppLifecycleEvents: false,
        debugPayloads: true,
      },
      logger,
      store,
    });

    await client.init();

    const payloadCall = (logger.info as jest.Mock).mock.calls.find(
      ([message]) => message === 'TRACK (Deep Link Opened) event payload'
    ) as [string, { properties: { url: string } }];

    expect(payloadCall).toBeDefined();
    expect(payloadCall[1].properties.url).toBe('myapp://open');
    expect(JSON.stringify(payloadCall)).not.toContain('super-secret');

    client.cleanup();
  });
});
