import { BranchEvent } from 'react-native-branch';

export const mapEventNames: { [key: string]: string } = {
  'Product Clicked': BranchEvent.ViewItem,
  'Product Viewed': BranchEvent.ViewItem,
  'Product Added': BranchEvent.AddToCart,
  'Product Reviewed': BranchEvent.Rate,
  'Checkout Started': BranchEvent.InitiatePurchase,
  'Promotion Viewed': BranchEvent.ViewAd,
  'Payment Info Entered': BranchEvent.AddPaymentInfo,
  'Order Completed': BranchEvent.Purchase,
  'Product List Viewed': BranchEvent.ViewItems,
  'Product Added to Wishlist': BranchEvent.AddToWishlist,
  'Product Shared': BranchEvent.Share,
  'Cart Shared': BranchEvent.Share,
  'Products Searched': BranchEvent.Search,
};

export const mapEventProps: { [key: string]: string } = {
  order_id: 'transactionID',
  affilation: 'affiliation',
  currency: 'currency',
  revenue: 'revenue',
  coupon: 'coupon',
  shipping: 'shipping',
  tax: 'tax',
  query: 'searchQuery',
};

export const mapProductProps: { [key: string]: string } = {
  sku: 'sku',
  name: 'productName',
  brand: 'productBrand',
  category: 'productCategory',
  variant: 'productVariant',
  quantity: 'quantity',
  price: 'price',
  image_url: 'contentImageUrl',
  url: 'canonicalUrl',
};

export const transformMap: { [key: string]: (value: any) => any } = {
  event: (value: string) => {
    if (value in mapEventNames) {
      return mapEventNames[value];
    }
    return value;
  },
  products: (value: Record<string, any>[]) => {
    return value.map((item) => {
      const data = {} as { [key: string]: string | number };
      for (const key in mapProductProps) {
        const newKey = mapProductProps[key];
        if (key in item) data[newKey] = item[key];
      }
      const { contentImageUrl, canonicalUrl, ...contentMetadata } = data;
      return {
        canonicalUrl,
        contentImageUrl,
        contentMetadata: {
          ...contentMetadata,
          customMetadata: {
            product_id: item.product_id,
          },
        },
      };
    });
  },
};
