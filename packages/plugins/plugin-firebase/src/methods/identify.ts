import type { IdentifyEventType } from '@segment/analytics-react-native';
import firebaseAnalytics from '@react-native-firebase/analytics';

export default async (event: IdentifyEventType) => {
  if (event.userId !== undefined) {
    await firebaseAnalytics().setUserId(event.userId!);
  }
  if (event.traits) {
    let eventTraits = event.traits;
    let safeTraits = Object.keys(eventTraits).reduce((acc: any, trait) => {
      if (!acc[trait]) {
        acc[trait] = eventTraits[trait]?.toString();
      }
      return acc;
    }, {});
    await firebaseAnalytics().setUserProperties(safeTraits);
  }
};
