import type { Config } from './types';

export const defaultApiHost = 'api.segment.io/v1';

export const settingsCDN = 'cdn-settings.segment.com/v1';

export const defaultConfig: Config = {
  writeKey: '',
  maxBatchSize: 1000,
  trackDeepLinks: false,
  trackAppLifecycleEvents: false,
  autoAddSegmentDestination: true,
};

export const workspaceDestinationFilterKey = '';

export const defaultFlushAt = 20;
export const defaultFlushInterval = 30;
