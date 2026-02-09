# Implementation Plan: TAPI Backoff & Rate Limiting for React Native SDK

## Overview

Implement exponential backoff and 429 rate-limiting strategy per the TAPI Backoff SDD to handle API overload during high-traffic events (holidays, Super Bowl, etc.). The implementation adds:

1. **Global rate limiting** for 429 responses (blocks entire upload pipeline)
2. **Per-batch exponential backoff** for transient errors (5xx, 408, etc.)
3. **Upload gate pattern** (no timers, state-based flow control)
4. **Configurable via Settings CDN** (dynamic updates without deployments)
5. **Persistent state** across app restarts (AsyncStorage)

## Key Architectural Decisions

### Decision 1: Two-Component Architecture
- **UploadStateMachine**: Manages global READY/WAITING states for 429 rate limiting
- **BatchUploadManager**: Handles per-batch retry metadata and exponential backoff
- Both use Sovran stores for persistence, integrate into SegmentDestination

### Decision 2: Upload Gate Pattern
- No timers/schedulers to check state
- Check `canUpload()` at flush start, return early if in WAITING state
- State transitions on response (429 → WAITING, success → READY)

### Decision 3: Sequential Batch Processing
- Change from `Promise.all()` (parallel) to `for...of` loop (sequential)
- Required by SDD: "429 responses cause immediate halt of upload loop"
- Transient errors (5xx) don't block remaining batches

### Decision 4: Authentication & Headers
- **Authorization header**: Add `Basic ${base64(writeKey + ':')}` header
- **Keep writeKey in body**: Backwards compatibility with TAPI
- **X-Retry-Count header**: Send per-batch count when available, global count for 429

### Decision 5: Logging Strategy
- Verbose logging for all retry events (state transitions, backoff delays, drops)
- Use existing `analytics.logger.info()` and `.warn()` infrastructure
- Include retry count, backoff duration, and error codes in logs

## Implementation Steps

### Step 1: Add Type Definitions

**File**: `/packages/core/src/types.ts`

Add new interfaces to existing types:

```typescript
// HTTP Configuration from Settings CDN
export type HttpConfig = {
  rateLimitConfig?: RateLimitConfig;
  backoffConfig?: BackoffConfig;
};

export type RateLimitConfig = {
  enabled: boolean;
  maxRetryCount: number;
  maxRetryInterval: number;        // seconds
  maxTotalBackoffDuration: number;  // seconds
};

export type BackoffConfig = {
  enabled: boolean;
  maxRetryCount: number;
  baseBackoffInterval: number;      // seconds
  maxBackoffInterval: number;       // seconds
  maxTotalBackoffDuration: number;  // seconds
  jitterPercent: number;            // 0-100
  retryableStatusCodes: number[];
};

// Update SegmentAPISettings to include httpConfig
export type SegmentAPISettings = {
  integrations: SegmentAPIIntegrations;
  edgeFunction?: EdgeFunctionSettings;
  middlewareSettings?: {
    routingRules: RoutingRule[];
  };
  metrics?: MetricsOptions;
  consentSettings?: SegmentAPIConsentSettings;
  httpConfig?: HttpConfig;  // NEW
};

// State machine persistence
export type UploadStateData = {
  state: 'READY' | 'WAITING';
  waitUntilTime: number;          // timestamp ms
  globalRetryCount: number;
  firstFailureTime: number | null; // timestamp ms
};

// Per-batch retry metadata
export type BatchMetadata = {
  batchId: string;
  events: SegmentEvent[];         // Store events to match batches
  retryCount: number;
  nextRetryTime: number;          // timestamp ms
  firstFailureTime: number;       // timestamp ms
};

// Error classification result
export type ErrorClassification = {
  isRetryable: boolean;
  errorType: 'rate_limit' | 'transient' | 'permanent';
  retryAfterSeconds?: number;
};
```

### Step 2: Add Default Configuration

