import branch, { BranchEvent } from 'react-native-branch';
import { mapEventProps, transformMap } from './parameterMapping';

function toJSONString(value: any): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export async function createBranchEventWithProps(
  eventName: string,
  eventProps: { [key: string]: any },
  isStandardBranchEvent: boolean
): Promise<BranchEvent> {
  const products = eventProps.product_id
    ? transformMap.products([eventProps])
    : eventProps.products;
  const branchUniversalObjects = [] as any[];

  // for each product item, create a Branch Universal Objet
  if (Array.isArray(products)) {
    for (const item of products) {
      const product_id = item.contentMetadata.customMetadata.product_id;
      if (isStandardBranchEvent) {
        const buo = await branch.createBranchUniversalObject(product_id, item);
        branchUniversalObjects.push(buo);
      } else {
        eventProps.customData = {
          ...eventProps.customData,
          [product_id]: toJSONString(item),
        };
      }
    }
  } else {
    // separate custom non-Branch entries before forwarding
    const customData = {} as { [key: string]: string };
    const branchData = {} as { [key: string]: any };
    for (const key in eventProps) {
      if (key in mapEventProps) branchData[key] = eventProps[key];
      customData[key] = toJSONString(eventProps[key]);
    }
    eventProps = {
      ...branchData,
      customData,
    };
  }
  console.log('COUCOU - createBranchEvent', eventName, eventProps);
  return new BranchEvent(
    eventName,
    isStandardBranchEvent ? branchUniversalObjects : undefined,
    eventProps
  );
}
