import Braze from '@braze/react-native-sdk';
import type { TrackEventType, JsonMap } from '@segment/analytics-react-native';

const attributionProperties = {
  network: '',
  campaign: '',
  adGroup: '',
  creative: '',
};

export default (payload: TrackEventType) => {
  if (payload.event === 'Install Attributed') {
    if (payload.properties?.campaign) {
      const attributionData: any = payload.properties.campaign;
      const network = attributionData.source ?? attributionProperties.network;
      const campaign = attributionData.name ?? attributionProperties.campaign;
      const adGroup = attributionData.ad_group ?? attributionProperties.adGroup;
      const creative =
        attributionData.ad_creative ?? attributionProperties.creative;
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

      if (appBoyProperties.products) {
        const products = (appBoyProperties.products as any[]).slice(0);
        delete appBoyProperties.products;

        products.forEach((product) => {
          const productDict = Object.assign({}, product);
          const productId = productDict.product_id;
          const productRevenue = extractRevenue(productDict, 'price');
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
};
