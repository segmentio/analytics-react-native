import { classifyError, parseRetryAfter } from '../errors';

describe('classifyError', () => {
  describe('rate limit errors', () => {
    it('classifies 429 as rate_limit', () => {
      const result = classifyError(429);
      expect(result).toEqual({
        isRetryable: true,
        errorType: 'rate_limit',
      });
    });
  });

  describe('transient errors (v1 legacy behavior)', () => {
    // Test v1 API with explicit retryableStatusCodes array
    const v1RetryableCodes = [408, 410, 429, 460, 500, 502, 503, 504, 508];

    it.each([
      [408, 'Request Timeout'],
      [410, 'Gone'],
      [460, 'Client timeout shorter than ELB'],
      [500, 'Internal Server Error'],
      [502, 'Bad Gateway'],
      [503, 'Service Unavailable'],
      [504, 'Gateway Timeout'],
      [508, 'Loop Detected'],
    ])('classifies %d (%s) as transient with v1 API', (statusCode) => {
      const result = classifyError(statusCode, v1RetryableCodes);
      expect(result).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
    });
  });

  describe('permanent errors', () => {
    it.each([
      [400, 'Bad Request'],
      [401, 'Unauthorized'],
      [403, 'Forbidden'],
      [404, 'Not Found'],
      [413, 'Payload Too Large'],
      [422, 'Unprocessable Entity'],
    ])('classifies %d (%s) as permanent', (statusCode) => {
      const result = classifyError(statusCode);
      expect(result).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
    });

    // 5xx codes are retryable by default in v2, unless explicitly overridden
    it.each([
      [501, 'Not Implemented'],
      [505, 'HTTP Version Not Supported'],
    ])('classifies %d (%s) as transient by default', (statusCode) => {
      const result = classifyError(statusCode);
      expect(result).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
    });
  });

  describe('custom retryable status codes', () => {
    it('uses custom retryableStatusCodes list', () => {
      const customCodes = [418]; // I'm a teapot
      const result = classifyError(418, customCodes);
      expect(result).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
    });

    it('treats 500 as permanent if not in custom list', () => {
      const customCodes = [503]; // Only 503 is retryable
      const result = classifyError(500, customCodes);
      expect(result).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
    });

    it('still treats 429 as rate_limit regardless of custom list', () => {
      const customCodes = [500]; // 429 not in list
      const result = classifyError(429, customCodes);
      expect(result).toEqual({
        isRetryable: true,
        errorType: 'rate_limit',
      });
    });
  });
});

