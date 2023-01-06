import type { SegmentEvent } from './types';

export const uploadEvents = async ({
  writeKey,
  url,
  events,
}: {
  writeKey: String;
  url: RequestInfo;
  events: SegmentEvent[];
}) => {
  return await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      batch: events,
      sentAt: new Date().toISOString(),
      writeKey: writeKey,
    }),
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
