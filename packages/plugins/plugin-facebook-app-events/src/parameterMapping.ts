import { isString } from '@segment/analytics-react-native';

export const mapEventNames: Record<string, string> = {
  'Application Installed': 'MOBILE_APP_INSTALL',
  'Application Opened': 'fb_mobile_activate_app',
  'Products Searched': 'fb_mobile_search',
  'Product Viewed': 'fb_mobile_content_view',
  'Payment Info Entered': 'fb_mobile_add_payment_info',
  'Order Completed': 'fb_mobile_purchase',
  'Product Added': 'fb_mobile_add_to_cart',
  'Product Added to Wishlist': 'fb_mobile_add_to_wishlist',
  'Checkout Started': 'fb_mobile_initiated_checkout',
};

export const mapEventProps: { [key: string]: string } = {
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
};

export const transformMap: { [key: string]: (value: unknown) => unknown } = {
  event: (value: unknown): unknown => {
    if (isString(value) && value in mapEventNames) {
      return mapEventNames[value];
    }
    return value;
  },
  // LogTime in FBSDK accepts a Long or undefined
  _logTime: (value: unknown): number | undefined => {
    if (isString(value)) {
      const date = Date.parse(value);
      if (!isNaN(date)) {
        return Math.floor(date / 1000);
      }
    }
    return;
  },
};
