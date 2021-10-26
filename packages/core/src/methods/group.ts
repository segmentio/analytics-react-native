import type { SegmentClientContext } from '../client';
import type { GroupTraits } from '../types';
import { createGroupEvent } from '../events';

export default function group(
  this: SegmentClientContext,
  { groupId, groupTraits }: { groupId: string; groupTraits?: GroupTraits }
) {
  const event = createGroupEvent({
    groupId,
    groupTraits,
  });

  this.process(event);
  this.logger.info('GROUP event saved', event);
}
