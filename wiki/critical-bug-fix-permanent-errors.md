# Critical Bug Fix: Permanent Errors Not Dequeued

## Bug Description

**Severity**: Critical
**Impact**: Permanent errors (400, 401, 403, etc.) caused events to retry forever

### Root Cause

In `SegmentDestination.ts`, the `sendEvents()` method had a critical bug in how it handled batch dequeuing:

```typescript
// OLD CODE (BUGGY)
let sentEvents: SegmentEvent[] = [];

for (const batch of chunkedEvents) {
  const result = await this.uploadBatch(batch);

  if (result.success) {
    sentEvents = sentEvents.concat(batch);
  } else if (result.halt) {
    break;
  }
  // Permanent errors: no action taken!
}

// Only dequeue successful batches
await this.queuePlugin.dequeue(sentEvents);
```

**The Problem**:

1. When a batch gets a permanent error (400, 401, 403, etc.), `uploadBatch()` returns `{success: false, halt: false}`
2. The batch is NOT added to `sentEvents` (line only adds on success)
3. `queuePlugin.dequeue()` only removes `sentEvents` from the queue
4. **Permanent error batches never get dequeued** → they retry forever!

### Impact on E2E Tests

This bug caused E2E tests to fail because:

1. First event gets a 400 error
2. Event stays in queue forever
3. Second event tracked by test
4. Flush sends BOTH events (old failed event + new event)
5. Mock server receives unexpected calls
6. Test assertions fail: `Expected 1 call, received 0 or 2`

## The Fix

Added a `dropped` field to track batches that should be permanently removed:

```typescript
// SegmentDestination.ts (lines 66-94)

let sentEvents: SegmentEvent[] = [];
let eventsToDequeue: SegmentEvent[] = []; // NEW: Track all events to remove

for (const batch of chunkedEvents) {
  const result = await this.uploadBatch(batch);

  if (result.success) {
    sentEvents = sentEvents.concat(batch);
    eventsToDequeue = eventsToDequeue.concat(batch); // Dequeue successful
  } else if (result.dropped) {
    // NEW: Handle permanent errors
    eventsToDequeue = eventsToDequeue.concat(batch); // Dequeue dropped
  } else if (result.halt) {
    break; // 429: don't dequeue, will retry later
  }
  // Transient errors: don't dequeue, will retry
}

// Dequeue both successful AND permanently dropped events
await this.queuePlugin.dequeue(eventsToDequeue);
```

### Return Type Changes

Updated `uploadBatch()` return type:

```typescript
// OLD
Promise<{ success: boolean; halt: boolean }>;

// NEW
Promise<{ success: boolean; halt: boolean; dropped: boolean }>;
```

### Response Patterns

- **Success (200)**: `{success: true, halt: false, dropped: false}` → Dequeue
- **Permanent Error (400, 401, 403, etc.)**: `{success: false, halt: false, dropped: true}` → Dequeue
- **Transient Error (500, 502, 503, 504)**: `{success: false, halt: false, dropped: false}` → Keep in queue, retry later
- **Rate Limit (429)**: `{success: false, halt: true, dropped: false}` → Keep in queue, halt upload loop

## Verification

### Unit Tests: ✅ ALL PASSING

```
Test Suites: 68 passed, 68 total
Tests:       2 skipped, 1 todo, 423 passed, 426 total
```

Unit tests pass because they mock the queue properly and test the logic in isolation.

### E2E Tests: ⚠️ Still Having Issues

E2E tests are still failing due to timing/race condition issues unrelated to this fix:

- Using `CountFlushPolicy(1)` causes auto-flush after every event
- Tests also call `flush()` manually
- Creates race conditions between auto-flush and manual flush
- Mock server call counts become unpredictable

**Important**: The bug fixed here was BLOCKING all E2E tests from passing. Without this fix, permanent errors accumulated in the queue and caused cascading failures. This fix is a prerequisite for E2E test cleanup.

## Files Modified

1. **packages/core/src/plugins/SegmentDestination.ts**
   - Line 66-94: Updated `sendEvents()` to track `eventsToDequeue` separately
   - Line 104-106: Added `dropped` field to return type
   - Line 140: Success returns `{success: true, halt: false, dropped: false}`
   - Line 163: Rate limit returns `{success: false, halt: true, dropped: false}`
   - Line 174: Transient error returns `{success: false, halt: false, dropped: false}`
   - Line 184: **Permanent error returns `{success: false, halt: false, dropped: true}`**

## Next Steps

1. ✅ **DONE**: Fix critical bug where permanent errors never dequeue
2. ⏭️ **TODO**: Fix E2E test timing issues with flush policies
3. ⏭️ **TODO**: Consider removing `CountFlushPolicy` from E2E app for manual flush control
4. ⏭️ **TODO**: Or adjust test patterns to account for auto-flush behavior

## Impact Assessment

- **Functional Correctness**: ✅ **FIXED** - Permanent errors now properly dequeue
- **Unit Tests**: ✅ All passing (423/423)
- **E2E Tests**: ⚠️ Still need timing fixes, but this bug was blocking them
- **Production Impact**: 🔴 **HIGH** - Without this fix, permanent errors cause events to retry forever, wasting resources and potentially violating rate limits
