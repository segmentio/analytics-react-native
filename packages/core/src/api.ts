import type { SegmentEvent } from './types';
import { Base64 } from 'js-base64';

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
      'Authorization': `Basic ${Base64.encode(`${writeKey}:`)}`,
      'Content-Type': 'text/plain',
    },
  });
};
