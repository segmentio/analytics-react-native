import type { SegmentClientContext } from '../client';
import { createAliasEvent } from '../events';

export default function alias(
  this: SegmentClientContext,
  { newUserId }: { newUserId: string }
) {
  const { anonymousId, userId } = this.store.getState().userInfo;
  const event = createAliasEvent({
    anonymousId,
    userId,
    newUserId,
  });

  this.process(event);
  this.logger.info('ALIAS event saved', event);
}
