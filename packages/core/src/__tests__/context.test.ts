import { NativeModules } from 'react-native';
import type { Context, NativeContextInfo } from '../types';

import packageJson from '../../package.json';

import { getContext } from '../context';
import { AnalyticsReactNativeModule } from '../native-module';

const UUID = 'uuid-uuid-very-unique';

jest.mock('../uuid', () => ({
  getUUID: () => UUID,
}));

describe('#getContext', () => {
  const mockNativeContext: NativeContextInfo = {
    appName: 'Segment Example',
    appVersion: '1.0',
    buildNumber: '1',
    bundleId: 'com.segment.example.analytics',
    locale: 'en_US',
    networkType: 'wifi',
    osName: 'iOS',
    osVersion: '14.1',
    screenHeight: 800,
    screenWidth: 600,
    screenDensity: 2.625,
    timezone: 'Europe/London',
    manufacturer: 'Apple',
    model: 'x86_64',
    deviceName: 'iPhone',
    deviceId: '123-456-789',
    deviceType: 'phone',
  };

  const contextResult: Context = {
    app: {
      build: '1',
      name: 'Segment Example',
      namespace: 'com.segment.example.analytics',
      version: '1.0',
    },
    device: {
      id: '123-456-789',
      manufacturer: 'Apple',
      model: 'x86_64',
      name: 'iPhone',
      type: 'phone',
    },
    library: {
      name: packageJson.name,
      version: packageJson.version,
    },
    locale: 'en_US',
    network: {
      cellular: false,
      wifi: true,
    },
    os: {
      name: 'iOS',
      version: '14.1',
    },
    screen: {
      density: 2.625,
      height: 800,
      width: 600,
    },
    timezone: 'Europe/London',
    traits: {},
    instanceId: UUID,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.AnalyticsReactNative = {
      getContextInfo: jest.fn().mockResolvedValue(mockNativeContext),
    };
  });

  it('gets the context', async () => {
    const context = await getContext({
      collectDeviceId: false,
      uuidProvider: () => UUID,
      deviceInfoProvider: AnalyticsReactNativeModule!.getContextInfo,
    });

    expect(AnalyticsReactNativeModule?.getContextInfo).toHaveBeenCalledTimes(1);
    expect(context).toEqual(contextResult);
  });

  it('supports custom implementations', async () => {
    const customProvider = jest.fn().mockResolvedValue(mockNativeContext);
    const context = await getContext({
      collectDeviceId: false,
      uuidProvider: () => UUID,
      deviceInfoProvider: customProvider,
    });

    expect(customProvider).toHaveBeenCalledTimes(1);
    expect(context).toEqual(contextResult);
  });
});
