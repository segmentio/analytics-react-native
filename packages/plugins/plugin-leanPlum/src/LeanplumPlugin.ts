import {
  DestinationPlugin,
  PluginType,
  TrackEventType,
  ScreenEventType,
  IdentifyEventType,
  generateMapTransform,
} from '@segment/analytics-react-native';

import { mapTraits, transformMap } from './parameterMapping';
import { Leanplum } from '@leanplum/react-native-sdk';
const mappedTraits = generateMapTransform(mapTraits, transformMap);

export class LeanplumPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Leanplum';

  identify(event: IdentifyEventType) {
    const traits = event.traits as Record<string, unknown>;
    const safeTraits = mappedTraits(traits);
    const userId = event.userId ?? event.anonymousId;

    if (
      safeTraits.DOB !== undefined &&
      safeTraits.DOB !== null &&
      !(safeTraits.DOB instanceof Date)
    ) {
      if (
        typeof safeTraits.DOB === 'string' ||
        typeof safeTraits.DOB === 'number'
      ) {
        const birthday = new Date(safeTraits.DOB);
        if (
          birthday !== undefined &&
          birthday !== null &&
          !isNaN(birthday.getTime())
        ) {
          safeTraits.DOB = birthday;
        }
      } else {
        delete safeTraits.DOB;

        this.analytics?.logger.warn(
          `Birthday found "${event.traits?.birthday}" could not be parsed as a Date. Try converting to ISO format.`
        );
      }
    }
    const leanplumTraits: Record<string, Date | string | number | boolean> = {};
    for (const key in safeTraits) {
      const value = safeTraits[key];
      if (
        value instanceof Date ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        leanplumTraits[key] = value;
      } else {
        // Handle other types if necessary, or exclude them
        leanplumTraits[key] = String(value); // Convert other types to string as a fallback
      }
    }

    // Ensure userId is a string
    if (userId) {
      leanplumTraits.userId = userId;
    }

    Leanplum.setUserAttributes(leanplumTraits);
    return event;
  }

  track(event: TrackEventType) {

    if (event.event === 'Order Completed') {
      const userId = event.userId ?? event.anonymousId;
      const {
        revenue = '0',
        currency = 'USD',
        products = {},
        ...props
      } = event.properties ?? {};
      const sanitizedRevenue =
        typeof revenue === 'string' ? parseFloat(revenue) : 0;
      const sanitizedCurrency = typeof currency === 'string' ? currency : 'USD';
      const chargeDetails: Record<string, Date | string | number | boolean> =
        {};
      for (const key in props) {
        const value = props[key];
        if (
          value instanceof Date ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          chargeDetails[key] = value;
        } else {
          chargeDetails[key] = String(value);
        }
      }
      if (userId) {
        chargeDetails.Identity = userId;
      }
      if(products) {
        chargeDetails.products = JSON.stringify(products);
      }

      Leanplum.trackPurchase(
        sanitizedRevenue,
        sanitizedCurrency,
        chargeDetails,
        event.event
      );
    } else {
      const propertiesParams = event.properties ?? {};
      const sanitizedProperties: Record<
        string,
        Date | string | number | boolean
      > = {};
      for (const key in propertiesParams) {
        const value = propertiesParams[key];
        if (
          value instanceof Date ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          sanitizedProperties[key] = value;
        } else {
          sanitizedProperties[key] = String(value);
        }
      }

      Leanplum.track(event.event, sanitizedProperties);
    }
    return event;
  }

  screen(event: ScreenEventType) {
    const screenName = event.name ?? 'Screen Viewed';
    const userId = event.userId ?? event.anonymousId;
    const properties = event.properties ?? {};
  
    const screenProps: Record<string, Date | string | number | boolean> = {};
    for (const key in properties) {
      const value = properties[key];
      if (value instanceof Date || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        screenProps[key] = value;
      } else {
        screenProps[key] = String(value); 
      }
    }  
    if (userId) {
      screenProps.userId = userId;
    }
    Leanplum.advanceTo(screenName, undefined, screenProps)
    return event;
  }
}
