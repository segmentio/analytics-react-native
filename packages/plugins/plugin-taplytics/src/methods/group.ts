import type { GroupEventType } from '@segment/analytics-react-native';
import * as Taplytics from 'taplytics-react-native';

export default (event: GroupEventType) => {
  const eventName = `${event.type.toUpperCase()} event: ${event.groupId}`;

  Taplytics.logEvent(eventName, 0, event.traits);
  return event;
};
