import type { TrackEventType } from '@segment/analytics-react-native';
import * as Taplytics from 'taplytics-react-native';

export default (event: TrackEventType) => {
  const eventName = `${event.type.toUpperCase()} event: ${event.event}`;

  Taplytics.logEvent(eventName, 0, event.properties);
  return event;
};
