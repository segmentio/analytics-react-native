import {
  validateRateLimitConfig,
  validateBackoffConfig,
} from '../config-validation';
import type { RateLimitConfig, BackoffConfig } from '../types';
import { getMockLogger } from '../test-helpers';

describe('config-validation', () => {
  let mockLogger: ReturnType<typeof getMockLogger>;

  beforeEach(() => {
    mockLogger = getMockLogger();
  });

  describe('validateRateLimitConfig', () => {
    const validConfig: RateLimitConfig = {
      enabled: true,
      maxRetryCount: 50,
      maxRetryInterval: 300,
      maxRateLimitDuration: 43200,
    };

    it('passes through valid config unchanged', () => {
      const result = validateRateLimitConfig(validConfig, mockLogger);
      expect(result).toEqual(validConfig);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('clamps maxRetryInterval below minimum', () => {
      const result = validateRateLimitConfig(
        { ...validConfig, maxRetryInterval: 0.01 },
        mockLogger
      );
      expect(result.maxRetryInterval).toBe(0.1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('clamps maxRetryInterval above maximum', () => {
      const result = validateRateLimitConfig(
        { ...validConfig, maxRetryInterval: 100000 },
        mockLogger
      );
      expect(result.maxRetryInterval).toBe(86400);
    });

    it('clamps maxRateLimitDuration below absolute minimum', () => {
      // With maxRetryInterval=1, 2x=2, absolute min=60 wins
      const result = validateRateLimitConfig(
        { ...validConfig, maxRetryInterval: 1, maxRateLimitDuration: 10 },
        mockLogger
      );
      expect(result.maxRateLimitDuration).toBe(60);
    });

    it('clamps maxRetryCount to range [1, 100]', () => {
      expect(
        validateRateLimitConfig(
          { ...validConfig, maxRetryCount: 0 },
          mockLogger
        ).maxRetryCount
      ).toBe(1);
      expect(
        validateRateLimitConfig(
          { ...validConfig, maxRetryCount: 200 },
          mockLogger
        ).maxRetryCount
      ).toBe(100);
    });

    it('clamps maxRateLimitDuration to >= 2x maxRetryInterval', () => {
      // maxRetryInterval=300, so maxRateLimitDuration must be >= 600
      const result = validateRateLimitConfig(
        { ...validConfig, maxRetryInterval: 300, maxRateLimitDuration: 100 },
        mockLogger
      );
      expect(result.maxRateLimitDuration).toBe(600);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('2x maxRetryInterval')
      );
    });

    it('does not clamp maxRateLimitDuration when already >= 2x maxRetryInterval', () => {
      const result = validateRateLimitConfig(
        { ...validConfig, maxRetryInterval: 100, maxRateLimitDuration: 500 },
        mockLogger
      );
      expect(result.maxRateLimitDuration).toBe(500);
    });
  });

  describe('validateBackoffConfig', () => {
    const validConfig: BackoffConfig = {
      enabled: true,
      maxRetryCount: 50,
      baseBackoffInterval: 0.5,
      maxBackoffInterval: 300,
      maxTotalBackoffDuration: 43200,
      jitterPercent: 10,
      default4xxBehavior: 'drop',
      default5xxBehavior: 'retry',
      statusCodeOverrides: {},
    };

    it('passes through valid config unchanged', () => {
      const result = validateBackoffConfig(validConfig, mockLogger);
      expect(result).toEqual(validConfig);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('clamps maxBackoffInterval to range [0.1, 86400]', () => {
      expect(
        validateBackoffConfig(
          { ...validConfig, maxBackoffInterval: 0.01 },
          mockLogger
        ).maxBackoffInterval
      ).toBe(0.1);
      expect(
        validateBackoffConfig(
          { ...validConfig, maxBackoffInterval: 100000 },
          mockLogger
        ).maxBackoffInterval
      ).toBe(86400);
    });

    it('clamps baseBackoffInterval to range [0.1, 300]', () => {
      expect(
        validateBackoffConfig(
          { ...validConfig, baseBackoffInterval: 0.01 },
          mockLogger
        ).baseBackoffInterval
      ).toBe(0.1);
      expect(
        validateBackoffConfig(
          { ...validConfig, baseBackoffInterval: 500 },
          mockLogger
        ).baseBackoffInterval
      ).toBe(300);
    });

    it('clamps maxTotalBackoffDuration to range [60, 604800]', () => {
      expect(
        validateBackoffConfig(
          { ...validConfig, maxTotalBackoffDuration: 10 },
          mockLogger
        ).maxTotalBackoffDuration
      ).toBe(600); // Gets clamped to 60 first, then to 2x maxBackoffInterval (600)
      expect(
        validateBackoffConfig(
          { ...validConfig, maxTotalBackoffDuration: 700000 },
          mockLogger
        ).maxTotalBackoffDuration
      ).toBe(604800);
    });

    it('clamps jitterPercent to range [0, 100]', () => {
      expect(
        validateBackoffConfig({ ...validConfig, jitterPercent: -5 }, mockLogger)
          .jitterPercent
      ).toBe(0);
      expect(
        validateBackoffConfig(
          { ...validConfig, jitterPercent: 150 },
          mockLogger
        ).jitterPercent
      ).toBe(100);
    });

    it('clamps baseBackoffInterval to <= maxBackoffInterval', () => {
      const result = validateBackoffConfig(
        { ...validConfig, baseBackoffInterval: 100, maxBackoffInterval: 50 },
        mockLogger
      );
      expect(result.baseBackoffInterval).toBe(50);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('clamped to maxBackoffInterval')
      );
    });

    it('clamps maxTotalBackoffDuration to >= 2x maxBackoffInterval', () => {
      // maxBackoffInterval=300, so maxTotalBackoffDuration must be >= 600
      const result = validateBackoffConfig(
        {
          ...validConfig,
          maxBackoffInterval: 300,
          maxTotalBackoffDuration: 100,
        },
        mockLogger
      );
      expect(result.maxTotalBackoffDuration).toBe(600);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('2x max interval')
      );
    });

    it('does not clamp maxTotalBackoffDuration when already >= 2x maxBackoffInterval', () => {
      const result = validateBackoffConfig(
        {
          ...validConfig,
          maxBackoffInterval: 100,
          maxTotalBackoffDuration: 500,
        },
        mockLogger
      );
      expect(result.maxTotalBackoffDuration).toBe(500);
    });
  });
});
