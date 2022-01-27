import { getUUID } from './uuid';

import {
  GroupEventType,
  GroupTraits,
  IdentifyEventType,
  JsonMap,
  ScreenEventType,
  TrackEventType,
  UserTraits,
  AliasEventType,
  EventType,
  SegmentEvent,
  UserInfoState,
} from './types';

export const createTrackEvent = ({
  event,
  properties = {},
}: {
  event: string;
  properties?: JsonMap;
}): TrackEventType => ({
  type: EventType.TrackEvent,
  event,
  properties,
});

export const createScreenEvent = ({
  name,
  properties = {},
}: {
  name: string;
  properties?: JsonMap;
}): ScreenEventType => ({
  type: EventType.ScreenEvent,
  name,
  properties,
});

export const createIdentifyEvent = ({
  userId,
  userTraits = {},
}: {
  userId?: string;
  userTraits?: UserTraits;
}): IdentifyEventType => {
  return {
    type: EventType.IdentifyEvent,
    userId: userId,
    traits: userTraits,
  };
};

export const createGroupEvent = ({
  groupId,
  groupTraits = {},
}: {
  groupId: string;
  groupTraits?: GroupTraits;
}): GroupEventType => ({
  type: EventType.GroupEvent,
  groupId,
  traits: groupTraits,
});

export const createAliasEvent = ({
  anonymousId,
  userId,
  newUserId,
}: {
  anonymousId: string;
  userId?: string;
  newUserId: string;
}): AliasEventType => ({
  type: EventType.AliasEvent,
  userId: newUserId,
  previousId: userId || anonymousId,
});

const isAliasEvent = (event: SegmentEvent): event is AliasEventType =>
  event.type === EventType.AliasEvent;
const isIdentifyEvent = (event: SegmentEvent): event is AliasEventType =>
  event.type === EventType.IdentifyEvent;

export const applyRawEventData = (
  event: SegmentEvent,
  userInfo: UserInfoState
) => {
  return {
    ...event,
    anonymousId: userInfo.anonymousId,
    messageId: getUUID(),
    timestamp: new Date().toISOString(),
    integrations: event.integrations ?? {},
    userId:
      isAliasEvent(event) || isIdentifyEvent(event)
        ? event.userId
        : userInfo.userId,
  };
};
