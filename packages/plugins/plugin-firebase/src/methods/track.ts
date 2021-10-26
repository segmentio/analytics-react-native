import firebaseAnalytics from '@react-native-firebase/analytics';
import type { TrackEventType } from '@segment/analytics-react-native';

const mapEventNames = {
  'Product Clicked': 'select_content',
  'Product Viewed': 'view_item',
  'Product Added': 'add_to_cart',
  'Product Removed': 'remove_from_cart',
  'Checkout Started': 'begin_checkout',
  'Promotion Viewed': 'present_offer',
  'Payment Info Entered': 'add_payment_info',
  'Order Completed': 'ecommerce_purchase',
  'Order Refunded': 'purchase_refund',
  'Product List Viewed': 'view_item_list',
  'Product Added to Wishlist': 'add_to_wishlist',
  'Product Shared': 'share',
  'Cart Shared': 'share',
  'Products Searched': 'search',
} as any;

export default async (event: TrackEventType) => {
  const safeEventName =
    mapEventNames[event.event] || event.event.replace(/[^a-zA-Z0-9]/g, '_');
  await firebaseAnalytics().logEvent(safeEventName, event.properties);
};
