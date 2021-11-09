import type { TrackEventType } from '@segment/analytics-react-native';
import { generateMapTransform } from '@segment/analytics-react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';
import { mapEventProps, transformMap } from './parameterMapping';

// FB Event Names must be <= 40 characters
const MAX_CHARACTERS_EVENT_NAME = 40;
const mappedPropNames = generateMapTransform(mapEventProps, transformMap);

const sanitizeName = (name: string) => {
  //Facebook expects '_' instead of '.'
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
    _appVersion: event.context.app.version,
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
