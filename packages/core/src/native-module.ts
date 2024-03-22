import { NativeContextInfo } from './types';
import {
  NativeEventEmitter,
  NativeModule,
  NativeModules,
  Platform,
  TurboModule,
} from 'react-native';

export const warnMissingNativeModule = () => {
  const MISSING_NATIVE_MODULE_WARNING =
    "The package 'analytics-react-native' can't access a custom native module. Make sure: \n\n" +
    Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
    '- You rebuilt the app after installing the package\n' +
    '- You are not using Expo managed workflow\n';
  console.warn(MISSING_NATIVE_MODULE_WARNING);
};

export const getNativeModule = (moduleName: string) => {
  const module =
    (NativeModules[moduleName] as NativeModule & TurboModule) ?? undefined;
  if (module === undefined) {
    warnMissingNativeModule();
  }
  return module;
};

// Native Module types
export interface GetContextConfig {
  collectDeviceId: boolean;
}

export interface AnalyticsReactNativeModuleConstants {
  SET_ANONYMOUS_ID: string;
  SET_DEEPLINK: string;
}

export type AnalyticsReactNativeModuleType = NativeModule &
  TurboModule & {
    getContextInfo: (config: GetContextConfig) => Promise<NativeContextInfo>;
  };

export const AnalyticsReactNativeModule = (() => {
  const nativeModule = getNativeModule('AnalyticsReactNative');

  if (nativeModule === undefined) {
    warnMissingNativeModule();
    return;
  }
  return nativeModule as AnalyticsReactNativeModuleType;
})();

export const AnalyticsReactNativeModuleEmitter =
  AnalyticsReactNativeModule !== undefined
    ? new NativeEventEmitter(AnalyticsReactNativeModule)
    : undefined;

export const AnalyticsReactNativeModuleEvents =
  (AnalyticsReactNativeModule?.getConstants?.() ?? {
    SET_ANONYMOUS_ID: 'add-anonymous-id',
    SET_DEEPLINK: 'add-deepLink-data',
  }) as AnalyticsReactNativeModuleConstants;
