import {
  Context,
  EventType,
  SegmentAPIIntegrations,
  TrackEventType,
  UserTraits,
} from '../types';
import { uploadEvents } from '../api';
import * as context from '../context';

describe('#sendEvents', () => {
  beforeEach(() => {
    jest.spyOn(context, 'getContext').mockImplementationOnce(
      // eslint-disable-next-line @typescript-eslint/require-await
      async (userTraits?: UserTraits): Promise<Context> => {
        return {
          traits: userTraits ?? {},
        } as Context;
      }
    );

    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2001-01-01T00:00:00.000Z');
  });

  async function sendAnEventPer(writeKey: string, toUrl: string) {
    const mockResponse = Promise.resolve('MANOS');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

    await uploadEvents({
      writeKey: writeKey,
      url: toUrl,
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
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  it('sends an event', async () => {
    const toSegmentBatchApi = 'https://api.segment.io/v1.b';
    const writeKey = 'SEGMENT_KEY';

    await sendAnEventPer(writeKey, toSegmentBatchApi);
  });

  it('sends an event to proxy', async () => {
    const toProxyUrl = 'https://myprox.io/b';
    const writeKey = 'SEGMENT_KEY';

    await sendAnEventPer(writeKey, toProxyUrl);
  });
});
