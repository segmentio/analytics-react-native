import { NativeModules } from 'react-native';
import type { Context, NativeContextInfo, UserTraits } from '../types';

import packageJson from '../../package.json';

import { getContext } from '../context';

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
  };

  beforeEach(() => {
    NativeModules.AnalyticsReactNative = {
      getContextInfo: jest.fn(async () => mockNativeContext),
    };
  });

  it('gets the context', async () => {
    const { AnalyticsReactNative } = NativeModules;

    const context = await getContext(undefined);

    expect(AnalyticsReactNative.getContextInfo).toHaveBeenCalledTimes(1);
    expect(context).toEqual(contextResult);
  });

  it('gets the context with Traits', async () => {
    const { AnalyticsReactNative } = NativeModules;
    const userTraits: UserTraits = {
      firstName: 'John',
      lastName: 'Doe',
    };

    const context = await getContext(userTraits);

    expect(AnalyticsReactNative.getContextInfo).toHaveBeenCalledTimes(1);
    expect(context).toEqual({ ...contextResult, traits: userTraits });
  });
});
