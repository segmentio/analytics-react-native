import { nanoid } from 'nanoid/non-secure';
import { NativeModules } from 'react-native';

export const getUUID = (): string => {
  // Currently the RN dev server does not allow to call synchronous methods via the bridge.
  // For that reason, we use nanoids in development and UUIDs (generated on the native side) in production.
  // More information at https://github.com/facebook/react-native/issues/26705
  if (__DEV__) {
    return nanoid();
  }
  return NativeModules.AnalyticsReactNative.getUUIDSync();
};
