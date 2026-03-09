# React Native SDK Architecture Analysis

**Repository:** https://github.com/segmentio/analytics-react-native
**Date:** 2026-03-06
**Status:** Complete ✅

---

## Executive Summary

The React Native SDK uses a **persistent queue** with **volatile/transient batches**. Events are persisted individually, but batches are recreated on-demand at flush time. **No stable batch identities exist** — batch composition changes based on queue state and max size constraints.

**Key Findings:**
- ✅ Events persist across app restarts (Sovran + AsyncStorage)
- ❌ Batches do NOT persist (ephemeral, recreated per flush)
- ❌ No batch IDs or stable batch identity
- ✅ Parallel batch uploads (Promise.all)
- ⚠️ Potential dequeue race condition identified
- ❌ No explicit retry/backoff logic (relies on next flush cycle)

---

## 1. Event Lifecycle

### 1.1 Event Creation (`analytics.track()`)

**File:** `packages/core/src/analytics.ts:641-653`

```typescript
async track(eventName: string, options?: JsonMap, enrichment?: EnrichmentClosure) {
  const event = createTrackEvent({
    event: eventName,
    properties: options,
  });

  await this.process(event, enrichment);
  this.logger.info('TRACK event saved', event);
}
```

**Flow:**
1. Create event object with UUID `messageId` and timestamp
2. Call `process(event, enrichment)` (lines 507-524)
3. If client running & ready: → `startTimelineProcessing()`
4. If NOT running: → buffer in `store.pendingEvents` (max 1000 events)

### 1.2 Event Queueing

**File:** `packages/core/src/plugins/QueueFlushingPlugin.ts:64-70`

```typescript
async execute(event: SegmentEvent): Promise<SegmentEvent | undefined> {
  await this.queueStore?.dispatch((state) => {
    const events = [...state.events, event];
    return { events };
  });
  return event;
}
```

**Queue Characteristics:**
- **Type:** `PluginType.after` — executes AFTER all timeline processing
- **Storage:** Sovran store with unique ID per writeKey
- **Persistence:** YES — persisted via `config.storePersistor` (AsyncStorage)
- **Save Delay:** 0ms (synchronous persistence)
- **Restoration:** On app startup via `onInitialized` callback (lines 56-58)
- **Structure:** Simple array of events: `{ events: SegmentEvent[] }`

---

## 2. Flush Triggers

### 2.1 Timer-Based Flush

**File:** `packages/core/src/flushPolicies/timer-flush-policy.ts:9-45`

- **Interval:** 30 seconds (default, configurable)
- **Constant:** `defaultFlushInterval` (constants.ts:45)
- **Behavior:** Timer resets on each event
- **Trigger:** Sets `shouldFlush.value = true`

### 2.2 Count-Based Flush

**File:** `packages/core/src/flushPolicies/count-flush-policy.ts:7-31`

- **Threshold:** 20 events (default, configurable)
- **Constant:** `defaultFlushAt` (constants.ts:44)
- **Behavior:** Counter increments per event
- **Trigger:** Sets `shouldFlush.value = true` when count >= threshold

### 2.3 Manual Flush

**File:** `packages/core/src/analytics.ts:598-625`

- Called via `client.flush()`
- Also triggered after pending events processed during init (line 328)

---

## 3. Batch Creation Strategy

### 3.1 Chunking Algorithm

**File:** `packages/core/src/util.ts:27-60`

```typescript
export const chunk = <T>(array: T[], count: number, maxKB?: number): T[][] => {
  let currentChunk = 0;
  let rollingKBSize = 0;

  const result: T[][] = array.reduce((chunks: T[][], item: T, index: number) => {
    // Size constraint check (primary)
    if (maxKB !== undefined) {
      rollingKBSize += sizeOf(item);
      if (rollingKBSize >= maxKB) {
        chunks[++currentChunk] = [item];
        return chunks;
      }
    }

    // Count constraint check (secondary)
    if (index !== 0 && index % count === 0) {
      chunks[++currentChunk] = [item];
    } else {
      if (chunks[currentChunk] === undefined) {
        chunks[currentChunk] = [];
      }
      chunks[currentChunk].push(item);
    }

    return chunks;
  }, []);

  return result;
};
```

