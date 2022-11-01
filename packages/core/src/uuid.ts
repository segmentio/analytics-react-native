import { getNativeModule } from './util';

export const getUUID = (): string => {
  return getNativeModule('AnalyticsReactNative')?.getUUIDSync() ?? '';
};
