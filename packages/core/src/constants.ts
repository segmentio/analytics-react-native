import type { Config } from './types';

export const defaultApiHost = 'https://api.segment.io/v1/b';

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

export const workspaceDestinationFilterKey = '';
