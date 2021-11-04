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

const MAX_CHARACTERS_EVENT_NAME = 40;

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

  let sanitizedName = name.replace('.', '_');
  return sanitizedName.substring(0, MAX_CHARACTERS_EVENT_NAME);
};

const sanitizeEvent = (
  event: Record<string, any>
): { [key: string]: string | number } => {
  let products = event.properties.products ?? [];
  const productCount = (event.properties.fb_num_items || products.length) ?? 0;
  let params: { [key: string]: string | number } = {};

  Object.keys(event.properties).forEach((property: string) => {
    if (property in Object.values(mapEventProps)) {
      params = params[property] = event.properties[property];
    }
  });

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
  let safeProps = sanitizeEvent(safeEvent);
  const currency = (safeProps.fb_currency as string | undefined) ?? 'USD';

  if (safeProps._valueToSum !== undefined) {
    let purchasePrice = safeProps.price as number;

    AppEventsLogger.logPurchase(purchasePrice, currency, safeProps);
  } else {
    AppEventsLogger.logEvent(safeName, safeProps);
  }
};