**Chunking Strategy:**
1. **Size constraint first:** If payload exceeds maxKB, create new chunk
2. **Count constraint second:** If event count reaches max, create new chunk
3. **Size calculation:** `sizeOf()` encodes to URI and counts bytes (lines 5-8)

### 3.2 Batch Size Limits

**File:** `packages/core/src/constants.ts:18-19` & `packages/core/src/plugins/SegmentDestination.ts:47-51`

```typescript
const MAX_EVENTS_PER_BATCH = 100;
const MAX_PAYLOAD_SIZE_IN_KB = 500;

// In sendEvents():
const chunkedEvents: SegmentEvent[][] = chunk(
  events,
  config.maxBatchSize ?? MAX_EVENTS_PER_BATCH,  // 100 events
  MAX_PAYLOAD_SIZE_IN_KB                          // 500 KB
);
```

**Limits:**
- **Max events per batch:** 100 (or `config.maxBatchSize`)
- **Max payload size:** 500 KB
- **Max queue size:** 1000 events (`maxPendingEvents`, constants.ts:19)

### 3.3 Batch Creation Timing

**File:** `packages/core/src/plugins/SegmentDestination.ts:37-87`

```typescript
private sendEvents = async (events: SegmentEvent[]): Promise<void> => {
  if (events.length === 0) {
    return Promise.resolve();
  }

  await this.settingsPromise;

  const config = this.analytics?.getConfig() ?? defaultConfig;

  const chunkedEvents: SegmentEvent[][] = chunk(
    events,
    config.maxBatchSize ?? MAX_EVENTS_PER_BATCH,
    MAX_PAYLOAD_SIZE_IN_KB
  );

  // Upload batches...
};
```

**Batch Characteristics:**
- ❌ **NOT pre-created** — batches created on-demand at flush time
- ❌ **NOT persisted** — only event queue is persisted
- ❌ **NO stable identity** — `chunk()` is called fresh each flush
- ✅ **Deterministic** — given same queue state, produces same batches
- ⚠️ **Volatile** — batch composition changes if queue state changes

---

## 4. Batch Identity Analysis

### 4.1 Batch Identification

**Finding:** ❌ **NO STABLE BATCH IDS EXIST**

**Evidence:**

1. **No ID field in batch uploads** (api.ts:3-24):
```typescript
return await fetch(url, {
  method: 'POST',
  keepalive: true,
  body: JSON.stringify({
    batch: events,                      // No batch ID
    sentAt: new Date().toISOString(),  // Timestamp only
    writeKey: writeKey,
  }),
  // ...
});
```

2. **Batches recreated per flush** (SegmentDestination.ts:47-51):
```typescript
const chunkedEvents: SegmentEvent[][] = chunk(
  events,  // Fresh chunking each flush
  config.maxBatchSize ?? MAX_EVENTS_PER_BATCH,
  MAX_PAYLOAD_SIZE_IN_KB
);
```

3. **No batch object persistence** (QueueFlushingPlugin.ts:43-62):
```typescript
this.queueStore = createStore(
  { events: [] as SegmentEvent[] },  // Only stores events, not batches
  // ...
);
```

### 4.2 Batch Composition on Retry

**Question:** If an upload fails, is the same batch retried?

**Answer:** ⚠️ **YES and NO**

- **YES** — Same events will be re-chunked on next flush
- **NO** — Not technically the "same batch" (no identity, recreated)
- **Depends on** — Queue state between flushes (if new events added, chunks different)

**Example Scenario:**

```
Flush 1:
  Queue: [E1, E2, E3, E4, E5]
  Chunks: [[E1, E2, E3], [E4, E5]]
  Upload: Batch 1 fails (E1-E3), Batch 2 succeeds (E4-E5)
  Dequeue: E4, E5 removed
  Queue after: [E1, E2, E3]

Flush 2 (30s later):
  New events: E6, E7 arrive
  Queue: [E1, E2, E3, E6, E7]
  Chunks: [[E1, E2, E3], [E6, E7]]  // E1-E3 same composition
  Upload: Both batches attempted
```

**Conclusion:** Failed batch composition is STABLE if no new events added between flushes. If new events arrive, chunking may differ.

---

## 5. Storage & Persistence

### 5.1 Storage Architecture

