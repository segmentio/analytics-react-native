import type { SegmentAdjustSettings } from '@segment/analytics-react-native';

export const mappedCustomEventToken = (
  eventName: string,
  settings: SegmentAdjustSettings
) => {
  let result = null;
  const tokens = settings?.customEvents;
  if (tokens) {
    result = tokens[eventName];
  }
  return result;
};

export const extract = <T>(
  key: string,
  properties: { [key: string]: unknown },
  defaultValue: T | null = null
) => {
  let result = defaultValue;
  Object.entries(properties).forEach(([propKey, propValue]) => {
    // not sure if this comparison is actually necessary,
    // but existed in the old destination so ...
    if (key.toLowerCase() === propKey.toLowerCase()) {
      result = propValue as T;
    }
  });
  return result;
};
