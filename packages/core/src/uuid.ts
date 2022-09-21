import { nanoid } from 'nanoid/non-secure';
import { NativeModules } from 'react-native';
import { warnMissingNativeModule } from './util';

export const getUUID = (): string => {
  // Currently the RN dev server does not allow to call synchronous methods via the bridge.
  // For that reason, we use nanoids in development and UUIDs (generated on the native side) in production.
  // More information at https://github.com/facebook/react-native/issues/26705
  if (__DEV__) {
    return nanoid();
  }
  let uuid = '';
  if (NativeModules.AnalyticsReactNative) {
    uuid = NativeModules.AnalyticsReactNative.getUUIDSync();
  } else warnMissingNativeModule();
  return uuid;
};
