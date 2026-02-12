/**
 * Error types reported through the errorHandler in the client
 */
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
  // SegmentError already
  if (error instanceof SegmentError) {
    return error;
    // JSON Deserialization Errors
  } else if (error instanceof SyntaxError) {
    return new JSONError(
      ErrorType.JsonUnableToDeserialize,
      error.message,
      error
    );

    // HTTP Errors
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
 * Classifies HTTP errors per TAPI SDD tables
 */
export const classifyError = (
  statusCode: number,
  retryableStatusCodes: number[] = [408, 410, 429, 460, 500, 502, 503, 504, 508]
): import('./types').ErrorClassification => {
  // 429 rate limiting
  if (statusCode === 429) {
    return {
      isRetryable: true,
      errorType: 'rate_limit',
    };
  }

  // Retryable transient errors
  if (retryableStatusCodes.includes(statusCode)) {
    return {
      isRetryable: true,
      errorType: 'transient',
    };
  }

  // Non-retryable (400, 401, 403, 404, 413, 422, 501, 505, etc.)
  return {
    isRetryable: false,
    errorType: 'permanent',
  };
};

/**
 * Parses Retry-After header value
 * Supports both seconds (number) and HTTP date format
 */
export const parseRetryAfter = (
  retryAfterValue: string | null,
  maxRetryInterval = 300
): number | undefined => {
  if (retryAfterValue === null || retryAfterValue === '') return undefined;

  // Try parsing as integer (seconds)
  const seconds = parseInt(retryAfterValue, 10);
  if (!isNaN(seconds)) {
    return Math.min(seconds, maxRetryInterval);
  }

  // Try parsing as HTTP date
  const retryDate = new Date(retryAfterValue);
  if (!isNaN(retryDate.getTime())) {
    const secondsUntil = Math.ceil((retryDate.getTime() - Date.now()) / 1000);
    return Math.min(Math.max(secondsUntil, 0), maxRetryInterval);
  }

  return undefined;
};
