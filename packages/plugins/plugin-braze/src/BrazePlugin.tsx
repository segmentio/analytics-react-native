import {
  DestinationPlugin,
  IdentifyEventType,
  isNumber,
  isString,
  isBoolean,
  isDate,
  PluginType,
  TrackEventType,
  UserInfoState,
  isObject,
  objectToString,
} from '@segment/analytics-react-native';
import Braze, { GenderTypes, MonthsAsNumber } from '@braze/react-native-sdk';
import flush from './methods/flush';
import track from './methods/track';

export class BrazePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Appboy';
  private lastSeenTraits: UserInfoState | undefined;

  /**
   * Cleans up the attributes to only send valid values to Braze SDK
   * @param value value of any type
   * @returns value if type is valid, undefined if the type is not supported by Braze
   */
  private sanitizeAttribute = (
    value: unknown
  ): string | number | boolean | Date | string[] | null | undefined => {
    // All basic values
    if (
      value === null ||
      isNumber(value) ||
      isString(value) ||
      isBoolean(value) ||
      isDate(value)
    ) {
      return value;
    }

    // Arrays and objects we will attempt to serialize
    if (Array.isArray(value)) {
      return value.map((v) => {
        if (isObject(v)) {
          return objectToString(v) ?? '';
        }
        return `${v}`;
      });
    }

    if (isObject(value)) {
      return objectToString(value);
    }

    return undefined;
  };

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
      if (event.userId !== undefined && event.userId !== null) {
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
        const sanitized = this.sanitizeAttribute(value);
        if (sanitized !== undefined && appBoyTraits.indexOf(key) < 0) {
          Braze.setCustomUserAttribute(key, sanitized);
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
