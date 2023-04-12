import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  ScreenEventType,
  SegmentError,
  TrackEventType,
} from '@segment/analytics-react-native';
import screen from './methods/screen';
import track from './methods/track';
import reset from './methods/reset';
import firebaseAnalytics from '@react-native-firebase/analytics';
import { ErrorType } from '../../../core/src/errors';

export class FirebasePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Firebase';

  async identify(event: IdentifyEventType) {
    if (event.userId !== undefined) {
      await firebaseAnalytics().setUserId(event.userId);
    }
    if (event.traits) {
      const eventTraits = event.traits;

      const checkType = (value: unknown) => {
        return typeof value === 'object' && !Array.isArray(value);
      };
      const safeTraits = Object.keys(eventTraits).reduce(
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

  async track(event: TrackEventType) {
    try {
      await track(event);
    } catch (error) {
      this.analytics?.reportInternalError(
        new SegmentError(
          ErrorType.PluginError,
          'Error on Firebase Track',
          error
        )
      );
    }
    return event;
  }

  async screen(event: ScreenEventType) {
    try {
      await screen(event);
    } catch (error) {
      this.analytics?.reportInternalError(
        new SegmentError(
          ErrorType.PluginError,
          'Error on Firebase Track',
          error
        )
      );
    }
    return event;
  }

  async reset() {
    try {
      await reset();
    } catch (error) {
      this.analytics?.reportInternalError(
        new SegmentError(
          ErrorType.PluginError,
          'Error on Firebase Track',
          error
        )
      );
    }
  }
}
