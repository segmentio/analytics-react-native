import type { SegmentClientContext } from '../client';
import { createIdentifyEvent } from '../events';
import type { UserTraits } from '../types';

export default function identify(
  this: SegmentClientContext,
  { userId, userTraits }: { userId: string; userTraits?: UserTraits }
) {
  const { traits: currentUserTraits } = this.store.getState().userInfo;

  const event = createIdentifyEvent({
    userTraits: {
      ...currentUserTraits,
      ...(userTraits || {}),
    },
  });

  this.store.dispatch(this.actions.userInfo.setUserId({ userId }));

  if (userTraits) {
    this.store.dispatch(
      this.actions.userInfo.setTraits({ traits: userTraits })
    );
  }

  this.process(event);
  this.logger.info('IDENTIFY event saved', event);
}
