import { uploadEvents } from '../api';
import { EventType, TrackEventType } from '../types';

describe('#sendEvents', () => {
  beforeEach(() => {
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

    const event = {
      ...serializedEventProperties,
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
