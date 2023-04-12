/**
 * This module is just here to have a way to mock the Native Module of IDFA with Detox
 */
import { NativeModules, Platform } from 'react-native';
import type { IdfaData } from './types';

export type IDFANativeModule = {
  getTrackingAuthorizationStatus: () => Promise<IdfaData>;
};

export const AnalyticsReactNativePluginIdfa = Platform.select({
  default: {
    getTrackingAuthorizationStatus: async () => {
      return Promise.reject('IDFA is only supported on iOS');
    },
  },
  ios: NativeModules.AnalyticsReactNativePluginIdfa as unknown as IDFANativeModule,
});
