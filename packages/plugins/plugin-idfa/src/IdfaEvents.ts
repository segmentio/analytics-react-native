import { NativeModules, NativeEventEmitter } from 'react-native';

export const IdfaEvents = new NativeEventEmitter(
  NativeModules.AnalyticsReactNativePluginIdfa
);
