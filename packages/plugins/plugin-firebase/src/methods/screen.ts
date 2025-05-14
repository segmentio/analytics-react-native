import type { ScreenEventType } from '@segment/analytics-react-native';
import { firebaseAnalytics } from '../firebaseAnalytics';

export default async (event: ScreenEventType) => {
  const screenProps = {
    screen_name: event.name,
    screen_class: event.name,
    ...event.properties,
  };

  await firebaseAnalytics.logScreenView(screenProps);
};
