import { NativeModules } from 'react-native';
import packageJson from '../package.json';

import type {
  Context,
  ContextDevice,
  NativeContextInfo,
  UserTraits,
} from './types';

interface GetContextConfig {
  collectDeviceId?: boolean;
}
export const getContext = async (
  userTraits: UserTraits = {},
  config: GetContextConfig = {}
): Promise<Context> => {
  const { AnalyticsReactNative } = NativeModules;

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

  return {
    app: {
      build: buildNumber,
      name: appName,
      namespace: bundleId,
      version: appVersion,
    },
    device,
    library: {
      name: packageJson.name,
      version: packageJson.version,
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
};