**File:** `packages/core/src/storage/sovranStorage.ts` & `packages/sovran/`

**Stack:**
```
┌─────────────────────────────────────┐
│   Analytics Client (analytics.ts)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  QueueFlushingPlugin (queue layer)  │
│  - Manages event queue               │
│  - Triggers flush policies           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Sovran Store (state management)   │
│  - Reactive state container          │
│  - Persistence integration           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Persistor (AsyncStorage wrapper)  │
│  - Key-value storage                 │
│  - Survives app restarts             │
└─────────────────────────────────────┘
```

### 5.2 What Gets Persisted?

**Persisted:**
- ✅ Event queue (array of SegmentEvent objects)
- ✅ User info (anonymousId, userId, traits)
- ✅ App context (device, os, network info)
- ✅ Settings (integrations, filters, consent)

**NOT Persisted:**
- ❌ Batch objects (don't exist beyond upload attempt)
- ❌ Batch metadata (retry counts, failure times)
- ❌ Upload state (in-flight uploads lost on crash)

### 5.3 Persistence Configuration

**File:** `packages/core/src/plugins/QueueFlushingPlugin.ts:43-62`

```typescript
this.queueStore = createStore(
  { events: [] as SegmentEvent[] },
  {
    persist: {
      storeId: `${config.writeKey}-${this.storeKey}`,  // Unique per writeKey
      persistor: config.storePersistor,                  // AsyncStorage
      saveDelay: config.storePersistorSaveDelay ?? 0,   // 0ms = synchronous
      onInitialized: () => {
        this.isRestoredResolve();
      },
    },
  }
);
```

**Characteristics:**
- **Synchronous writes** (saveDelay: 0ms) — every event immediately persisted
- **Unique store per writeKey** — supports multiple Analytics instances
- **Restoration on startup** — `onInitialized` callback fires when restored

### 5.4 Crash Recovery

**Scenario:** App crashes during upload

**What survives:**
- ✅ All queued events (persisted synchronously)
- ✅ User identity and context
- ✅ Settings

**What's lost:**
- ❌ In-flight upload state (which batches were uploading)
- ❌ Retry metadata (if any existed)
- ❌ Failure timestamps

**Recovery behavior:**
1. App restarts
2. Sovran restores event queue from AsyncStorage
3. Flush policies re-activate (timer, count)
4. Events re-chunked and re-uploaded on next flush

---

## 6. Concurrency Model

### 6.1 JavaScript Threading

**Platform:** React Native (single-threaded JavaScript runtime)

**Constraints:**
- ❌ No true parallelism (single JS thread)
- ✅ Asynchronous operations (async/await, Promises)
- ✅ Non-blocking I/O (network, storage)
- ⚠️ All code runs on main thread (can block UI if CPU-heavy)

### 6.2 Batch Upload Concurrency

**File:** `packages/core/src/plugins/SegmentDestination.ts:56-74`

```typescript
await Promise.all(
  chunkedEvents.map(async (batch: SegmentEvent[]) => {
    try {
      const res = await uploadEvents({
        writeKey: config.writeKey,
        url: this.getEndpoint(),
        events: batch,
      });
      checkResponseForErrors(res);
      sentEvents = sentEvents.concat(batch);
    } catch (e) {
      this.analytics?.reportInternalError(translateHTTPError(e));
      this.analytics?.logger.warn(e);
      numFailedEvents += batch.length;
    } finally {
      await this.queuePlugin.dequeue(sentEvents);
    }
  })
);
```

**Upload Pattern:**
- ✅ **Parallel uploads** — `Promise.all()` fires all requests concurrently
- ✅ **Non-blocking** — uses `fetch()` API (async I/O)
- ❌ **No upload limit** — all batches fire at once (could be 10+)
- ⚠️ **No isolation** — all uploads share same `sentEvents` accumulator

### 6.3 Error Isolation

**Current behavior:**
- ✅ One batch failing doesn't stop other batches (try/catch per batch)
- ❌ Shared `sentEvents` accumulator creates race condition potential
- ❌ Failed batches have no metadata tracking (retry count, timestamps)

---

## 7. Plugin Architecture

### 7.1 Plugin System Overview

**File:** `packages/core/src/plugin.ts` & `packages/core/src/timeline.ts`

**Plugin Types:**
```typescript
export enum PluginType {
  before = 'before',       // Pre-processing
  enrichment = 'enrichment', // Add data to events
  destination = 'destination', // Send to external services
  after = 'after',          // Post-processing (queue, logging)
  utility = 'utility',      // Misc functionality
}
```

### 7.2 Event Pipeline

**File:** `packages/core/src/timeline.ts:64-135`

```
Event Created
     ↓
[Before Plugins] → Validation, transformation
     ↓
[Enrichment Plugins] → Add context, traits, etc.
     ↓
[Destination Plugins] → Segment, Amplitude, etc.
     ↓
[After Plugins] → QueueFlushingPlugin (storage)
     ↓
Queue Persisted
```

### 7.3 QueueFlushingPlugin Position

**Type:** `PluginType.after` (SegmentDestination.ts:15)

**Why "after"?**
- Executes AFTER all timeline processing
- Ensures event is fully enriched before queueing
- Last chance to persist before event lost

### 7.4 SegmentDestination Plugin

**Type:** `PluginType.destination`

**Responsibilities:**
- Upload events to Segment API
- Manage flush lifecycle
- Handle errors and dequeue successes

---

## 8. Error Handling & Retry

### 8.1 Current Error Handling

**File:** `packages/core/src/plugins/SegmentDestination.ts:66-72`

```typescript
} catch (e) {
  this.analytics?.reportInternalError(translateHTTPError(e));
  this.analytics?.logger.warn(e);
  numFailedEvents += batch.length;
}
```

**Error Response:**
- ✅ Errors logged and reported
- ✅ Failed events remain in queue
- ❌ No retry logic (waits for next flush)
- ❌ No backoff or delay
- ❌ No error classification (all treated same)

### 8.2 Dequeue Logic

**File:** `packages/core/src/plugins/QueueFlushingPlugin.ts:120-132`

```typescript
async dequeue(events: SegmentEvent | SegmentEvent[]) {
  await this.queueStore?.dispatch((state) => {
    const eventsToRemove = Array.isArray(events) ? events : [events];

    if (eventsToRemove.length === 0 || state.events.length === 0) {
      return state;
    }

    const setToRemove = new Set(eventsToRemove);
    const filteredEvents = state.events.filter((e) => !setToRemove.has(e));
    return { events: filteredEvents };
  });
}
```

**Dequeue Strategy:**
- **Mechanism:** Object reference equality (Set membership, line 128)
- **Behavior:** Removes events that match references in `eventsToRemove`
- **Persistence:** Sovran automatically persists updated queue

### 8.3 Retry Mechanism

**Explicit Retry:** ❌ NONE

**Implicit Retry:**
- Failed events stay in persistent queue
- Next flush cycle (timer or count trigger) re-attempts upload
- Same events re-chunked and re-uploaded
- No delay or backoff between retries

**Retry Frequency:**
- Timer-based: Every 30 seconds
- Count-based: When 20 new events added
- Manual: When `client.flush()` called

---

## 9. Critical Issues Identified

### 9.1 Dequeue Race Condition

**Location:** `SegmentDestination.ts:56-74`

**Problem:** The `finally` block dequeues using shared `sentEvents` accumulator:

```typescript
let sentEvents: SegmentEvent[] = [];

await Promise.all(
  chunkedEvents.map(async (batch: SegmentEvent[]) => {
    try {
      // ...
      sentEvents = sentEvents.concat(batch);  // Shared accumulator
    } catch (e) {
      // batch NOT added to sentEvents
    } finally {
      await this.queuePlugin.dequeue(sentEvents);  // Called per batch
    }
  })
);
```

**Race Condition:**
- Batch 1 succeeds → `sentEvents = [batch1]` → dequeue([batch1])
- Batch 2 fails → `sentEvents` still `[batch1]` → dequeue([batch1]) again
- Batch 3 succeeds → `sentEvents = [batch1, batch3]` → dequeue([batch1, batch3])

**Impact:**
- Successful events may be dequeued multiple times
- Sovran's Set-based removal should handle this gracefully (idempotent)
- But inefficient and could cause race conditions under heavy load

**Recommended Fix:**
```typescript
await Promise.all(
  chunkedEvents.map(async (batch: SegmentEvent[]) => {
    try {
      await uploadEvents({ ... });
      return { success: true, batch };
    } catch (e) {
      return { success: false, batch };
    }
  })
).then(results => {
  const successful = results
    .filter(r => r.success)
    .flatMap(r => r.batch);
  await this.queuePlugin.dequeue(successful);  // Dequeue once
});
```

### 9.2 No Exponential Backoff

**Problem:** Failed uploads re-attempted on next flush (30s fixed interval)

**Issues:**
- Doesn't adapt to server load
- No circuit breaker for permanent failures
- Could overwhelm API during outages

**Solution:** TAPI backoff implementation (current PR work)

### 9.3 No Error Classification

**Problem:** All errors treated identically (kept in queue, retry on next flush)

**Issues:**
- 400 errors (permanent) retried indefinitely
- 5xx errors (transient) should backoff
- 429 errors (rate limit) should respect Retry-After

**Solution:** Error classification (PR #1150 addresses this)

---

## 10. Platform Constraints

### 10.1 React Native Limitations

**JavaScript Single Thread:**
- ❌ No true concurrency (all code runs on single thread)
- ✅ Async I/O non-blocking (fetch, AsyncStorage)
- ⚠️ CPU-heavy operations block UI

**AsyncStorage Limitations:**
- **Size limit:** ~6MB per key (platform-dependent)
- **Performance:** Async, relatively slow for large data
- **Persistence:** Survives app restart, NOT uninstall
- **Serialization:** JSON only (no binary)

**Memory Constraints:**
- Mobile devices have limited RAM
- Large event queues could cause OOM
- Max queue size: 1000 events (hardcoded)

### 10.2 Network Constraints

**Mobile Networks:**
- Unreliable connectivity (WiFi ↔ Cellular transitions)
- Bandwidth limitations
- Background restrictions (iOS: limited time, Android: Doze mode)

**Fetch API:**
- `keepalive: true` flag allows requests to complete if app backgrounds
- But iOS limits background execution time (~30 seconds)

### 10.3 App Lifecycle

**Backgrounding:**
- iOS: Limited background execution time
- Android: Doze mode restrictions
- Events may not flush if app killed quickly

**Termination:**
- Clean shutdown: Queue persisted, events safe
- Force kill: Last event may be lost (if not yet persisted)
- Crash: Depends on when last persistence occurred

---

## 11. Architecture Patterns

### 11.1 Strengths

✅ **Simple & Understandable:**
- Clear event flow (track → queue → flush → upload)
- Minimal abstractions
- Easy to debug

✅ **Persistent Event Queue:**
- Events survive app restarts
- Automatic queue restoration
- Synchronous persistence (no data loss)

✅ **Parallel Uploads:**
- Multiple batches upload concurrently
- Better throughput than sequential

✅ **Plugin Extensibility:**
- Well-defined plugin system
- Easy to add custom destinations
- Clear execution order

### 11.2 Weaknesses

❌ **No Batch Identity:**
- Cannot track per-batch retry state
- Cannot implement per-batch backoff
- Batches are ephemeral and stateless

❌ **No Retry Strategy:**
- Fixed 30s retry interval
- No exponential backoff
- No error classification

❌ **Dequeue Race Condition:**
- Shared accumulator in parallel promises
- Potential for duplicate dequeue calls

❌ **No Circuit Breaker:**
- Permanent failures retried indefinitely
- No way to drop undeliverable events

### 11.3 Design Trade-offs

**Simplicity vs Features:**
- Chose simplicity (no batch IDs, simple retry)
- Trade-off: Less resilient to partial failures

**Memory vs Persistence:**
- Chose small in-memory queue (1000 events max)
- Trade-off: May drop events under high volume

**Concurrency vs Safety:**
- Chose parallel uploads for speed
- Trade-off: Race condition in dequeue logic

---

## 12. TAPI Backoff Implications

### 12.1 Architecture Constraints

Given the current architecture, **per-batch backoff is NOT possible** without significant changes:

**Why:**
- ❌ No stable batch IDs (batches recreated per flush)
- ❌ No batch metadata persistence
- ❌ No way to track "retry count" per batch
- ❌ No way to track "first failure time" per batch

**What would be needed:**
1. Assign stable IDs to batches (hash of event messageIds?)
2. Persist batch metadata (Map<batchId, metadata>)
3. Track batch lifecycle across flushes
4. Clean up stale batch metadata (TTL?)

**Estimated effort:** ~300-400 LOC, significant refactor

### 12.2 Global Backoff Feasibility

**Global backoff is EASY** to implement:

**Why:**
- ✅ Single global state (BackoffManager, UploadStateMachine)
- ✅ No batch tracking needed
- ✅ Simple gate on flush logic
- ✅ Already implemented in current PRs

**Trade-offs:**
- ❌ One failing batch blocks all uploads
- ❌ Less resilient to partial failures
- ✅ Simpler, less code
- ✅ Safer during full TAPI outages

### 12.3 Hybrid Approach Feasibility

**Option:** Keep global rate limiting (429), add per-event backoff metadata

**Approach:**
- Add `retryCount`, `firstFailureTime` to individual events
- Track per-event, not per-batch
- On upload failure, mark events with metadata
- On next flush, skip events still in backoff

**Pros:**
- Better isolation than global
- No batch ID needed
- Moderate implementation complexity

**Cons:**
- Per-event metadata overhead
- More complex than global
- Not true per-batch tracking

**Estimated effort:** ~200 LOC

---

## 13. Recommendations

### 13.1 Immediate Fixes

1. **Fix dequeue race condition** (SegmentDestination.ts:56-74)
   - Move dequeue outside Promise.all
   - Dequeue once with all successful batches

2. **Implement error classification** (PR #1150)
   - Distinguish 4xx, 5xx, 429
   - Drop permanent errors (400, 401, 403, 404)
   - Retry transient errors (5xx, 408, 410)

3. **Implement global backoff for now** (PR #1152)
   - Simple, safe, effective
   - Can be upgraded to per-batch later if needed

### 13.2 Future Enhancements

1. **Add batch identity tracking**
   - Use hash of event messageIds as batch ID
   - Persist batch metadata alongside events
   - Enable per-batch backoff

2. **Improve flush policies**
   - Adaptive flush intervals based on success rate
   - Circuit breaker for permanent failures
   - Priority queue for critical events

3. **Background upload improvements**
   - iOS: BGTaskScheduler for background uploads
   - Android: WorkManager for guaranteed delivery

---

## 14. Code Reference Summary

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `track()` | analytics.ts | 641-653 | Event creation entry point |
| `process()` | analytics.ts | 507-524 | Event processing & routing |
| Event queueing | QueueFlushingPlugin.ts | 64-70 | Add events to persistent queue |
| Queue setup | QueueFlushingPlugin.ts | 43-62 | Sovran store configuration |
| `chunk()` | util.ts | 27-60 | Batch creation algorithm |
| Batch upload | SegmentDestination.ts | 37-87 | Upload orchestration |
| API call | api.ts | 3-24 | HTTP request to Segment |
| Dequeue | QueueFlushingPlugin.ts | 120-132 | Remove successful events |
| Constants | constants.ts | 1-47 | Size limits, defaults |
| Timer flush | timer-flush-policy.ts | 9-45 | Time-based flush trigger |
| Count flush | count-flush-policy.ts | 7-31 | Count-based flush trigger |
| Timeline | timeline.ts | 64-135 | Plugin execution pipeline |

---

## 15. Summary

The React Native SDK uses a **queue-based architecture** with **ephemeral batches**. Events are the unit of persistence, not batches. This design is simple and works well for most use cases, but creates challenges for implementing per-batch backoff as specified in the TAPI SDD.

**Key Architectural Characteristics:**
- ✅ Simple and maintainable
- ✅ Persistent event queue (survives restarts)
- ✅ Parallel batch uploads
- ❌ No stable batch identities
- ❌ No per-batch metadata tracking
- ❌ Limited error handling and retry logic

**For TAPI Implementation:**
- Global backoff is straightforward and safe
- Per-batch backoff requires significant refactoring
- Hybrid approach (per-event metadata) is possible middle ground

**Next Steps:**
- Complete cross-SDK comparison (Kotlin, Swift, JS)
- Determine if other SDKs have batch identity mechanisms
- Make informed decision on global vs per-batch approach
