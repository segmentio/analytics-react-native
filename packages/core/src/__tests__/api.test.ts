import {
  Config,
  Context,
  EventType,
  SegmentAPIIntegrations,
  TrackEventType,
  UserTraits,
} from '../types';
import { sendEvents } from '../api';
import * as context from '../context';
import { batchApi } from '../constants';

describe('#sendEvents', () => {
  beforeEach(() => {
    jest
      .spyOn(context, 'getContext')
      .mockImplementationOnce(
        async (userTraits?: UserTraits): Promise<Context> => {
          return {
            appName: 'Segment Example',
            traits: userTraits,
          } as any;
        }
      );

    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2001-01-01T00:00:00.000Z');
  });

  async function sendAnEventPer(config: Config, toUrl: string) {
    const mockResponse = Promise.resolve('MANOS');
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.resolve(mockResponse));

    const serializedEventProperties: TrackEventType = {
      anonymousId: '3534a492-e975-4efa-a18b-3c70c562fec2',
      event: 'Awesome event',
      type: EventType.TrackEvent,
      properties: {},
      timestamp: '2000-01-01T00:00:00.000Z',
      messageId: '1d1744bf-5beb-41ac-ad7a-943eac33babc',
    };

    // Context and Integration exist on SegmentEvents but are transmitted separately to avoid duplication
    const additionalEventProperties: {
      context: Context;
      integrations: SegmentAPIIntegrations;
    } = {
      context: await context.getContext({ name: 'Hello' }),
      integrations: {
        Firebase: false,
      },
    };

    const event = {
      ...serializedEventProperties,
      ...additionalEventProperties,
    };

    await sendEvents({
      config,
      events: [event],
    });

    expect(fetch).toHaveBeenCalledWith(toUrl, {
      method: 'POST',
      body: JSON.stringify({
        batch: [event],
        sentAt: '2001-01-01T00:00:00.000Z',
        writeKey: 'SEGMENT_KEY',
      }),
      headers: {
        'Authorization': 'Basic U0VHTUVOVF9LRVk6',
        'Content-Type': 'text/plain',
      },
    });
  }

  it('sends an event', async () => {
    const toSegmentBatchApi = batchApi;
    const config = {
      writeKey: 'SEGMENT_KEY',
    };
    await sendAnEventPer(config, toSegmentBatchApi);
  });

  it('sends an event to proxy', async () => {
    const toProxyUrl = 'https://myprox.io/b';
    const config = {
      writeKey: 'SEGMENT_KEY',
      proxy: toProxyUrl,
    };
    await sendAnEventPer(config, toProxyUrl);
  });
});
