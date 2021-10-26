import firebaseAnalytics from '@react-native-firebase/analytics';
import type { ScreenEventType } from '@segment/analytics-react-native/src';

export default async (event: ScreenEventType) => {
  await firebaseAnalytics().logScreenView({
    screen_name: event.name,
    screen_class: event.name,
  });
};
