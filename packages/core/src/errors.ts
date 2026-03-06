import type { ErrorClassification } from './types';

export enum ErrorType {
  NetworkUnexpectedHTTPCode,
  NetworkServerLimited,
  NetworkServerRejected,
  NetworkUnknown,

  JsonUnableToSerialize,
  JsonUnableToDeserialize,
  JsonUnknown,

  PluginError,

  InitializationError,
  ResetError,
  FlushError,
}

/**
 * Segment Error object for ErrorHandler option
 */
export class SegmentError extends Error {
  type: ErrorType;
  message: string;
  innerError?: unknown;

  constructor(type: ErrorType, message: string, innerError?: unknown) {
    super(message);
    Object.setPrototypeOf(this, SegmentError.prototype);
    this.type = type;
    this.message = message;
    this.innerError = innerError;
  }
}

/**
 * Custom Error type for Segment HTTP Error responses
 */
export class NetworkError extends SegmentError {
  statusCode: number;
  type:
    | ErrorType.NetworkServerLimited
    | ErrorType.NetworkServerRejected
    | ErrorType.NetworkUnexpectedHTTPCode
    | ErrorType.NetworkUnknown;

  constructor(statusCode: number, message: string, innerError?: unknown) {
    let type: ErrorType;
    if (statusCode === 429) {
      type = ErrorType.NetworkServerLimited;
    } else if (statusCode > 300 && statusCode < 400) {
      type = ErrorType.NetworkUnexpectedHTTPCode;
    } else if (statusCode >= 400) {
      type = ErrorType.NetworkServerRejected;
    } else {
      type = ErrorType.NetworkUnknown;
    }

    super(type, message, innerError);
    Object.setPrototypeOf(this, NetworkError.prototype);

    this.statusCode = statusCode;
    this.type = type;
  }
}

/**
 * Error type for JSON Serialization errors
 */
export class JSONError extends SegmentError {
  constructor(
    type: ErrorType.JsonUnableToDeserialize | ErrorType.JsonUnableToSerialize,
    message: string,
    innerError?: unknown
  ) {
    super(type, message, innerError);
    Object.setPrototypeOf(this, JSONError.prototype);
  }
}

/**
 * Utility method for handling HTTP fetch errors
 * @param response Fetch Response
 * @returns response if status OK, throws NetworkError for everything else
 */
export const checkResponseForErrors = (response: Response) => {
  if (!response.ok) {
    throw new NetworkError(response.status, response.statusText);
  }

  return response;
};

/**
 * Converts a .fetch() error to a SegmentError object for reporting to the error handler
 * @param error any JS error instance
 * @returns a SegmentError object
 */
export const translateHTTPError = (error: unknown): SegmentError => {
  if (error instanceof SegmentError) {
    return error;
  } else if (error instanceof SyntaxError) {
    return new JSONError(
      ErrorType.JsonUnableToDeserialize,
      error.message,
      error
    );
  } else {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Unknown error';
    return new NetworkError(-1, message, error);
  }
};

/**
 * Classify an HTTP status code according to TAPI SDD error handling tables.
 *
 * Precedence order:
 * 1. statusCodeOverrides - explicit overrides for specific codes
 * 2. 429 special handling - rate limiting (if rateLimitEnabled !== false)
 * 3. default4xxBehavior/default5xxBehavior - defaults for ranges
 * 4. fallback - non-retryable permanent error
 *
 * @param statusCode - HTTP status code to classify
 * @param config - Optional configuration for error classification
 * @returns Classification with isRetryable flag and errorType
 */
export const classifyError = (
  statusCode: number,
  config?: {
    default4xxBehavior?: 'drop' | 'retry';
    default5xxBehavior?: 'drop' | 'retry';
    statusCodeOverrides?: Record<string, 'drop' | 'retry'>;
    rateLimitEnabled?: boolean;
  }
): ErrorClassification => {
  const override = config?.statusCodeOverrides?.[statusCode.toString()];
  if (override !== undefined) {
    if (override === 'retry') {
      return statusCode === 429
        ? { isRetryable: true, errorType: 'rate_limit' }
        : { isRetryable: true, errorType: 'transient' };
    }
    return { isRetryable: false, errorType: 'permanent' };
  }

  if (statusCode === 429 && config?.rateLimitEnabled !== false) {
    return { isRetryable: true, errorType: 'rate_limit' };
  }

  if (statusCode >= 400 && statusCode < 500) {
    const behavior = config?.default4xxBehavior ?? 'drop';
    return {
      isRetryable: behavior === 'retry',
      errorType: behavior === 'retry' ? 'transient' : 'permanent',
    };
  }

  if (statusCode >= 500 && statusCode < 600) {
    const behavior = config?.default5xxBehavior ?? 'retry';
    return {
      isRetryable: behavior === 'retry',
      errorType: behavior === 'retry' ? 'transient' : 'permanent',
    };
  }

  return { isRetryable: false, errorType: 'permanent' };
};

/**
 * Parse Retry-After header value from HTTP response.
 * Supports both seconds format ("60") and HTTP-date format ("Fri, 31 Dec 2026 23:59:59 GMT").
 *
 * @param retryAfterValue - Value from Retry-After header (null if not present)
 * @param maxRetryInterval - Maximum allowed retry interval in seconds (default: 300)
 * @returns Parsed delay in seconds, clamped to maxRetryInterval, or undefined if invalid
 */
export const parseRetryAfter = (
  retryAfterValue: string | null,
  maxRetryInterval = 300
): number | undefined => {
  if (retryAfterValue === null || retryAfterValue === '') return undefined;

  // Try parsing as seconds (e.g., "60")
  const seconds = parseInt(retryAfterValue, 10);
  if (!isNaN(seconds) && seconds >= 0) {
    return Math.min(seconds, maxRetryInterval);
  }

  // Try parsing as HTTP-date (e.g., "Fri, 31 Dec 2026 23:59:59 GMT")
  const retryDate = new Date(retryAfterValue);
  if (!isNaN(retryDate.getTime())) {
    const secondsUntil = Math.ceil((retryDate.getTime() - Date.now()) / 1000);
    return Math.min(Math.max(secondsUntil, 0), maxRetryInterval);
  }

  return undefined;
};
