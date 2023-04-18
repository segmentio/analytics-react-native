import { isObject } from '@segment/analytics-react-native';
import branch, { BranchEvent } from 'react-native-branch';
import { mapEventProps, Product, transformMap } from './parameterMapping';

function toJSONString(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export async function createBranchEventWithProps(
  eventName: string,
  eventProps: { [key: string]: unknown },
  isStandardBranchEvent: boolean
): Promise<BranchEvent> {
  const products =
    eventProps.product_id !== undefined
      ? transformMap.products([eventProps])
      : eventProps.products;
  const branchUniversalObjects = [] as unknown[];

  // for each product item, create a Branch Universal Object
  if (Array.isArray(products)) {
    for (const item of products as Product[]) {
      const product_id = item.contentMetadata.customMetadata.product_id;
      if (product_id !== undefined) {
        if (isStandardBranchEvent) {
          const buo = await branch.createBranchUniversalObject(
            product_id,
            item
          );
          branchUniversalObjects.push(buo);
        } else {
          eventProps.customData = {
            ...(isObject(eventProps.customData) ? eventProps.customData : {}),
            [product_id]: toJSONString(item),
          };
        }
      }
    }
  } else {
    // separate custom non-Branch entries before forwarding
    const customData = {} as { [key: string]: string };
    const branchData = {} as { [key: string]: unknown };
    for (const key in eventProps) {
      if (key in mapEventProps) branchData[key] = eventProps[key];
      customData[key] = toJSONString(eventProps[key]);
    }
    eventProps = {
      ...branchData,
      customData,
    };
  }
  return new BranchEvent(
    eventName,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore: Branch does not export the proper types for BranchUniversalObject so we can only use unknown
    isStandardBranchEvent ? branchUniversalObjects : undefined,
    eventProps
  );
}
