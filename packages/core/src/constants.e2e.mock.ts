import { Platform } from 'react-native';
import type { Config } from '.';

export const batchApi = Platform.select({
  ios: 'http://localhost:9091/events',
  android: 'http://10.0.2.2:9091/events',
});

export const settingsCDN = Platform.select({
  ios: 'http://localhost:9091/settings',
  android: 'http://10.0.2.2:9091/settings',
});

export const defaultApiHost = 'api.segment.io/v1';

export const defaultConfig: Config = {
  writeKey: '',
  flushAt: 20,
  flushInterval: 30,
  maxBatchSize: 1000,
  trackDeepLinks: false,
  trackAppLifecycleEvents: false,
  autoAddSegmentDestination: true,
};
