import type { Config, SegmentEvent } from './types';
import { Base64 } from 'js-base64';
import { batchApi } from './constants';

export const uploadEvents = async ({
  config,
  events,
}: {
  config: Config;
  events: SegmentEvent[];
}) => {
  const requestUrl = config.proxy || batchApi;
  await fetch(requestUrl, {
    method: 'POST',
    body: JSON.stringify({
      batch: events,
      sentAt: new Date().toISOString(),
      writeKey: config.writeKey,
    }),
    headers: {
      'Authorization': `Basic ${Base64.encode(`${config.writeKey}:`)}`,
      'Content-Type': 'text/plain',
    },
  });
};
