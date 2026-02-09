# TAPI Backoff & Rate Limiting - Developer Summary

## Overview

This document provides a quick reference for developers working with the TAPI backoff and rate limiting implementation in the React Native SDK.

## Key Concepts

### Two-Layer Retry Strategy

1. **Global Rate Limiting (429 responses)**
   - Managed by `UploadStateMachine`
   - Blocks entire upload pipeline
   - Uses Retry-After header from server
   - State persists across app restarts

2. **Per-Batch Exponential Backoff (5xx, 408, etc.)**
   - Managed by `BatchUploadManager`
   - Applied per batch independently
   - Uses exponential backoff with jitter
   - Other batches continue processing

### Upload Gate Pattern

**No timers** - Instead of scheduling retries with timers, the system checks `canUpload()` when flush is triggered:

```typescript
// Before attempting upload
if (this.uploadStateMachine) {
  const canUpload = await this.uploadStateMachine.canUpload();
  if (!canUpload) {
    return; // Defer upload
  }
}
```

Benefits:
- Saves battery life
- Prevents memory leaks
- Simpler implementation
- Natural backpressure

### Sequential Batch Processing

**IMPORTANT**: Batches are now processed sequentially (not parallel):

```typescript
// OLD (parallel) - DON'T USE
await Promise.all(chunkedEvents.map(batch => upload(batch)));

// NEW (sequential) - REQUIRED
for (const batch of chunkedEvents) {
  const result = await this.uploadBatch(batch);
  if (result.halt) break; // 429 halts immediately
}
```

Why: 429 responses must halt the entire upload loop immediately per TAPI requirements.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SegmentDestination                        │
│                                                              │
│  sendEvents() ──> canUpload()? ──> Sequential Loop          │
│                      │                    │                  │
│                      v                    v                  │
│              ┌─────────────┐      ┌──────────────┐          │
│              │   Upload    │      │   Batch      │          │
│              │   State     │      │   Upload     │          │
│              │   Machine   │      │   Manager    │          │
│              │             │      │              │          │
│              │ - READY     │      │ - Per-batch  │          │
│              │ - WAITING   │      │   retry      │          │
│              │ - 429 state │      │ - Exponential│          │
│              │             │      │   backoff    │          │
│              └─────────────┘      └──────────────┘          │
│                      │                    │                  │
│                      v                    v                  │
│              ┌─────────────────────────────────┐            │
│              │      Sovran Persistence         │            │
│              │  (AsyncStorage via storePersistor) │         │
│              └─────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
packages/core/src/
├── backoff/
│   ├── UploadStateMachine.ts      # Global 429 rate limiting
│   ├── BatchUploadManager.ts      # Per-batch exponential backoff
│   └── index.ts                   # Barrel exports
├── types.ts                       # HttpConfig, UploadStateData, etc.
├── constants.ts                   # defaultHttpConfig
├── errors.ts                      # classifyError(), parseRetryAfter()
├── api.ts                         # uploadEvents() with retry headers
└── plugins/
    └── SegmentDestination.ts      # Integration point
```

## Configuration

All retry behavior is configurable via Settings CDN:

```typescript
{
  "httpConfig": {
    "rateLimitConfig": {
      "enabled": true,              // Set to false for legacy behavior
      "maxRetryCount": 100,
      "maxRetryInterval": 300,      // Max Retry-After value (seconds)
      "maxTotalBackoffDuration": 43200  // 12 hours
    },
    "backoffConfig": {
      "enabled": true,              // Set to false for legacy behavior
      "maxRetryCount": 100,
      "baseBackoffInterval": 0.5,
      "maxBackoffInterval": 300,
      "maxTotalBackoffDuration": 43200,
      "jitterPercent": 10,
      "retryableStatusCodes": [408, 410, 429, 460, 500, 502, 503, 504, 508]
    }
  }
}
```

**Legacy Behavior**: Set `enabled: false` to disable retry logic and revert to original behavior (no delays, no drops, try everything on every flush).

## HTTP Headers

Two new headers are added to all TAPI requests:

1. **Authorization**: `Basic ${base64(writeKey + ':')}`
   - Follows TAPI authentication requirements
   - writeKey still kept in body for backwards compatibility

2. **X-Retry-Count**: Numeric string (`"0"`, `"1"`, `"2"`, etc.)
   - Per-batch retry count if available
   - Falls back to global retry count for 429 responses
   - Starts at 0 for initial requests

## Error Handling

### Error Classification

All HTTP responses are classified into three categories:

```typescript
type ErrorClassification = {
  isRetryable: boolean;
  errorType: 'rate_limit' | 'transient' | 'permanent';
  retryAfterSeconds?: number; // Only for 429
};
```

### Response Flow

```
HTTP Response
    │
    ├─> 2xx → Success
    │   ├─> Reset UploadStateMachine
    │   └─> Remove batch metadata
    │
    ├─> 429 → Rate Limit
    │   ├─> Parse Retry-After header
    │   ├─> Call uploadStateMachine.handle429()
    │   └─> HALT upload loop (result.halt = true)
    │
    ├─> 5xx/408/410/460/508 → Transient Error
    │   ├─> Calculate exponential backoff
    │   ├─> Call batchUploadManager.handleRetry()
    │   └─> Continue to next batch
    │
    └─> 400/401/403/404/413/422/501/505 → Permanent Error
        ├─> Log warning
        ├─> Remove batch metadata
        └─> DROP events (data loss)
```

## State Persistence

Both components use Sovran stores for persistence:

```typescript
// Upload state persisted as: `${writeKey}-uploadState`
{
  state: 'READY' | 'WAITING',
  waitUntilTime: number,          // timestamp ms
  globalRetryCount: number,
  firstFailureTime: number | null
}

