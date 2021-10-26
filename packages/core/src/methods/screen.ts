import { createScreenEvent } from '../events';
import type { SegmentClientContext } from '../client';
import type { JsonMap } from '../types';

export default function screen(
  this: SegmentClientContext,
  { name, options }: { name: string; options?: JsonMap }
) {
  const event = createScreenEvent({
    name,
    properties: options,
  });

  this.process(event);
  this.logger.info('SCREEN event saved', event);
}
