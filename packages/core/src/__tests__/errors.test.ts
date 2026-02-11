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

  describe('transient errors', () => {
    it.each([
      [408, 'Request Timeout'],
      [410, 'Gone'],
      [460, 'Client timeout shorter than ELB'],
      [500, 'Internal Server Error'],
      [502, 'Bad Gateway'],
      [503, 'Service Unavailable'],
      [504, 'Gateway Timeout'],
      [508, 'Loop Detected'],
    ])('classifies %d (%s) as transient', (statusCode) => {
      const result = classifyError(statusCode);
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
      [501, 'Not Implemented'],
      [505, 'HTTP Version Not Supported'],
    ])('classifies %d (%s) as permanent', (statusCode) => {
      const result = classifyError(statusCode);
      expect(result).toEqual({
        isRetryable: false,
        errorType: 'permanent',
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
