import type { Config } from './types';

export const defaultApiHost = 'https://api.segment.io/v1/b';

export const settingsCDN = 'https://cdn-settings.segment.com/v1/projects';

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
