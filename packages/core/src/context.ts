import { libraryInfo } from './info';

import type {
  Context,
  ContextDevice,
  NativeContextInfo,
  UserTraits,
} from './types';
import { getNativeModule } from './util';
import { getUUID } from './uuid';

interface GetContextConfig {
  collectDeviceId?: boolean;
}

const defaultContext = {
  appName: '',
  appVersion: '',
  buildNumber: '',
  bundleId: '',
  locale: '',
  networkType: '',
  osName: '',
  osVersion: '',
  screenHeight: 0,
  screenWidth: 0,
  timezone: '',
  manufacturer: '',
  model: '',
  deviceName: '',
  deviceId: '',
  deviceType: '',
  screenDensity: 0,
};

export const getContext = async (
  userTraits: UserTraits = {},
  config: GetContextConfig = {}
): Promise<Context> => {
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
  }: NativeContextInfo =
    (await getNativeModule('AnalyticsReactNative')?.getContextInfo(config)) ??
    defaultContext;

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
    instanceId: getUUID(),
  };
};
