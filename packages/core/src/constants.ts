import type { Config, HttpConfig } from './types';

export const defaultApiHost = 'https://api.segment.io/v1/b';
export const settingsCDN = 'https://cdn-settings.segment.com/v1/projects';

export const defaultConfig: Config = {
  writeKey: '',
  maxBatchSize: 1000,
  trackDeepLinks: false,
  trackAppLifecycleEvents: false,
  autoAddSegmentDestination: true,
  useSegmentEndpoints: false,
};

export const defaultHttpConfig: HttpConfig = {
  rateLimitConfig: {
    enabled: true,
    maxRetryCount: 100,
    maxRetryInterval: 300,
    maxTotalBackoffDuration: 43200, // 12 hours
  },
  backoffConfig: {
    enabled: true,
    maxRetryCount: 100,
    baseBackoffInterval: 0.5,
    maxBackoffInterval: 300,
    maxTotalBackoffDuration: 43200,
    jitterPercent: 10,
    retryableStatusCodes: [408, 410, 429, 460, 500, 502, 503, 504, 508],
  },
};

export const workspaceDestinationFilterKey = '';

export const defaultFlushAt = 20;
export const defaultFlushInterval = 30;
