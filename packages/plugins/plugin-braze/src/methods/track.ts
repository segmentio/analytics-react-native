import Braze from '@braze/react-native-sdk';
import {
  isNumber,
  isObject,
  JsonMap,
  TrackEventType,
} from '@segment/analytics-react-native';
import { unknownToString } from '../../../../core/src/util';

interface AttributionProperties {
  network: string;
  campaign: string;
  adGroup: string;
  creative: string;
}

const defaultProperties: AttributionProperties = {
  network: '',
  campaign: '',
  adGroup: '',
  creative: '',
};

export default (payload: TrackEventType) => {
  if (payload.event === 'Install Attributed') {
    if (
      payload.properties?.campaign !== undefined &&
      payload.properties?.campaign !== null
    ) {
      const attributionData: unknown = payload.properties.campaign;
      let network: string, campaign: string, adGroup: string, creative: string;

      if (isObject(attributionData)) {
        network =
          unknownToString(attributionData.source, true, undefined, undefined) ??
          defaultProperties.network;
        campaign =
          unknownToString(attributionData.name, true, undefined, undefined) ??
          defaultProperties.campaign;
        adGroup =
          unknownToString(
            attributionData.ad_group,
            true,
            undefined,
            undefined
          ) ?? defaultProperties.adGroup;
        creative =
          unknownToString(
            attributionData.ad_creative,
            true,
            undefined,
            undefined
          ) ?? defaultProperties.creative;
      } else {
        network = defaultProperties.network;
        campaign = defaultProperties.campaign;
        adGroup = defaultProperties.adGroup;
        creative = defaultProperties.creative;
      }
      Braze.setAttributionData(network, campaign, adGroup, creative);
    }
  }

  const revenue = extractRevenue(payload.properties, 'revenue');
  if (revenue || payload.event === 'Order Completed') {
    // Make USD as the default currency.
    let currency = 'USD';
    if (
      typeof payload.properties?.currency === 'string' &&
      payload.properties.currency.length === 3
    ) {
      currency = payload.properties.currency;
    }
    if (payload.properties) {
      const appBoyProperties = Object.assign({}, payload.properties);
      delete appBoyProperties.currency;
      delete appBoyProperties.revenue;

      if (
        appBoyProperties.products !== undefined &&
        appBoyProperties.products !== null
      ) {
        const products = (appBoyProperties.products as unknown[]).slice(0);
        delete appBoyProperties.products;

        products.forEach((product) => {
          const productDict = Object.assign(
            {},
            isObject(product) ? product : {}
          );
          const productId =
            unknownToString(
              productDict.productId,
              true,
              undefined,
              undefined
            ) ?? '';
          const productRevenue = extractRevenue(
            productDict as unknown as JsonMap,
            'price'
          );
          const productQuantity = isNumber(productDict.quantity)
            ? productDict.quantity
            : 1;
          delete productDict.productId;
          delete productDict.price;
          delete productDict.quantity;
          const productProperties = Object.assign(
            {},
            appBoyProperties,
            productDict
          );
          Braze.logPurchase(
            unknownToString(productId) ?? '',
            String(productRevenue),
            currency,
            productQuantity,
            productProperties
          );
        });
      } else {
        Braze.logPurchase(
          payload.event,
          String(revenue),
          currency,
          1,
          appBoyProperties
        );
      }
    } else {
      Braze.logPurchase(payload.event, String(revenue), currency, 1);
    }
  } else {
    Braze.logCustomEvent(payload.event, payload.properties);
  }

  return payload;
};

const extractRevenue = (properties: JsonMap | undefined, key: string) => {
  if (!properties) {
    return 0;
  }

  const revenue = properties[key];
  if (revenue !== undefined && revenue !== null) {
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
};
