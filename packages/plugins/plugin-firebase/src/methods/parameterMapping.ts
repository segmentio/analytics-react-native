const mapEventNames = {
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
} as any;

export const mapEventProps: { [key: string]: string } = {
  price: 'price',
  total: 'value',
  products: 'items',
  name: 'item_name',
  product_id: 'item_id',
  productId: 'item_id',
  category: 'item_category',
  query: 'search_term',
} as any;

export const transformMap: { [key: string]: (value: any) => any } = {
  event: (value: string) => {
    if (value in mapEventNames) {
      return mapEventNames[value];
    }
    return value;
  },
};
