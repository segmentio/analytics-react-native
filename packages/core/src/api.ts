import type { Config, SegmentEvent } from './types';
import { batchApi } from './constants';

export const uploadEvents = async ({
  config,
  events,
}: {
  config: Config;
  events: SegmentEvent[];
}) => {
  const requestUrl = config.proxy || batchApi;
  return await fetch(requestUrl, {
    method: 'POST',
    body: JSON.stringify({
      batch: events,
      sentAt: new Date().toISOString(),
      writeKey: config.writeKey,
    }),
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
