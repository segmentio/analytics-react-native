import { NativeModules } from 'react-native';
import { libraryInfo } from './info';

import type {
  Context,
  ContextDevice,
  NativeContextInfo,
  UserTraits,
} from './types';
import { warnMissingNativeModule } from './util';

interface GetContextConfig {
  collectDeviceId?: boolean;
}
export const getContext = async (
  userTraits: UserTraits = {},
  config: GetContextConfig = {}
): Promise<Context> => {
  const { AnalyticsReactNative } = NativeModules;
  let context: Context;
  if (AnalyticsReactNative) {
    const {
      appName,
      appVersion,
      buildNumber,
      bundleId,
      locale,
      networkType,
      osName,
      osVersion,
      screenHeight,
      screenWidth,
      timezone,
      manufacturer,
      model,
      deviceName,
      deviceId,
      deviceType,
      screenDensity,
    }: NativeContextInfo = await AnalyticsReactNative.getContextInfo(config);

    const device: ContextDevice = {
      id: deviceId,
      manufacturer: manufacturer,
      model: model,
      name: deviceName,
      type: deviceType,
    };

    context = {
      app: {
        build: buildNumber,
        name: appName,
        namespace: bundleId,
        version: appVersion,
      },
      device,
      library: {
        name: libraryInfo.name,
        version: libraryInfo.version,
      },
      locale,
      network: {
        cellular: networkType === 'cellular',
        wifi: networkType === 'wifi',
      },
      os: {
        name: osName,
        version: osVersion,
      },
      screen: {
        width: screenWidth,
        height: screenHeight,
        density: screenDensity,
      },
      timezone,
      traits: userTraits,
    };
  } else {
    warnMissingNativeModule();
    context = {
      app: {
        build: '',
        name: '',
        namespace: '',
        version: '',
      },
      device: {
        id: '',
        manufacturer: '',
        model: '',
        name: '',
        type: '',
      },
      library: {
        name: '',
        version: '',
      },
      locale: '',
      network: {
        cellular: false,
        wifi: false,
      },
      os: {
        name: '',
        version: '',
      },
      screen: {
        width: 0,
        height: 0,
        density: 0,
      },
      timezone: '',
      traits: {},
    };
  }
  return context;
};
