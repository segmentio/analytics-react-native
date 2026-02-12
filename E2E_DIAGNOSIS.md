# E2E Test Failures - Full Diagnostic Analysis

## Evidence Collected

### 1. Test Failure Pattern

From multiple test runs, consistent pattern observed:

- **Mock server receives**: Settings requests (`/v1/projects/yup/settings`) ✅
- **Mock server NEVER receives**: Batch upload requests (`/v1/b`) ❌
- **Error pattern**: `Expected number of calls: >= 1, Received number of calls: 0`

### 2. Test Behavior

```
Before each test:
1. Mock server starts successfully ("🚀 Started mock server on port 9091")
2. Settings endpoint works ("➡️ Replying with Settings")
3. Device reloads React Native
4. clearLifecycleEvents() is called (manual flush)
5. Test tracks events and calls flush
6. Mock server receives 0 batch upload requests
```

### 3. Code Changes from Master

**SegmentDestination.ts sendEvents() method:**

- Master: Used `Promise.all()` for parallel batch uploads
- Current: Changed to sequential `for` loop with `await uploadBatch()`
- Added: Backoff components (UploadStateMachine, BatchUploadManager)
- Added: `eventsToDequeue` tracking for permanent errors

**Key difference in dequeuing:**

```typescript
// MASTER: Dequeue in finally block after each batch
try {
  await uploadEvents(...)
  sentEvents = sentEvents.concat(batch);
} catch (e) {
  ...
} finally {
  await this.queuePlugin.dequeue(sentEvents);
}

// CURRENT: Dequeue once at end after all batches
let eventsToDequeue: SegmentEvent[] = [];
for (const batch of chunkedEvents) {
  const result = await this.uploadBatch(batch);
  if (result.success || result.dropped) {
    eventsToDequeue = eventsToDequeue.concat(batch);
  }
}
await this.queuePlugin.dequeue(eventsToDequeue);
```

### 4. Backoff Component Initialization

In `SegmentDestination.update()` (line 259):

```typescript
void import('../backoff').then(({ UploadStateMachine, BatchUploadManager }) => {
  this.uploadStateMachine = new UploadStateMachine(...);
  this.batchUploadManager = new BatchUploadManager(...);
});
this.settingsResolve();  // Called immediately, not awaited
```

**Timing issue**: Settings are marked as loaded BEFORE backoff components finish initializing.

### 5. Upload Gate Check

In `sendEvents()` (line 50-56):

```typescript
if (this.uploadStateMachine) {
  const canUpload = await this.uploadStateMachine.canUpload();
  if (!canUpload) {
    return Promise.resolve(); // Silently returns without uploading
  }
}
```

**Issue**: If `uploadStateMachine` exists but isn't ready, it might return false and block uploads.

### 6. Mock Server Settings Response

```javascript
app.get('/v1/projects/yup/settings', (req, res) => {
  res.status(200).send({
    integrations: {
      'Segment.io': {},
    },
  });
});
```

**Missing**: No `httpConfig` in settings response.
**Result**: Code uses `defaultHttpConfig` which has rate limiting ENABLED:

```typescript
const defaultHttpConfig: HttpConfig = {
  rateLimitConfig: {
    enabled: true,  // ← Rate limiting ON by default
    maxRetryCount: 100,
    ...
  },
  backoffConfig: {
    enabled: true,  // ← Backoff ON by default
    ...
  },
};
```

### 7. Unit Test Success

All 423 unit tests pass, including backoff tests. **Why?**

- Unit tests mock the store and components directly
- Unit tests don't rely on dynamic import timing
- Unit tests test components in isolation

## Root Cause Hypothesis

### Most Likely: Race Condition in Component Initialization

**Sequence of events:**

1. App launches, settings loaded
2. `SegmentDestination.update()` called
3. `settingsResolve()` marks settings as ready (line 279)
4. `void import('../backoff')` starts async import (line 259)
5. First flush happens (lifecycle events) - backoff components likely NOT ready yet
   - `this.uploadStateMachine` is undefined
   - Upload proceeds successfully ✅
6. Backoff components finish initializing
7. Second flush happens (test events)
   - `this.uploadStateMachine` now exists
   - BUT the sovran store might not be initialized yet
   - `canUpload()` might fail or return unexpected value
   - Upload silently blocked ❌

### Secondary Issue: Store Initialization Timing

`UploadStateMachine` constructor creates a sovran store:

```typescript
this.store = createStore<UploadStateData>(
  INITIAL_STATE, // state: 'READY'
  persistor ? { persist: { storeId, persistor } } : undefined
);
```

**In E2E environment:**

- No persistor (App.tsx has it commented out)
- Store should be in-memory and immediate
- But `canUpload()` does `await this.store.getState()`
- First call might hit uninitialized store?

## Evidence Supporting This Hypothesis

1. ✅ First flush (lifecycle) works - backoff not ready yet
2. ✅ Subsequent flushes fail - backoff initialized but problematic
3. ✅ Unit tests pass - mocked components, no timing issues
4. ✅ Settings requests work - they happen before backoff init
5. ✅ No error messages - upload silently returns early

## Recommended Fix

### Option A: Await backoff initialization

```typescript
this.settingsPromise = (async () => {
  await import('../backoff').then(({ UploadStateMachine, BatchUploadManager }) => {
    this.uploadStateMachine = new UploadStateMachine(...);
    this.batchUploadManager = new BatchUploadManager(...);
  });
  this.settingsResolve();
})();
```

### Option B: Make backoff components optional

```typescript
// Only check if components are FULLY initialized
if (this.uploadStateMachine && this.batchUploadManager) {
  const canUpload = await this.uploadStateMachine.canUpload();
  if (!canUpload) {
    return Promise.resolve();
  }
}
```

### Option C: Add ready state check

```typescript
private backoffReady = false;

void import('../backoff').then(({ UploadStateMachine, BatchUploadManager }) => {
  this.uploadStateMachine = new UploadStateMachine(...);
  this.batchUploadManager = new BatchUploadManager(...);
  this.backoffReady = true;
});

// In sendEvents():
if (this.backoffReady && this.uploadStateMachine) {
  const canUpload = await this.uploadStateMachine.canUpload();
  ...
}
```

## Additional Issues Found

### 1. Missing setMockBehavior in mockServer.js

The test files reference `setMockBehavior()` but it's not exported from mockServer.js on master branch.

### 2. Sequential vs Parallel Upload

Master used `Promise.all()` for parallel uploads. We changed to sequential. While this matches the SDD spec, it might interact poorly with the test timing.

## Next Steps for Validation

1. Add console.log to UploadStateMachine.canUpload() to see if it's being called
2. Add console.log to track backoff component initialization timing
3. Check if store.getState() is returning properly
4. Verify settingsPromise resolution timing relative to backoff init
