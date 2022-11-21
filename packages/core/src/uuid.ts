import { getNativeModule } from './util';

export const getUUID = (): string => {
  //returns a string in DEV to avoid native modules
  //and to work with chrome debugging tools
  if (__DEV__) {
    return 'DEV-UUID';
  }

  return getNativeModule('AnalyticsReactNative')?.getUUIDSync() ?? '';
};
