import type { SegmentEvent } from './types';

export const uploadEvents = async ({
  writeKey,
  url,
  events,
}: {
  writeKey: string;
  url: string;
  events: SegmentEvent[];
}) => {
  return await fetch(url, {
    method: 'POST',
    keepalive: true,
    body: JSON.stringify({
      batch: events,
      sentAt: new Date().toISOString(),
      writeKey: writeKey,
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
