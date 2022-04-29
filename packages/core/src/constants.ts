import type { Config } from './types';

export const batchApi = 'https://api.segment.io/v1/b';
export const defaultApiHost = 'api.segment.io/v1';

export const settingsCDN = 'https://cdn-settings.segment.com/v1/projects';

export const defaultConfig: Config = {
  writeKey: '',
  flushAt: 20,
  flushInterval: 30,
  maxBatchSize: 1000,
  trackDeepLinks: false,
  trackAppLifecycleEvents: false,
  autoAddSegmentDestination: true,
};
