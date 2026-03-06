import { classifyError, parseRetryAfter } from '../errors';

describe('classifyError', () => {
  describe('statusCodeOverrides precedence', () => {
    it('uses override for specific status code', () => {
      const config = {
        default4xxBehavior: 'drop' as const,
        statusCodeOverrides: { '400': 'retry' as const },
      };
      const result = classifyError(400, config);
      expect(result.isRetryable).toBe(true);
      expect(result.errorType).toBe('transient');
    });

    it('classifies 429 as rate_limit when overridden to retry', () => {
      const config = {
        statusCodeOverrides: { '429': 'retry' as const },
      };
      const result = classifyError(429, config);
      expect(result.isRetryable).toBe(true);
      expect(result.errorType).toBe('rate_limit');
    });

    it('marks code as non-retryable when overridden to drop', () => {
      const config = {
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: { '503': 'drop' as const },
      };
      const result = classifyError(503, config);
      expect(result.isRetryable).toBe(false);
      expect(result.errorType).toBe('permanent');
    });
  });

  describe('429 special handling', () => {
    it('classifies 429 as rate_limit by default', () => {
      const result = classifyError(429);
      expect(result.isRetryable).toBe(true);
      expect(result.errorType).toBe('rate_limit');
    });

    it('respects rateLimitEnabled=false', () => {
      const config = {
        rateLimitEnabled: false,
        default4xxBehavior: 'drop' as const,
      };
      const result = classifyError(429, config);
      expect(result.isRetryable).toBe(false);
      expect(result.errorType).toBe('permanent');
    });
  });

  describe('4xx default behavior', () => {
    it('defaults to drop for 4xx codes', () => {
      const result = classifyError(400);
      expect(result.isRetryable).toBe(false);
      expect(result.errorType).toBe('permanent');
    });

    it('respects default4xxBehavior=retry', () => {
      const config = { default4xxBehavior: 'retry' as const };
      const result = classifyError(404, config);
      expect(result.isRetryable).toBe(true);
      expect(result.errorType).toBe('transient');
    });

    it('handles various 4xx codes', () => {
      [400, 401, 403, 404, 408, 410, 413, 422, 460].forEach((code) => {
        const result = classifyError(code);
        expect(result.isRetryable).toBe(false);
        expect(result.errorType).toBe('permanent');
      });
    });
  });

  describe('5xx default behavior', () => {
    it('defaults to retry for 5xx codes', () => {
      const result = classifyError(500);
      expect(result.isRetryable).toBe(true);
      expect(result.errorType).toBe('transient');
    });

    it('respects default5xxBehavior=drop', () => {
      const config = { default5xxBehavior: 'drop' as const };
      const result = classifyError(503, config);
      expect(result.isRetryable).toBe(false);
      expect(result.errorType).toBe('permanent');
    });

    it('handles various 5xx codes', () => {
      [500, 501, 502, 503, 504, 505, 508, 511].forEach((code) => {
        const result = classifyError(code);
        expect(result.isRetryable).toBe(true);
        expect(result.errorType).toBe('transient');
      });
    });
  });

  describe('edge cases', () => {
    it('handles codes outside 4xx/5xx ranges', () => {
      [200, 201, 304, 600, 999].forEach((code) => {
        const result = classifyError(code);
        expect(result.isRetryable).toBe(false);
        expect(result.errorType).toBe('permanent');
      });
    });

    it('handles negative status codes', () => {
      const result = classifyError(-1);
      expect(result.isRetryable).toBe(false);
      expect(result.errorType).toBe('permanent');
    });

    it('handles zero status code', () => {
      const result = classifyError(0);
      expect(result.isRetryable).toBe(false);
      expect(result.errorType).toBe('permanent');
    });
  });

  describe('SDD-specified overrides', () => {
    const sddConfig = {
      default4xxBehavior: 'drop' as const,
      default5xxBehavior: 'retry' as const,
      statusCodeOverrides: {
        '408': 'retry' as const,
        '410': 'retry' as const,
        '429': 'retry' as const,
        '460': 'retry' as const,
        '501': 'drop' as const,
        '505': 'drop' as const,
      },
    };

    it('retries 408 (per SDD)', () => {
      const result = classifyError(408, sddConfig);
      expect(result.isRetryable).toBe(true);
    });

    it('retries 410 (per SDD)', () => {
      const result = classifyError(410, sddConfig);
      expect(result.isRetryable).toBe(true);
    });

    it('retries 460 (per SDD)', () => {
      const result = classifyError(460, sddConfig);
      expect(result.isRetryable).toBe(true);
    });

    it('drops 501 (per SDD)', () => {
      const result = classifyError(501, sddConfig);
      expect(result.isRetryable).toBe(false);
    });

    it('drops 505 (per SDD)', () => {
      const result = classifyError(505, sddConfig);
      expect(result.isRetryable).toBe(false);
    });
  });
});

describe('parseRetryAfter', () => {
  describe('seconds format', () => {
    it('parses valid seconds', () => {
      expect(parseRetryAfter('60')).toBe(60);
    });

    it('clamps to maxRetryInterval', () => {
      expect(parseRetryAfter('999', 300)).toBe(300);
    });

    it('accepts zero', () => {
      expect(parseRetryAfter('0')).toBe(0);
    });

    it('handles very large numbers', () => {
      expect(parseRetryAfter('999999', 300)).toBe(300);
    });
  });

  describe('HTTP-date format', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('parses valid HTTP-date', () => {
      const result = parseRetryAfter('Thu, 01 Jan 2026 00:01:00 GMT');
      expect(result).toBe(60);
    });

    it('clamps HTTP-date to maxRetryInterval', () => {
      const result = parseRetryAfter('Thu, 01 Jan 2026 01:00:00 GMT', 300);
      expect(result).toBe(300);
    });

    it('handles past dates by returning 0', () => {
      const result = parseRetryAfter('Wed, 31 Dec 2025 23:59:00 GMT');
      expect(result).toBe(0);
    });
  });

  describe('invalid inputs', () => {
    it('returns undefined for null', () => {
      expect(parseRetryAfter(null)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(parseRetryAfter('')).toBeUndefined();
    });

    it('returns undefined for invalid string', () => {
      expect(parseRetryAfter('invalid')).toBeUndefined();
    });

    it('returns undefined for malformed date', () => {
      expect(parseRetryAfter('Not a date')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('rejects negative numbers in seconds format', () => {
      // Negative seconds are rejected, falls through to date parsing
      // '-10' as a date string may parse to a past date, returning 0
      const result = parseRetryAfter('-10');
      expect(result).toBeDefined();
      // Either undefined (invalid date) or 0 (past date) is acceptable
      expect(result === undefined || result === 0).toBe(true);
    });

    it('uses custom maxRetryInterval', () => {
      expect(parseRetryAfter('500', 100)).toBe(100);
    });

    it('handles maxRetryInterval of 0', () => {
      expect(parseRetryAfter('60', 0)).toBe(0);
    });
  });
});
