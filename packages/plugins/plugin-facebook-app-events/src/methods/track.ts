import type { TrackEventType } from '@segment/analytics-react-native';

import { generateMapTransform } from '@segment/analytics-react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';

const mapEventNames = {
  'Application Installed': 'MOBILE_APP_INSTALL',
  'Application Opened': 'fb_mobile_activate_app',
  'Products Searched': 'fb_mobile_search',
  'Product Viewed': 'fb_mobile_content_view',
  'Payment Info Entered': 'fb_mobile_add_payment_info',
  'Order Completed': 'fb_mobile_purchase',
  'Product Added': 'fb_mobile_add_to_cart',
  'Product Added to Wishlist': 'fb_mobile_add_to_wishlist',
} as any;

const mapEventProps: { [key: string]: string } = {
  currency: 'fb_currency',
  revenue: '_valueToSum',
  price: '_valueToSum',
  id: 'fb_content_id',
  name: 'fb_description',
  product_id: 'fb_content_id',
  productId: 'fb_content_id',
  category: 'fb_content_type',
  query: 'fb_search_string',
  timestamp: '_logTime',
  quantity: 'fb_num_items',
} as any;

const transformMap: { [key: string]: (value: any) => any } = {
  event: (value: string) => {
    if (value in mapEventNames) {
      return mapEventNames[value];
    }
    return value;
  },
};

const mappedPropNames = generateMapTransform(mapEventProps, transformMap);

const sanitizeName = (name: string) => {
  //Facebook expects '_' instead of '.'
  // and only accepts 40 characters in Event Names
  let re = /\./gi;
  let sanitizedName = name.replace(re, '_');
  return sanitizedName.substring(0, 40);
};

const fbParams = (
  event: Record<string, any>
): { [key: string]: string | number } => {
  let productCount = 0;
  let products = event.properties.products || [];
  let params = {};

  Object.keys(
    event.properties.forEach((property: string) => {
      if (property === 'fb_num_items') {
        productCount = event.properties.fb_num_items;
      } else if (property in mapEventNames) {
        params = {
          ...params,
          [property]: event.properties[property],
        };
      }
    })
  );

  if (products.length) {
    products.forEach((product: any) => {
      productCount++;
      return product;
    });
  }

  return {
    ...params,
    fb_num_items: productCount,
    _logTime: event.timestamp,
    _appVersion: event.device.version,
  };
};

export default async (event: TrackEventType) => {
  const safeEvent = mappedPropNames(event);
  let convertedName = safeEvent.event as string;
  let safeName = sanitizeName(convertedName);
  let safeProps = fbParams(safeEvent);
  let currency = 'USD';
  if (Object.values(safeProps).includes('fb_currency')) {
    currency = safeProps.fb_currency as string;
  }
  if (Object.values(safeProps).includes('_valueToSum')) {
    let purchasePrice = safeProps.price as number;

    AppEventsLogger.logPurchase(purchasePrice, currency, safeProps);
  } else {
    AppEventsLogger.logEvent(safeName, safeProps);
  }
};
