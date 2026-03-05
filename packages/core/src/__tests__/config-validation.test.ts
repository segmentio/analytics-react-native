import { validateBackoffConfig, validateRateLimitConfig } from '../config-validation';
import type { BackoffConfig, RateLimitConfig } from '../types';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('validateBackoffConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('maxBackoffInterval clamping', () => {
    it('clamps values below 0.1s', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 0.05,
        maxTotalBackoffDuration: 3600,
        jitterPercent: 10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.maxBackoffInterval).toBe(0.1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'maxBackoffInterval 0.05s clamped to 0.1s'
      );
    });

    it('clamps values above 86400s (24 hours)', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 100000,
        maxTotalBackoffDuration: 3600,
        jitterPercent: 10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.maxBackoffInterval).toBe(86400);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'maxBackoffInterval 100000s clamped to 86400s'
      );
    });

    it('keeps values within valid range', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 3600,
        jitterPercent: 10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.maxBackoffInterval).toBe(300);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('baseBackoffInterval clamping', () => {
    it('clamps values below 0.1s', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.01,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 3600,
        jitterPercent: 10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.baseBackoffInterval).toBe(0.1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'baseBackoffInterval 0.01s clamped to 0.1s'
      );
    });

    it('clamps values above 300s (5 minutes)', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 500,
        maxBackoffInterval: 600,
        maxTotalBackoffDuration: 3600,
        jitterPercent: 10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.baseBackoffInterval).toBe(300);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'baseBackoffInterval 500s clamped to 300s'
      );
    });

    it('keeps values within valid range', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 1,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 3600,
        jitterPercent: 10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.baseBackoffInterval).toBe(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('maxTotalBackoffDuration clamping', () => {
    it('clamps values below 60s (1 minute)', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 30,
        jitterPercent: 10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.maxTotalBackoffDuration).toBe(60);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'maxTotalBackoffDuration 30s clamped to 60s'
      );
    });

    it('clamps values above 604800s (7 days)', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 1000000,
        jitterPercent: 10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.maxTotalBackoffDuration).toBe(604800);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'maxTotalBackoffDuration 1000000s clamped to 604800s'
      );
    });

    it('keeps values within valid range', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 3600,
        jitterPercent: 10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.maxTotalBackoffDuration).toBe(3600);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('jitterPercent clamping', () => {
    it('clamps values below 0', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 3600,
        jitterPercent: -10,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.jitterPercent).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'jitterPercent -10 clamped to 0'
      );
    });

    it('clamps values above 100', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 3600,
        jitterPercent: 150,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.jitterPercent).toBe(100);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'jitterPercent 150 clamped to 100'
      );
    });

    it('keeps values within valid range', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 3600,
        jitterPercent: 50,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.jitterPercent).toBe(50);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('multiple clamps', () => {
    it('clamps multiple values and logs multiple warnings', () => {
      const config: BackoffConfig = {
        enabled: true,
        maxRetryCount: 100,
        baseBackoffInterval: 0.01,
        maxBackoffInterval: 100000,
        maxTotalBackoffDuration: 30,
        jitterPercent: 150,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      };

      const result = validateBackoffConfig(config, mockLogger);
      expect(result.maxBackoffInterval).toBe(86400);
      expect(result.baseBackoffInterval).toBe(0.1);
      expect(result.maxTotalBackoffDuration).toBe(60);
      expect(result.jitterPercent).toBe(100);
      expect(mockLogger.warn).toHaveBeenCalledTimes(4);
    });
  });
});

describe('validateRateLimitConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('maxRateLimitDuration clamping', () => {
    it('clamps values below 60s (1 minute)', () => {
      const config: RateLimitConfig = {
        enabled: true,
        maxRetryCount: 100,
        maxRetryInterval: 300,
        maxRateLimitDuration: 30,
      };

      const result = validateRateLimitConfig(config, mockLogger);
      expect(result.maxRateLimitDuration).toBe(60);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'maxRateLimitDuration 30s clamped to 60s'
      );
    });

    it('clamps values above 604800s (7 days)', () => {
      const config: RateLimitConfig = {
        enabled: true,
        maxRetryCount: 100,
        maxRetryInterval: 300,
        maxRateLimitDuration: 1000000,
      };

      const result = validateRateLimitConfig(config, mockLogger);
      expect(result.maxRateLimitDuration).toBe(604800);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'maxRateLimitDuration 1000000s clamped to 604800s'
      );
    });

    it('keeps values within valid range', () => {
      const config: RateLimitConfig = {
        enabled: true,
        maxRetryCount: 100,
        maxRetryInterval: 300,
        maxRateLimitDuration: 3600,
      };

      const result = validateRateLimitConfig(config, mockLogger);
      expect(result.maxRateLimitDuration).toBe(3600);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});