**File**: `/packages/core/src/constants.ts`

Add default httpConfig:

```typescript
export const defaultHttpConfig: HttpConfig = {
  rateLimitConfig: {
    enabled: true,
    maxRetryCount: 100,
    maxRetryInterval: 300,
    maxTotalBackoffDuration: 43200, // 12 hours
  },
  backoffConfig: {
    enabled: true,
    maxRetryCount: 100,
    baseBackoffInterval: 0.5,
    maxBackoffInterval: 300,
    maxTotalBackoffDuration: 43200,
    jitterPercent: 10,
    retryableStatusCodes: [408, 410, 429, 460, 500, 502, 503, 504, 508],
  },
};
```

### Step 3: Enhance Error Classification

**File**: `/packages/core/src/errors.ts`

Add new functions to existing error handling:

```typescript
/**
 * Classifies HTTP errors per TAPI SDD tables
 */
export const classifyError = (
  statusCode: number,
  retryableStatusCodes: number[] = [408, 410, 429, 460, 500, 502, 503, 504, 508]
): ErrorClassification => {
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
  maxRetryInterval: number = 300
): number | undefined => {
  if (!retryAfterValue) return undefined;

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
```

### Step 4: Update HTTP API Layer

**File**: `/packages/core/src/api.ts`

Modify uploadEvents to support retry headers and return full Response:

```typescript
export const uploadEvents = async ({
  writeKey,
  url,
  events,
  retryCount = 0,  // NEW: for X-Retry-Count header
}: {
  writeKey: string;
  url: string;
  events: SegmentEvent[];
  retryCount?: number;  // NEW
}): Promise<Response> => {  // Changed from void
  // Create Authorization header (Basic auth format)
  const authHeader = 'Basic ' + btoa(writeKey + ':');

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      batch: events,
      sentAt: new Date().toISOString(),
      writeKey: writeKey,  // Keep in body for backwards compatibility
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': authHeader,        // NEW
      'X-Retry-Count': retryCount.toString(),  // NEW
    },
  });

  return response;  // Return full response (not just void)
};
```

### Step 5: Create Upload State Machine

**New File**: `/packages/core/src/backoff/UploadStateMachine.ts`

(See full implementation in code)

### Step 6: Create Batch Upload Manager

**New File**: `/packages/core/src/backoff/BatchUploadManager.ts`

(See full implementation in code)

### Step 7: Create Barrel Export

**New File**: `/packages/core/src/backoff/index.ts`

```typescript
export { UploadStateMachine } from './UploadStateMachine';
export { BatchUploadManager } from './BatchUploadManager';
```

### Step 8: Integrate into SegmentDestination

**File**: `/packages/core/src/plugins/SegmentDestination.ts`

Major modifications to integrate state machine and batch manager:

(See full implementation in code)

## Testing Strategy

### Unit Tests

1. **Error Classification** (`/packages/core/src/__tests__/errors.test.ts`)
   - classifyError() for all status codes in SDD tables
   - parseRetryAfter() with seconds, HTTP dates, invalid values

2. **Upload State Machine** (`/packages/core/src/backoff/__tests__/UploadStateMachine.test.ts`)
   - canUpload() returns true/false based on state and time
   - handle429() sets waitUntilTime and increments counter
   - Max retry count enforcement
   - Max total backoff duration enforcement
   - State persistence across restarts

3. **Batch Upload Manager** (`/packages/core/src/backoff/__tests__/BatchUploadManager.test.ts`)
   - calculateBackoff() produces correct exponential values with jitter
   - handleRetry() increments retry count and schedules next retry
   - Max retry count enforcement
   - Max total backoff duration enforcement
   - Batch metadata persistence

### Integration Tests

**File**: `/packages/core/src/plugins/__tests__/SegmentDestination.test.ts`

