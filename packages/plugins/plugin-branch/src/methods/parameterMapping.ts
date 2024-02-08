import { BranchEvent } from 'react-native-branch';
import { isNumber, isObject } from '@segment/analytics-react-native';

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

export interface Product {
  canonicalUrl: string;
  contentImageUrl: string;
  contentMetadata: {
    [key: string]: string | number;
  } & {
    customMetadata: {
      product_id?: string;
    };
  };
}

const sanitizeValue = (value: unknown): string | number => {
  if (isNumber(value)) {
    return value;
  } else {
    return `${value}`;
  }
};

const onlyStrings = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  return `${value.toString()}`;
};

export const transformMap: { [key: string]: (value: unknown) => unknown } = {
  event: (value: unknown) => {
    if (typeof value === 'string' && value in mapEventNames) {
      return mapEventNames[value];
    }
    return value;
  },
  products: (value: unknown) => {
    const prods: Product[] = [];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!isObject(item)) {
          continue;
        }

        const data = {} as { [key: string]: string | number };
        for (const key in mapProductProps) {
          const newKey = mapProductProps[key];
          if (key in item) {
            data[newKey] = sanitizeValue(item[key]);
          }
        }
        const { contentImageUrl, canonicalUrl, ...contentMetadata } = data;
        prods.push({
          canonicalUrl,
          contentImageUrl,
          contentMetadata: {
            ...contentMetadata,
            customMetadata: {
              product_id: onlyStrings(item.product_id),
            },
          },
        } as Product);
      }
      return prods;
    }
    return value;
  },
};
