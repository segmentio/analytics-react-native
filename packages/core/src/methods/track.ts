import { createTrackEvent } from '../events';
import type { SegmentClientContext } from '../client';
import type { JsonMap } from '../types';

export default function track(
  this: SegmentClientContext,
  { eventName, options }: { eventName: string; options?: JsonMap }
) {
  const event = createTrackEvent({
    event: eventName,
    properties: options,
  });

  this.process(event);
  this.logger.info('TRACK event saved', event);
}