// Batch metadata persisted as: `${writeKey}-batchMetadata`
{
  batches: {
    [batchId]: {
      batchId: string,
      events: SegmentEvent[],
      retryCount: number,
      nextRetryTime: number,        // timestamp ms
      firstFailureTime: number
    }
  }
}
```

**Important**: State survives app restarts via AsyncStorage!

## Exponential Backoff Formula

```typescript
backoffTime = min(
  baseBackoffInterval * 2^retryCount,
  maxBackoffInterval
) + jitter

// Where jitter = random(0, backoffTime * jitterPercent / 100)
```

Example progression (baseBackoffInterval=0.5s, jitterPercent=10):
- Retry 1: ~0.5s + jitter
- Retry 2: ~1s + jitter
- Retry 3: ~2s + jitter
- Retry 4: ~4s + jitter
- Retry 5: ~8s + jitter
- ...
- Retry 10: ~300s + jitter (capped at maxBackoffInterval)

## Drop Conditions

Batches are dropped (data loss) when:

1. **Permanent errors**: 400, 401, 403, 404, 413, 422, 501, 505
2. **Max retry count exceeded**: retryCount > maxRetryCount (default: 100)
3. **Max backoff duration exceeded**: (now - firstFailureTime) > maxTotalBackoffDuration (default: 12 hours)

When dropped, a warning is logged with batch details.

## Logging

All retry events are logged:

```typescript
// Rate limiting
logger.info('Rate limited (429): waiting 60s before retry 1/100')
logger.info('Upload blocked: rate limited, retry in 45s (retry 1/100)')
logger.info('Upload state reset to READY')

// Batch retries
logger.info('Batch abc-123: retry 1/100 scheduled in 0.5s (status 500)')
logger.warn('Batch abc-123: max retry count exceeded (100), dropping batch')

// Success
logger.info('Batch uploaded successfully (20 events)')

// Permanent errors
logger.warn('Permanent error (400): dropping batch (20 events)')
```

## Common Patterns

### Checking Upload State

```typescript
const canUpload = await this.uploadStateMachine?.canUpload();
if (!canUpload) {
  // Pipeline is rate-limited, defer this flush
  return;
}
```

### Processing a Batch

```typescript
const result = await this.uploadBatch(batch);

if (result.success) {
  sentEvents = sentEvents.concat(batch);
} else if (result.halt) {
  // 429 response: stop processing remaining batches
  break;
}
// Transient error: continue to next batch
```

### Getting Retry Count

```typescript
// Prefer per-batch count, fall back to global for 429
const batchRetryCount = await this.batchUploadManager.getBatchRetryCount(batchId);
const globalRetryCount = await this.uploadStateMachine.getGlobalRetryCount();
const retryCount = batchRetryCount > 0 ? batchRetryCount : globalRetryCount;
```

## Testing Considerations

### Mocking TAPI Responses

```typescript
// Mock 429 rate limiting
nock('https://api.segment.io')
  .post('/v1/b')
  .reply(429, {}, { 'Retry-After': '10' });

// Mock transient 500 error
nock('https://api.segment.io')
  .post('/v1/b')
  .reply(500);

// Mock success after retry
nock('https://api.segment.io')
  .post('/v1/b')
  .reply(200);
```

### Verifying Sequential Processing

```typescript
// Ensure only 1 request made when first batch returns 429
const uploadSpy = jest.spyOn(api, 'uploadEvents');
await destination.sendEvents([...manyEvents]);
expect(uploadSpy).toHaveBeenCalledTimes(1); // Not 3!
```

### Verifying State Persistence

```typescript
// Trigger 429, check state is saved
await destination.sendEvents([event]);
const state = await uploadStateMachine.store.getState();
expect(state.state).toBe('WAITING');

// Restart (new instance), state should be restored
const newStateMachine = new UploadStateMachine(...);
const restoredState = await newStateMachine.store.getState();
expect(restoredState.state).toBe('WAITING');
```

## Backwards Compatibility

The implementation maintains full backwards compatibility:

1. **Legacy behavior available**: Set `httpConfig.*.enabled = false` in Settings CDN
2. **No breaking API changes**: All changes are internal to SegmentDestination
3. **Graceful fallbacks**: If components aren't initialized (no persistor), code continues without errors
4. **writeKey in body**: Still sent for older TAPI versions

## Performance Considerations

1. **No timers**: Upload gate pattern eliminates timer overhead
2. **Minimal state**: Only store necessary retry metadata
3. **Async operations**: All state checks are async to avoid blocking
4. **Sequential processing**: Slightly slower than parallel, but required for correctness

## Troubleshooting

### Events Not Uploading

1. Check upload state: Is pipeline in WAITING state?
2. Check logs for "Upload blocked" messages
3. Verify waitUntilTime hasn't passed
4. Check if maxRetryCount or maxTotalBackoffDuration exceeded

### Excessive Retries

1. Verify retryableStatusCodes configuration
2. Check if baseBackoffInterval is too low
3. Ensure maxBackoffInterval is set reasonably
4. Review logs for retry patterns

### Data Loss

1. Check for "dropping batch" warnings in logs
2. Verify maxRetryCount isn't too low
3. Ensure maxTotalBackoffDuration allows enough retry time
4. Check for permanent error codes (400, 401, etc.)

## References

- [TAPI Backoff SDD](./tapi-backoff-sdd.md)
- [TAPI Backoff Implementation Plan](./tapi-backoff-plan.md)
- [Client <> TAPI Statuscode Agreements](https://docs.google.com/document/d/1CQNvh8kIZqDnyJP5et7QBN5Z3mWJpNBS_X5rYhofmWc/edit?usp=sharing)
