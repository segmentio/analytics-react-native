import type { SegmentAdjustSettings } from '../../../core/src/types';

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
  properties: { [key: string]: any },
  defaultValue: T | null = null
) => {
  let result = defaultValue;
  if (!properties) {
    return result;
  }
  Object.entries(properties).forEach(([propKey, propValue]) => {
    // not sure if this comparison is actually necessary,
    // but existed in the old destination so ...
    if (key.toLowerCase() === propKey.toLowerCase()) {
      result = propValue;
    }
  });
  return result;
};
