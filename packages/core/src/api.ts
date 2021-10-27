import type { Config, SegmentEvent } from './types';
import { Base64 } from 'js-base64';
import { batchApi } from './constants';

export const sendEvents = async ({
  config,
  events,
}: {
  config: Config;
  events: SegmentEvent[];
}) => {
  const updatedEvents = events.map((event) => {
    const updatedEvent = {
      ...event,
      sentAt: new Date().toISOString(),
    };

    // Context and Integration exist on SegmentEvents but are transmitted separately to avoid duplication
    delete updatedEvent.context;
    delete updatedEvent.integrations;

    return updatedEvent;
  });

  await fetch(batchApi, {
    method: 'POST',
    body: JSON.stringify({
      batch: updatedEvents,
      context: events[0].context,
      integrations: events[0].integrations,
    }),
    headers: {
      'Authorization': `Basic ${Base64.encode(`${config.writeKey}:`)}`,
      'Content-Type': 'application/json',
    },
  });
};
