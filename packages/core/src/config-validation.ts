import type { BackoffConfig, RateLimitConfig, LoggerType } from './types';

/**
 * Validates and clamps BackoffConfig values to safe ranges
 * Logs warnings when values are clamped
 */
export const validateBackoffConfig = (
  config: BackoffConfig,
  logger?: LoggerType
): BackoffConfig => {
  const validated = { ...config };

  // Clamp maxBackoffInterval (0.1s to 24 hours)
  if (validated.maxBackoffInterval < 0.1) {
    logger?.warn(
      `maxBackoffInterval ${validated.maxBackoffInterval}s clamped to 0.1s`
    );
    validated.maxBackoffInterval = 0.1;
  } else if (validated.maxBackoffInterval > 86400) {
    logger?.warn(
      `maxBackoffInterval ${validated.maxBackoffInterval}s clamped to 86400s`
    );
    validated.maxBackoffInterval = 86400;
  }

  // Clamp baseBackoffInterval (0.1s to 5 minutes)
  if (validated.baseBackoffInterval < 0.1) {
    logger?.warn(
      `baseBackoffInterval ${validated.baseBackoffInterval}s clamped to 0.1s`
    );
    validated.baseBackoffInterval = 0.1;
  } else if (validated.baseBackoffInterval > 300) {
    logger?.warn(
      `baseBackoffInterval ${validated.baseBackoffInterval}s clamped to 300s`
    );
    validated.baseBackoffInterval = 300;
  }

  // Clamp maxTotalBackoffDuration (1 min to 7 days)
  if (validated.maxTotalBackoffDuration < 60) {
    logger?.warn(
      `maxTotalBackoffDuration ${validated.maxTotalBackoffDuration}s clamped to 60s`
    );
    validated.maxTotalBackoffDuration = 60;
  } else if (validated.maxTotalBackoffDuration > 604800) {
    logger?.warn(
      `maxTotalBackoffDuration ${validated.maxTotalBackoffDuration}s clamped to 604800s`
    );
    validated.maxTotalBackoffDuration = 604800;
  }

  // Clamp jitterPercent (0 to 100)
  if (validated.jitterPercent < 0) {
    logger?.warn(`jitterPercent ${validated.jitterPercent} clamped to 0`);
    validated.jitterPercent = 0;
  } else if (validated.jitterPercent > 100) {
    logger?.warn(`jitterPercent ${validated.jitterPercent} clamped to 100`);
    validated.jitterPercent = 100;
  }

  return validated;
};

/**
 * Validates and clamps RateLimitConfig values to safe ranges
 * Logs warnings when values are clamped
 */
export const validateRateLimitConfig = (
  config: RateLimitConfig,
  logger?: LoggerType
): RateLimitConfig => {
  const validated = { ...config };

  // Clamp maxRateLimitDuration (1 min to 7 days)
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

  return validated;
};
