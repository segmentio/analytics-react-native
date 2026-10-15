import type { ScreenEventType } from '@segment/analytics-react-native';
import { logEvent } from '@react-native-firebase/analytics';
import { firebaseAnalytics } from '../firebaseAnalytics';

export default async (event: ScreenEventType) => {
  const screenProps = {
    screen_name: event.name,
    screen_class: event.name,
    ...event.properties,
  };

  // logScreenView is deprecated in both the namespaced and modular APIs.
  // The typings of the 'screen_view' overload use the web parameter names
  // (firebase_screen), but the native SDKs read screen_name and screen_class,
  // which is what logScreenView forwarded. Keep the payload and cast the type.
  await logEvent(firebaseAnalytics, 'screen_view', screenProps as never);
};
