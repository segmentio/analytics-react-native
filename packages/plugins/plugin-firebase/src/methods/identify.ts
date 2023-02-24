import type { IdentifyEventType } from '@segment/analytics-react-native';
import firebaseAnalytics from '@react-native-firebase/analytics';

export default async (event: IdentifyEventType) => {
  if (event.userId !== undefined) {
    await firebaseAnalytics().setUserId(event.userId!);
  }
  if (event.traits) {
    let eventTraits = event.traits;
    let safeTraits: Record<string, string>;

    const checkType = (value: any) => {
      return typeof value === 'object' && !Array.isArray(value);
    };
    safeTraits = Object.keys(eventTraits).reduce(
      (acc: Record<string, string>, trait) => {
        if (checkType(eventTraits[trait])) {
          console.log(
            'We detected an object or array data type. Firebase does not accept nested traits.'
          );
        }
        if (trait !== undefined) {
          acc[trait] = eventTraits[trait]!.toString();
        }
        return acc;
      },
      {}
    );

    await firebaseAnalytics().setUserProperties(safeTraits);
  }
};
