import type { RateLimitConfig, LoggerType } from './types';

export const validateRateLimitConfig = (
  config: RateLimitConfig,
  logger?: LoggerType
): RateLimitConfig => {
  const validated = { ...config };

  if (validated.maxRetryInterval < 0.1) {
    logger?.warn(
      `maxRetryInterval ${validated.maxRetryInterval}s clamped to 0.1s`
    );
    validated.maxRetryInterval = 0.1;
  } else if (validated.maxRetryInterval > 86400) {
    logger?.warn(
      `maxRetryInterval ${validated.maxRetryInterval}s clamped to 86400s`
    );
    validated.maxRetryInterval = 86400;
  }

  if (validated.maxRateLimitDuration < 60) {
    logger?.warn(
      `maxRateLimitDuration ${validated.maxRateLimitDuration}s clamped to 60s`
    );
    validated.maxRateLimitDuration = 60;
  } else if (validated.maxRateLimitDuration > 604800) {
    logger?.warn(
      `maxRateLimitDuration ${validated.maxRateLimitDuration}s clamped to 604800s`
    );
    validated.maxRateLimitDuration = 604800;
  }

  if (validated.maxRetryCount < 1) {
    logger?.warn(`maxRetryCount ${validated.maxRetryCount} clamped to 1`);
    validated.maxRetryCount = 1;
  } else if (validated.maxRetryCount > 100) {
    logger?.warn(`maxRetryCount ${validated.maxRetryCount} clamped to 100`);
    validated.maxRetryCount = 100;
  }

  return validated;
};
