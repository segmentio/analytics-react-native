import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  TrackEventType,
  UserInfoState,
} from '@segment/analytics-react-native';
import Braze, { GenderTypes, MonthsAsNumber } from '@braze/react-native-sdk';
import flush from './methods/flush';
import track from './methods/track';

export class BrazePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Appboy';
  private lastSeenTraits: UserInfoState | undefined;

  identify(event: IdentifyEventType) {
    //check to see if anything has changed.
    //if it hasn't changed don't send event
    if (
      this.lastSeenTraits?.userId === event.userId &&
      this.lastSeenTraits?.anonymousId === event.anonymousId &&
      this.lastSeenTraits?.traits === event.traits
    ) {
      return;
    } else {
      if (event.userId) {
        Braze.changeUser(event.userId);
      }

      if (event.traits?.birthday !== undefined) {
        const birthday = new Date(event.traits.birthday);
        if (
          birthday !== undefined &&
          birthday !== null &&
          !isNaN(birthday.getTime())
        ) {
          const data = new Date(event.traits.birthday);
          Braze.setDateOfBirth(
            data.getFullYear(),
            // getMonth is zero indexed
            (data.getMonth() + 1) as MonthsAsNumber,
            data.getDate()
          );
        } else {
          this.analytics?.logger.warn(
            `Birthday found "${event.traits?.birthday}" could not be parsed as a Date. Try converting to ISO format.`
          );
        }
      }

      if (event.traits?.email !== undefined) {
        Braze.setEmail(event.traits.email);
      }

      if (event.traits?.firstName !== undefined) {
        Braze.setFirstName(event.traits.firstName);
      }

      if (event.traits?.lastName !== undefined) {
        Braze.setLastName(event.traits.lastName);
      }

      if (event.traits?.gender !== undefined) {
        const validGenders = ['m', 'f', 'n', 'o', 'p', 'u'];
        const isValidGender = validGenders.indexOf(event.traits.gender) > -1;
        if (isValidGender) {
          Braze.setGender(
            event.traits.gender as GenderTypes[keyof GenderTypes]
          );
        }
      }

      if (event.traits?.phone !== undefined) {
        Braze.setPhoneNumber(event.traits.phone);
      }

      if (event.traits?.address !== undefined) {
        if (event.traits.address.city !== undefined) {
          Braze.setHomeCity(event.traits.address.city);
        }
        if (event.traits?.address.country !== undefined) {
          Braze.setCountry(event.traits.address.country);
        }
      }

      const appBoyTraits = [
        'birthday',
        'email',
        'firstName',
        'lastName',
        'gender',
        'phone',
        'address',
      ];

      Object.entries(event.traits ?? {}).forEach(([key, value]) => {
        if (appBoyTraits.indexOf(key) < 0) {
          Braze.setCustomUserAttribute(key, value as any);
        }
      });

      this.lastSeenTraits = {
        anonymousId: event.anonymousId ?? '',
        userId: event.userId,
        traits: event.traits,
      };
    }
    return event;
  }

  track(event: TrackEventType) {
    track(event);
    return event;
  }

  flush() {
    flush();
  }
}
