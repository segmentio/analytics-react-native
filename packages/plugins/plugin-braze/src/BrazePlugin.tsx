import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  TrackEventType,
  UserInfoState,
  SegmentAPISettings,
  UpdateType,
  JsonMap,
  SegmentBrazeSettings,
} from '@segment/analytics-react-native';
import Braze, { GenderTypes, MonthsAsNumber } from '@braze/react-native-sdk';
import flush from './methods/flush';
export class BrazePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Appboy';
  private lastSeenTraits: UserInfoState | undefined;
  private revenueEnabled = false;

  update(settings: SegmentAPISettings, _: UpdateType) {
    const brazeSettings = settings.integrations[
      this.key
    ] as SegmentBrazeSettings;
    if (brazeSettings.logPurchaseWhenRevenuePresent === true) {
      this.revenueEnabled = true;
    }
  }

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
    const eventName = event.event;
    const revenue = this.extractRevenue(event.properties, 'revenue');
    const attributionProperties = {
      network: '',
      campaign: '',
      adGroup: '',
      creative: '',
    };

    if (event.event === 'Install Attributed') {
      if (event.properties?.campaign) {
        const attributionData: any = event.properties.campaign;
        const network = attributionData.source ?? attributionProperties.network;
        const campaign = attributionData.name ?? attributionProperties.campaign;
        const adGroup =
          attributionData.ad_group ?? attributionProperties.adGroup;
        const creative =
          attributionData.ad_creative ?? attributionProperties.creative;
        Braze.setAttributionData(network, campaign, adGroup, creative);
      }
    }

    if (eventName === 'Order Completed' || eventName === 'Completed Order') {
      this.logPurchaseEvent(event);
    } else if (
      this.revenueEnabled === true &&
      revenue !== 0 &&
      revenue !== undefined
    ) {
      this.logPurchaseEvent(event);
    } else {
      Braze.logCustomEvent(eventName, event.properties);
    }
    return event;
  }

  flush() {
    flush();
  }

  extractRevenue(properties: JsonMap | undefined, key: string): number {
    if (!properties) {
      return 0;
    }
    const revenue = properties[key];
    if (revenue) {
      switch (typeof revenue) {
        case 'string':
          return parseFloat(revenue);
        case 'number':
          return revenue;
        default:
          return 0;
      }
    } else {
      return 0;
    }
  }

  logPurchaseEvent(event: TrackEventType) {
    // Make USD as the default currency.
    let currency = 'USD';
    const revenue = this.extractRevenue(event.properties, 'revenue');
    if (
      typeof event.properties?.currency === 'string' &&
      event.properties.currency.length === 3
    ) {
      currency = event.properties.currency;
    }
    if (event.properties) {
      const appBoyProperties = Object.assign({}, event.properties);
      delete appBoyProperties.currency;
      delete appBoyProperties.revenue;

      if (appBoyProperties.products) {
        const products = (appBoyProperties.products as any[]).slice(0);
        delete appBoyProperties.products;

        products.forEach((product) => {
          const productDict = Object.assign({}, product);
          const productId = productDict.product_id;
          const productRevenue = this.extractRevenue(productDict, 'price');
          const productQuantity = productDict.quantity;
          delete productDict.product_id;
          delete productDict.price;
          delete productDict.quantity;
          let productProperties = Object.assign(
            {},
            appBoyProperties,
            productDict
          );
          Braze.logPurchase(
            productId,
            String(productRevenue),
            currency,
            productQuantity,
            productProperties
          );
        });
      } else {
        Braze.logPurchase(
          event.event,
          String(revenue),
          currency,
          1,
          appBoyProperties
        );
      }
    } else {
      Braze.logPurchase(event.event, String(revenue), currency, 1);
    }
  }
}
