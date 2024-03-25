import { libraryInfo } from './info';

import type {
  Context,
  ContextDevice,
  DeviceInfoProvider,
  NativeContextInfo,
  UUIDProvider,
} from './types';

export const defaultContext = {
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

export const getContext = async (config: {
  collectDeviceId: boolean;
  deviceInfoProvider: DeviceInfoProvider;
  uuidProvider: UUIDProvider;
}): Promise<Context> => {
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
    (await config.deviceInfoProvider({
      collectDeviceId: config.collectDeviceId,
    })) ?? defaultContext;

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
    traits: {},
    instanceId: config.uuidProvider(),
  };
};
