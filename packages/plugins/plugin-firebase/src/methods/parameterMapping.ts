import { isString } from '@segment/analytics-react-native';

const mapEventNames: { [key: string]: string } = {
  'Product Clicked': 'select_content',
  'Product Viewed': 'view_item',
  'Product Added': 'add_to_cart',
  'Product Removed': 'remove_from_cart',
  'Checkout Started': 'begin_checkout',
  'Promotion Viewed': 'view_promotion',
  'Payment Info Entered': 'add_payment_info',
  'Order Completed': 'purchase',
  'Order Refunded': 'refund',
  'Product List Viewed': 'view_item_list',
  'Product Added to Wishlist': 'add_to_wishlist',
  'Product Shared': 'share',
  'Cart Shared': 'share',
  'Products Searched': 'search',
  'Cart Viewed': 'view_cart',
};

export const mapEventProps: { [key: string]: string } = {
  price: 'price',
  total: 'value',
  products: 'items',
  name: 'item_name',
  product_id: 'item_id',
  productId: 'item_id',
  category: 'item_category',
  query: 'search_term',
  order_id: 'transaction_id',
  quantity: 'quantity',
  shipping: 'shipping',
  tax: 'tax',
  revenue: 'revenue',
  currency: 'currency',
};

export const transformMap: { [key: string]: (value: unknown) => unknown } = {
  event: (value: unknown) => {
    if (isString(value) && value in mapEventNames) {
      return mapEventNames[value];
    }
    return value;
  },
};
