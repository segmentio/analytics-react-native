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
  retryStrategy: 'lazy',
  autoFlushOnRetryReady: false,
};

export const defaultHttpConfig: HttpConfig = {
  rateLimitConfig: {
    enabled: true,
    maxRetryCount: 100,
    maxRetryInterval: 300,
    maxRateLimitDuration: 43200,
  },
  backoffConfig: {
    enabled: true,
    maxRetryCount: 100,
    baseBackoffInterval: 0.5,
    maxBackoffInterval: 300,
    maxTotalBackoffDuration: 43200,
    jitterPercent: 10,
    default4xxBehavior: 'drop',
    default5xxBehavior: 'retry',
    statusCodeOverrides: {
      '408': 'retry',
      '410': 'retry',
      '429': 'retry',
      '460': 'retry',
      '501': 'drop',
      '505': 'drop',
    },
  },
};

export const workspaceDestinationFilterKey = '';

export const defaultFlushAt = 20;
export const defaultFlushInterval = 30;
export const maxPendingEvents = 1000;
