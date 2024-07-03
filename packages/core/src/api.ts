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
  const context = events.find((event) => !!event.context)?.context;
  const integrations = events.find((event) => !!event.integrations)?.integrations;
  let sentEvents = events.map(({context,integrations, ...event}) => (event));
  return await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      batch: sentEvents,
      sentAt: new Date().toISOString(),
      writeKey: writeKey,
      context: context,
      integrations: integrations,
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