describe('parseRetryAfter', () => {
  describe('with null or undefined', () => {
    it('returns undefined for null', () => {
      expect(parseRetryAfter(null)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(parseRetryAfter('')).toBeUndefined();
    });
  });

  describe('with seconds format', () => {
    it('parses valid seconds', () => {
      expect(parseRetryAfter('60')).toBe(60);
    });

    it('parses zero seconds', () => {
      expect(parseRetryAfter('0')).toBe(0);
    });

    it('caps at maxRetryInterval', () => {
      expect(parseRetryAfter('500', 300)).toBe(300);
    });

    it('uses default maxRetryInterval of 300', () => {
      expect(parseRetryAfter('500')).toBe(300);
    });
  });

  describe('with HTTP date format', () => {
    beforeEach(() => {
      // Mock Date.now() to return a fixed timestamp
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2024-01-01T00:00:00Z').getTime());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('parses future HTTP date', () => {
      const futureDate = 'Mon, 01 Jan 2024 00:01:00 GMT'; // 60 seconds in future
      const result = parseRetryAfter(futureDate);
      expect(result).toBe(60);
    });

    it('returns 0 for past HTTP date', () => {
      const pastDate = 'Sun, 31 Dec 2023 23:59:00 GMT'; // In the past
      const result = parseRetryAfter(pastDate);
      expect(result).toBe(0);
    });

    it('caps HTTP date at maxRetryInterval', () => {
      const futureDate = 'Mon, 01 Jan 2024 01:00:00 GMT'; // 3600 seconds in future
      const result = parseRetryAfter(futureDate, 300);
      expect(result).toBe(300);
    });
  });

  describe('with invalid format', () => {
    it('returns undefined for invalid string', () => {
      expect(parseRetryAfter('invalid')).toBeUndefined();
    });

    it('returns undefined for malformed date', () => {
      expect(parseRetryAfter('Not a date')).toBeUndefined();
    });
  });
});

describe('classifyError v2 - status code behavior resolution', () => {
  describe('status code overrides', () => {
    it('overrides take precedence over defaults', () => {
      const config = {
        default4xxBehavior: 'drop' as const,
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: {
          '404': 'retry' as const,
          '500': 'drop' as const,
        },
      };

      // 404 normally drops, but override says retry
      expect(classifyError(404, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });

      // 500 normally retries, but override says drop
      expect(classifyError(500, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
    });

    it('429 remains rate_limit regardless of overrides', () => {
      const config = {
        default4xxBehavior: 'drop' as const,
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: {
          '429': 'retry' as const,
        },
        rateLimitEnabled: true,
      };

      expect(classifyError(429, config)).toEqual({
        isRetryable: true,
        errorType: 'rate_limit',
      });
    });

    it('applies specific overrides from SDD', () => {
      const config = {
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

      // 4xx codes with retry override
      expect(classifyError(408, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
      expect(classifyError(410, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
      expect(classifyError(460, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });

      // 5xx codes with drop override
      expect(classifyError(501, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
      expect(classifyError(505, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
    });
  });

  describe('default behavior', () => {
    it('default4xxBehavior: drop applies to most 4xx', () => {
      const config = {
        default4xxBehavior: 'drop' as const,
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: {},
      };

      expect(classifyError(400, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
      expect(classifyError(401, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
      expect(classifyError(404, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
    });

    it('default4xxBehavior: retry applies to most 4xx', () => {
      const config = {
        default4xxBehavior: 'retry' as const,
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: {},
      };

      expect(classifyError(400, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
      expect(classifyError(404, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
    });

    it('default5xxBehavior: retry applies to most 5xx', () => {
      const config = {
        default4xxBehavior: 'drop' as const,
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: {},
      };

      expect(classifyError(500, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
      expect(classifyError(502, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
      expect(classifyError(503, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
    });

    it('default5xxBehavior: drop applies to most 5xx', () => {
      const config = {
        default4xxBehavior: 'drop' as const,
        default5xxBehavior: 'drop' as const,
        statusCodeOverrides: {},
      };

      expect(classifyError(500, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
      expect(classifyError(503, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
    });
  });

  describe('edge cases', () => {
    it('unknown codes (outside 4xx/5xx) are dropped', () => {
      const config = {
        default4xxBehavior: 'retry' as const,
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: {},
      };

      expect(classifyError(200, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
      expect(classifyError(300, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
      expect(classifyError(600, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
    });

    it('works with empty overrides', () => {
      const config = {
        default4xxBehavior: 'drop' as const,
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: {},
      };

      expect(classifyError(404, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
      expect(classifyError(500, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
    });

    it('precedence: override > 429 handling > defaults', () => {
      const config = {
        default4xxBehavior: 'drop' as const,
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: {
          '404': 'retry' as const,
        },
        rateLimitEnabled: true,
      };

      // Override takes precedence
      expect(classifyError(404, config)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });

      // 429 special handling
      expect(classifyError(429, config)).toEqual({
        isRetryable: true,
        errorType: 'rate_limit',
      });

      // Default behavior
      expect(classifyError(401, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
    });

    it('works without config (uses defaults)', () => {
      // Should fall back to safe defaults
      expect(classifyError(404)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });

      expect(classifyError(500)).toEqual({
        isRetryable: true,
        errorType: 'transient',
      });
    });

    it('429 without rate limit enabled treats as regular 4xx', () => {
      const config = {
        default4xxBehavior: 'drop' as const,
        default5xxBehavior: 'retry' as const,
        statusCodeOverrides: {},
        rateLimitEnabled: false,
      };

      expect(classifyError(429, config)).toEqual({
        isRetryable: false,
        errorType: 'permanent',
      });
    });
  });
});
