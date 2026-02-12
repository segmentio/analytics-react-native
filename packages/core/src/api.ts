import type { SegmentEvent } from './types';

export const uploadEvents = async ({
  writeKey,
  url,
  events,
  retryCount = 0,
}: {
  writeKey: string;
  url: string;
  events: SegmentEvent[];
  retryCount?: number;
}): Promise<Response> => {
  // Create Authorization header (Basic auth format)
  const authHeader = 'Basic ' + btoa(writeKey + ':');

  return await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      batch: events,
      sentAt: new Date().toISOString(),
      writeKey: writeKey, // Keep in body for backwards compatibility
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': authHeader,
      'X-Retry-Count': retryCount.toString(),
    },
  });
};
