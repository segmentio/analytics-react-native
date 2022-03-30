import type { ScreenEventType } from '@segment/analytics-react-native';
import * as Taplytics from 'taplytics-react-native';

export default (event: ScreenEventType) => {
  const eventName = `${event.type.toUpperCase()} event: ${event.name}`;

  Taplytics.logEvent(eventName, 0, event.properties);
  return event;
};
