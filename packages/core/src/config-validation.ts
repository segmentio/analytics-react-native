import type { RateLimitConfig, BackoffConfig, LoggerType } from './types';

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

  // Relational: maxRateLimitDuration >= 2x maxRetryInterval
  const minRateLimitDuration = validated.maxRetryInterval * 2;
  if (validated.maxRateLimitDuration < minRateLimitDuration) {
    logger?.warn(
      `maxRateLimitDuration ${validated.maxRateLimitDuration}s clamped to ${minRateLimitDuration}s (2x maxRetryInterval)`
    );
    validated.maxRateLimitDuration = minRateLimitDuration;
  }

  return validated;
};

export const validateBackoffConfig = (
  config: BackoffConfig,
  logger?: LoggerType,
  rateLimitConfig?: RateLimitConfig
): BackoffConfig => {
  const validated = { ...config };

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

  if (validated.jitterPercent < 0) {
    logger?.warn(`jitterPercent ${validated.jitterPercent} clamped to 0`);
    validated.jitterPercent = 0;
  } else if (validated.jitterPercent > 100) {
    logger?.warn(`jitterPercent ${validated.jitterPercent} clamped to 100`);
    validated.jitterPercent = 100;
  }

  if (validated.maxRetryCount < 1) {
    logger?.warn(`maxRetryCount ${validated.maxRetryCount} clamped to 1`);
    validated.maxRetryCount = 1;
  } else if (validated.maxRetryCount > 100) {
    logger?.warn(`maxRetryCount ${validated.maxRetryCount} clamped to 100`);
    validated.maxRetryCount = 100;
  }

  // Relational: baseBackoffInterval <= maxBackoffInterval
  if (validated.baseBackoffInterval > validated.maxBackoffInterval) {
    logger?.warn(
      `baseBackoffInterval ${validated.baseBackoffInterval}s clamped to maxBackoffInterval ${validated.maxBackoffInterval}s`
    );
    validated.baseBackoffInterval = validated.maxBackoffInterval;
  }

  // Relational: maxTotalBackoffDuration >= 2x max(maxBackoffInterval, rateLimitConfig.maxRetryInterval)
  const maxInterval = Math.max(
    validated.maxBackoffInterval,
    rateLimitConfig?.maxRetryInterval ?? 0
  );
  const minTotalDuration = maxInterval * 2;
  if (validated.maxTotalBackoffDuration < minTotalDuration) {
    logger?.warn(
      `maxTotalBackoffDuration ${validated.maxTotalBackoffDuration}s clamped to ${minTotalDuration}s (2x max interval)`
    );
    validated.maxTotalBackoffDuration = minTotalDuration;
  }

  return validated;
};
