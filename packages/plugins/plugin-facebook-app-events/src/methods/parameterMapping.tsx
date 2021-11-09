export const mapEventNames = {
  'Application Installed': 'MOBILE_APP_INSTALL',
  'Application Opened': 'fb_mobile_activate_app',
  'Products Searched': 'fb_mobile_search',
  'Product Viewed': 'fb_mobile_content_view',
  'Payment Info Entered': 'fb_mobile_add_payment_info',
  'Order Completed': 'fb_mobile_purchase',
  'Product Added': 'fb_mobile_add_to_cart',
  'Product Added to Wishlist': 'fb_mobile_add_to_wishlist',
} as any;

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
} as any;

export const transformMap: { [key: string]: (value: any) => any } = {
  event: (value: string) => {
    if (value in mapEventNames) {
      return mapEventNames[value];
    }
    return value;
  },
};
