/**
 * Stub for react-native — provides the minimal surface needed by the SDK
 * to run on Node.js without the React Native runtime.
 */

export type AppStateStatus = string;

export interface NativeEventSubscription {
  remove: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NativeModule {}

export const AppState = {
  currentState: 'active' as AppStateStatus,
  addEventListener: (
    _type: string,
    _handler: (state: AppStateStatus) => void
  ): NativeEventSubscription => ({
    remove: () => {},
  }),
};

export const NativeModules: Record<string, unknown> = {
  AnalyticsReactNative: {
    getContextInfo: async () => ({
      appName: 'e2e-cli',
      appVersion: '1.0.0',
      buildNumber: '1',
      bundleId: 'com.segment.e2ecli',
      locale: 'en-US',
      networkType: 'wifi',
      osName: 'Node.js',
      osVersion: process.version,
      screenHeight: 0,
      screenWidth: 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      manufacturer: '',
      model: '',
      deviceName: 'e2e-cli',
      deviceId: '',
      deviceType: 'node',
      screenDensity: 0,
    }),
  },
};

export const Platform = {
  OS: 'node',
  select: (opts: Record<string, string>): string => opts.default ?? '',
};
