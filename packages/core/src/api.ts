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
}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
  };

  // Only send X-Retry-Count on retries (count > 0), omit on first attempt
  if (retryCount > 0) {
    headers['X-Retry-Count'] = retryCount.toString();
  }

  return await fetch(url, {
    method: 'POST',
    keepalive: true,
    body: JSON.stringify({
      batch: events,
      sentAt: new Date().toISOString(),
      writeKey: writeKey,
    }),
    headers,
  });
};
