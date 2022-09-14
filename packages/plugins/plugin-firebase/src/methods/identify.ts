import type { IdentifyEventType } from '@segment/analytics-react-native';
import firebaseAnalytics from '@react-native-firebase/analytics';

export default async (event: IdentifyEventType) => {
  if (event.userId !== undefined) {
    await firebaseAnalytics().setUserId(event.userId!);
  }
  if (event.traits) {
    await firebaseAnalytics().setUserProperties(event.traits as any);
  }
};
