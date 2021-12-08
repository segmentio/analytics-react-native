export const AppState = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const Linking = {
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
};

export const NativeModules = {
  AnalyticsReactNative: {
    getContextInfo: jest.fn().mockResolvedValue({
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
    }),
  },
};
