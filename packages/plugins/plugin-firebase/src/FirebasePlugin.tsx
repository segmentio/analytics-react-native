import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  ScreenEventType,
  TrackEventType,
} from '@segment/analytics-react-native';
import screen from './methods/screen';
import track from './methods/track';
import reset from './methods/reset';
import firebaseAnalytics from '@react-native-firebase/analytics';

export class FirebasePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Firebase';

  async identify(event: IdentifyEventType) {
    if (event.userId !== undefined) {
      await firebaseAnalytics().setUserId(event.userId!);
    }
    if (event.traits) {
      let eventTraits = event.traits;
      let safeTraits: Record<string, string>;

      const checkType = (value: unknown) => {
        return typeof value === 'object' && !Array.isArray(value);
      };
      safeTraits = Object.keys(eventTraits).reduce(
        (acc: Record<string, string>, trait) => {
          if (checkType(eventTraits[trait])) {
            this.analytics?.logger.warn(
              'We detected an object or array data type. Firebase does not accept nested traits.'
            );

            return acc;
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
    return event;
  }

  track(event: TrackEventType) {
    track(event);
    return event;
  }

  screen(event: ScreenEventType) {
    screen(event);
    return event;
  }

  reset() {
    reset();
  }
}