Add test cases for:
- 429 response halts upload loop (remaining batches not processed)
- 429 response blocks future flush() calls until waitUntilTime
- Successful upload after 429 resets state machine
- Transient error (500) retries per-batch without blocking other batches
- Non-retryable error (400) drops batch immediately
- X-Retry-Count header sent with correct value
- Authorization header contains base64-encoded writeKey
- Sequential batch processing (not parallel)
- Legacy behavior when httpConfig.enabled = false

## Verification Steps

### End-to-End Testing

1. **Mock TAPI responses** in test environment
2. **Verify state persistence**: Trigger 429, close app, reopen → should still be in WAITING state
3. **Verify headers**: Intercept HTTP requests and check for Authorization and X-Retry-Count headers
4. **Verify sequential processing**: Queue 3 batches, return 429 on first → only 1 fetch call should occur
5. **Verify logging**: Check logs for "Rate limited", "Batch uploaded successfully", "retry scheduled" messages

### Manual Testing Checklist

- [ ] Test with real TAPI endpoint during low-load period
- [ ] Trigger 429 by sending many events quickly
- [ ] Verify retry happens after Retry-After period
- [ ] Verify batches are dropped after max retry count
- [ ] Verify batches are dropped after max total backoff duration (12 hours)
- [ ] Test app restart during WAITING state (should persist)
- [ ] Test legacy behavior with httpConfig.enabled = false
- [ ] Verify no breaking changes to existing event tracking

## Critical Files

### New Files (3)
1. `/packages/core/src/backoff/UploadStateMachine.ts` - Global rate limiting state machine
2. `/packages/core/src/backoff/BatchUploadManager.ts` - Per-batch retry and backoff
3. `/packages/core/src/backoff/index.ts` - Barrel export

### Modified Files (5)
1. `/packages/core/src/types.ts` - Add HttpConfig, UploadStateData, BatchMetadata types
2. `/packages/core/src/errors.ts` - Add classifyError() and parseRetryAfter()
3. `/packages/core/src/api.ts` - Add retryCount param and Authorization header
4. `/packages/core/src/plugins/SegmentDestination.ts` - Integrate state machine and batch manager
5. `/packages/core/src/constants.ts` - Add defaultHttpConfig

### Test Files (3 new + 1 modified)
1. `/packages/core/src/backoff/__tests__/UploadStateMachine.test.ts`
2. `/packages/core/src/backoff/__tests__/BatchUploadManager.test.ts`
3. `/packages/core/src/__tests__/errors.test.ts` - Add classification tests
4. `/packages/core/src/plugins/__tests__/SegmentDestination.test.ts` - Add integration tests

## Rollout Strategy

1. **Phase 1**: Implement and test in development with `enabled: false` (default to legacy behavior)
2. **Phase 2**: Enable in staging with verbose logging, monitor for issues
3. **Phase 3**: Update Settings CDN to include httpConfig with `enabled: true`
4. **Phase 4**: Monitor production metrics (retry count, drop rate, 429 frequency)
5. **Phase 5**: Tune configuration parameters based on real-world data

## Success Metrics

- Reduction in 429 responses from TAPI during high-load events
- Reduction in repeated failed upload attempts from slow clients
- No increase in event loss rate (should be same or better)
- Successful state persistence across app restarts
- No performance degradation in normal operation

## Implementation Status

**Status**: ✅ COMPLETE (2026-02-09)

All implementation steps have been completed:
- ✅ Type definitions added
- ✅ Default configuration added
- ✅ Error classification functions implemented
- ✅ API layer updated with retry headers
- ✅ Upload State Machine implemented
- ✅ Batch Upload Manager implemented
- ✅ Integration into SegmentDestination complete
- ✅ TypeScript compilation successful

**Next Steps**:
1. Write unit tests for error classification functions
2. Write unit tests for UploadStateMachine
3. Write unit tests for BatchUploadManager
4. Add integration tests to SegmentDestination.test.ts
5. Perform end-to-end testing
6. Update Settings CDN configuration
