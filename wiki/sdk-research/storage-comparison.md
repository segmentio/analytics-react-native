# Cross-SDK Storage & Persistence Comparison

**Analysis Date:** 2026-03-06
**Purpose:** Compare storage mechanisms, persistence strategies, and data management across all Segment SDKs

---

## Table of Contents

1. [Overview](#1-overview)
2. [Storage Mechanisms](#2-storage-mechanisms)
3. [Event Persistence](#3-event-persistence)
4. [Batch Persistence](#4-batch-persistence)
5. [Crash Recovery](#5-crash-recovery)
6. [Storage Limits & Cleanup](#6-storage-limits--cleanup)
7. [Performance Characteristics](#7-performance-characteristics)
8. [Key Differences Analysis](#8-key-differences-analysis)
9. [Recommendations](#9-recommendations)

---

## 1. Overview

### Storage Architecture Summary

| SDK | Primary Storage | Event Persistence | Batch Identity | Crash Recovery |
|-----|-----------------|-------------------|----------------|----------------|
| **React Native** | Sovran + AsyncStorage | ✅ Persistent | ❌ Ephemeral | ✅ Full recovery |
| **Kotlin** | File System + SharedPreferences | ✅ Persistent | ✅ Stable files | ✅ Full recovery |
| **Swift** | DirectoryStore / MemoryStore | ✅ Persistent (default) | ❌ Index only | ✅ Full recovery |
| **JS Browser** | localStorage + PriorityQueue | ✅ Persistent | ❌ Ephemeral | ✅ Full recovery |
| **JS Node.js** | In-Memory | ❌ Volatile | ✅ Batch UUID | ❌ Lost on restart |

### Architectural Patterns

**Event-First (Event = Persistence Unit):**
- React Native, Swift, JS Browser
- Events stored individually
- Batches formed on-demand at flush time
- No stable batch identifiers

**Batch-First (Batch = Persistence Unit):**
- Kotlin, JS Node.js
- Events grouped into batches immediately
- Batch files/objects persist
- Stable batch identifiers

---

## 2. Storage Mechanisms

### React Native: Sovran + AsyncStorage

**Architecture:**
```
┌─────────────────────────────────────┐
│ Sovran State Management             │
│ ┌─────────────────────────────────┐ │
│ │ In-Memory Store (Fast Access)   │ │
│ └──────────────┬──────────────────┘ │
│                │ persist             │
│ ┌──────────────▼──────────────────┐ │
│ │ AsyncStorage (React Native API) │ │
│ │ (iOS: NSUserDefaults)           │ │
│ │ (Android: SharedPreferences)    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Implementation:**
- 11 separate Sovran stores (context, settings, userInfo, pending events, etc.)
- Each store has own persistence key
- Async read/write via `getState(true)` and `dispatch()`
- Optional `saveDelay` for batched writes (default 0)

**Storage Keys:**
```
com.segment.storage.{writeKey}-context
com.segment.storage.{writeKey}-settings
com.segment.storage.{writeKey}-userInfo
com.segment.storage.{writeKey}-pending
... (11 total stores)
```

**File References:**
- `/Users/abueide/code/analytics-react-native/packages/core/src/storage/sovranStorage.ts`
- `/Users/abueide/code/analytics-react-native/packages/sovran/src/store.ts`

---

### Kotlin: File System + SharedPreferences

**Architecture:**
```
┌─────────────────────────────────────┐
│ File System (Event Storage)         │
│ ┌─────────────────────────────────┐ │
│ │ {writeKey}-{index}.tmp          │ │ ← Active batch
│ │ {writeKey}-{index}              │ │ ← Finalized batch
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ SharedPreferences (Metadata)    │ │
│ │ - Batch index counter           │ │
│ │ - User traits                   │ │
│ │ - Settings cache                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Implementation:**
- Events appended to active batch file
- File rotation on size limit (475KB) or flush
- Index counter in SharedPreferences
- Batch files are stable identifiers

**File Lifecycle:**
```
Create:   {writeKey}-5.tmp (active)
Append:   Add events as JSON lines
Full:     Rename to {writeKey}-5 (finalized)
Upload:   HTTP POST batch
Success:  Delete file
Failure:  File remains for retry
```

**File References:**
- `/Users/abueide/code/analytics-kotlin/core/src/main/java/com/segment/analytics/kotlin/core/utilities/StorageImpl.kt:44-45, 188-191`
- `/Users/abueide/code/analytics-kotlin/core/src/main/java/com/segment/analytics/kotlin/core/platform/EventPipeline.kt`

---

### Swift: Pluggable DataStore

**Architecture:**
```
┌─────────────────────────────────────────────┐
│ Storage Protocol (Abstraction)              │
│ ┌─────────────────────────────────────────┐ │
│ │ DataStore Protocol                      │ │
│ └───┬─────────────────────────────────────┘ │
│     │ implements                            │
│     ├─> DirectoryStore (File-based)        │
│     ├─> MemoryStore (In-memory)            │
│     └─> Custom (User-provided)             │
└─────────────────────────────────────────────┘
```

**DirectoryStore (Default):**
```
File Pattern: {index}-segment-events (active)
              {index}-segment-events.temp (finalized)

Index stored in UserDefaults:
  com.segment.directoryStore.index
```

**MemoryStore:**
```
In-memory storage with UUID keys
FIFO eviction when maxCount exceeded
Lost on app restart
```

**Implementation:**
- TransientDB wraps DataStore with thread safety (GCD queue)
- Async or sync append modes
- File rotation on 475KB size limit

**File References:**
- `/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/Types/DirectoryStore.swift:62-106, 183-205`
- `/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/Types/MemoryStore.swift:59-92`
- `/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/TransientDB.swift`

---

### JavaScript Browser: localStorage

**Architecture:**
```
┌─────────────────────────────────────────────┐
│ PriorityQueue (In-Memory + Persistent)      │
│ ┌─────────────────────────────────────────┐ │
│ │ queue: Context[]         (in-memory)    │ │
│ │ seen: Map<id, attempts>  (in-memory)    │ │
│ └────┬────────────────────────────────────┘ │
│      │ persist (debounced + pagehide)      │
│ ┌────▼────────────────────────────────────┐ │
│ │ localStorage                            │ │
│ │ - persisted-queue:v1:{writeKey}:items  │ │
│ │ - persisted-queue:v1:{writeKey}:seen   │ │
│ │ - persisted-queue:v1:{writeKey}:lock   │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Mutex Protection:**
```typescript
// 50ms lock TTL to prevent concurrent writes
localStorage.setItem(`${key}:lock`, Date.now())
persistItems()
persistSeen()
localStorage.removeItem(`${key}:lock`)
```

**Persistence Triggers:**
- Debounced: 100ms after queue modification
- Immediate: On `pagehide` event
- Protected: Via mutex with 50ms TTL

**Storage Limits:**
- Typical: 5-10MB per domain (browser-dependent)
- Quota exceeded: Silent fail with warning

**File References:**
- `/Users/abueide/code/analytics-next/packages/browser/src/lib/priority-queue/persisted.ts:1-155`
- `/Users/abueide/code/analytics-next/packages/browser/src/core/storage/localStorage.ts`

---

### JavaScript Node.js: In-Memory

**Architecture:**
```
┌─────────────────────────────────────┐
│ In-Memory Only (No Persistence)     │
│ ┌─────────────────────────────────┐ │
│ │ ContextBatch (Volatile)         │ │
│ │ - id: UUID                      │ │
│ │ - contexts: Context[]           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ❌ Lost on process restart          │
│ ✅ Stable batch ID during runtime   │
└─────────────────────────────────────┘
```

**Implementation:**
- Single in-flight batch: `_batch?: ContextBatch`
- Batch has stable UUID: `id: string = id()`
- Events added to batch until size/count limit
- No persistence between process runs

**Graceful Shutdown:**
Application responsible for:
```typescript
process.on('SIGTERM', async () => {
  await analytics.closeAndFlush()  // Flush pending batches
  process.exit(0)
})
```

**File References:**
- `/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/context-batch.ts:1-92`
- `/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts`

---

## 3. Event Persistence

### Persistence Comparison

| SDK | Event Storage | Format | Indexing |
|-----|---------------|--------|----------|
| **React Native** | Sovran store (pendingEvents) | JSON array | None (flat array) |
| **Kotlin** | File lines | NDJSON (line-delimited) | File path |
| **Swift** | File lines | NDJSON (line-delimited) | File path |
| **JS Browser** | localStorage | JSON array (serialized Contexts) | Map (id → attempts) |
| **JS Node.js** | In-memory array | JavaScript objects | None |

### React Native Event Persistence

**Storage Format:**
```typescript
// Stored in: com.segment.storage.{writeKey}-pending
{
  events: [
    { type: 'track', event: 'Click', messageId: 'uuid1', timestamp: 'ISO8601', ... },
    { type: 'identify', userId: '123', traits: {...}, messageId: 'uuid2', ... },
    ...
  ]
}
```

**Persistence Flow:**
```
Event created → QueueFlushingPlugin.addEvent()
  → dispatch(state => { events: [...state.events, event] })
  → Sovran persists to AsyncStorage
  → Events survive app restart
```

**Characteristics:**
- ✅ Persistent across app restarts
- ✅ All events in single array
- ❌ No event-level indexing
- ❌ Full array rewritten on modification

---

### Kotlin Event Persistence

**Storage Format:**
```
File: {writeKey}-5.tmp

{"type":"track","event":"Click","messageId":"uuid1",...}
{"type":"identify","userId":"123","messageId":"uuid2",...}
{"type":"track","event":"View","messageId":"uuid3",...}
```

**Persistence Flow:**
```
Event created → EventPipeline.put()
  → StorageImpl.write()
  → Append line to active batch file
  → File finalized on flush/size limit
  → Events survive app restart
```

**Characteristics:**
- ✅ Persistent across app restarts
- ✅ Append-only (efficient)
- ✅ Individual event access (line-by-line)
- ✅ File-based batch identity

---

### Swift Event Persistence

**Storage Format (DirectoryStore):**
```
File: 3-segment-events (active)

{"type":"track","event":"Click","messageId":"uuid1",...}
{"type":"identify","userId":"123","messageId":"uuid2",...}
```

**Persistence Flow:**
```
Event created → SegmentDestination.queueEvent()
  → Storage.write(.events, value: event)
  → TransientDB.append()
  → LineStreamWriter.writeLine()
  → File survives app restart
```

**Characteristics:**
- ✅ Persistent across app restarts (DirectoryStore mode)
- ✅ Append-only (efficient)
- ❌ Lost on restart (MemoryStore mode)
- ✅ Thread-safe via GCD queue

---

### JavaScript Browser Event Persistence

**Storage Format:**
```
localStorage key: persisted-queue:v1:{writeKey}:items

[
  { "id": "ctx-uuid-1", "attempts": 1, "event": {...} },
  { "id": "ctx-uuid-2", "attempts": 0, "event": {...} },
  ...
]

localStorage key: persisted-queue:v1:{writeKey}:seen

{
  "ctx-uuid-1": 1,  // attempts count
  "ctx-uuid-2": 0
}
```

**Persistence Flow:**
```
Event created → EventQueue.register()
  → PriorityQueue.push()
  → Debounced persist (100ms)
  → localStorage.setItem() with mutex
  → Events survive page refresh
```

**Characteristics:**
- ✅ Persistent across page refreshes
- ✅ Retry count preserved
- ✅ Mutex-protected writes
- ❌ localStorage quota limits (5-10MB)

---

### JavaScript Node.js Event Persistence

**Storage Format:**
```
// In-memory only (no persistence)
private _batch?: ContextBatch {
  id: 'batch-uuid-123',
  contexts: [
    Context { id: 'ctx-uuid-1', event: {...} },
    Context { id: 'ctx-uuid-2', event: {...} },
  ]
}
```

**Characteristics:**
- ❌ Not persistent
- ❌ Lost on process restart
- ✅ Low overhead
- ✅ Stable batch ID during runtime

---

## 4. Batch Persistence

### Batch Identity Mechanisms

| SDK | Batch ID | Persistence | Crash Recovery |
|-----|----------|-------------|----------------|
| **React Native** | None (ephemeral) | Events only | ✅ Events recovered, batches reformed |
| **Kotlin** | File path | Stable files | ✅ Batch files persist |
| **Swift** | File index | File-based | ✅ Batch files persist |
| **JS Browser** | None (ephemeral) | Events only | ✅ Events recovered, batches reformed |
| **JS Node.js** | Batch UUID | In-memory | ❌ Lost on restart |

### React Native Batch Formation

**On-Demand Batching:**
```typescript
// SegmentDestination.ts:47-51
const batches = util.chunk(events, MAX_EVENTS_PER_BATCH, MAX_PAYLOAD_SIZE_IN_KB)

// util.ts:27-60 - Creates ephemeral batches
function chunk(events: SegmentEvent[], maxSize: number, maxBytes: number): SegmentEvent[][] {
  const batches: SegmentEvent[][] = []
  let currentBatch: SegmentEvent[] = []

  for (const event of events) {
    if (currentBatch.length >= maxSize || exceedsSize(currentBatch, maxBytes)) {
      batches.push(currentBatch)
      currentBatch = []
    }
    currentBatch.push(event)
  }

  return batches
}
```

**Key Characteristics:**
- ❌ No batch persistence
- ❌ No stable batch IDs
- ✅ Events persist, batches recreated
- ✅ Batch composition varies across retries

---

### Kotlin Batch Persistence

**File-Based Batches:**
```kotlin
// File naming: {writeKey}-{index}
// Example: abc123-5.tmp → abc123-5

// StorageImpl.kt:188-191
fun finalize(tempFile: String): String {
    val finalFile = tempFile.removeSuffix(".tmp")
    File(tempFile).renameTo(File(finalFile))
    return finalFile
}

// Batch files are stable identifiers:
// - abc123-5.tmp (writing)
// - abc123-5 (ready for upload)
```

**Key Characteristics:**
- ✅ Batch files persist
- ✅ Stable file identifiers
- ✅ Retry same batch composition
- ✅ Per-batch metadata possible

---

### Swift Batch Persistence

**File-Based with Index:**
```swift
// File naming: {index}-segment-events.temp

// DirectoryStore.swift:208-218
func getIndex() -> Int {
    let index: Int = userDefaults.integer(forKey: config.indexKey)
    return index
}

// Batch files:
// - 3-segment-events (active)
// - 3-segment-events.temp (finalized)
```

**Key Characteristics:**
- ✅ Batch files persist
- ❌ No batch UUID (only index)
- ✅ Stable file identity
- ✅ Retry same batch composition

---

### JavaScript Browser Batch Formation

**On-Demand Batching (Similar to React Native):**
```typescript
// batched-dispatcher.ts:36-70
let buffer: Context[] = []

function enqueue(ctx: Context): void {
  buffer.push(ctx)

  if (buffer.length >= (config?.size || 10) ||
      approachingTrackingAPILimit(buffer)) {
    flush()  // Create batch from buffer
  }
}

async function flush(attempt = 1): Promise<unknown> {
  const batch = buffer  // Ephemeral batch
  buffer = []

  return sendBatch(batch)
}
```

**Key Characteristics:**
- ❌ No batch persistence
- ❌ No stable batch IDs
- ✅ Events persist, batches recreated
- ✅ Batch composition varies across retries

---

### JavaScript Node.js Batch Persistence

**Stable Batch Identity (In-Memory):**
```typescript
// context-batch.ts:10-19
export class ContextBatch {
  private id: string = id()  // Stable UUID
  private contexts: Context[] = []

  getId(): string {
    return this.id
  }
}

// Batch UUID survives retries within same process
```

**Key Characteristics:**
- ✅ Stable batch UUID
- ✅ Same batch composition across retries
- ❌ Lost on process restart
- ✅ Atomic batch retry

---

## 5. Crash Recovery

### Recovery Capabilities Comparison

| SDK | Events Recovered | Batches Recovered | State Recovered | Queue Order Preserved |
|-----|------------------|-------------------|-----------------|----------------------|
| **React Native** | ✅ Yes | ❌ Reformed | ✅ Backoff state | ✅ FIFO order |
| **Kotlin** | ✅ Yes | ✅ Same files | ❌ No state yet | ✅ File order |
| **Swift** | ✅ Yes (DirectoryStore) | ✅ Same files | ❌ No state | ✅ File order |
| **JS Browser** | ✅ Yes | ❌ Reformed | ✅ Retry counts | ✅ Priority order |
| **JS Node.js** | ❌ Lost | ❌ Lost | ❌ Lost | N/A |

### React Native Crash Recovery

**Recovery Flow:**
```
App Restart
  ↓
Sovran restores stores from AsyncStorage (1s timeout)
  ↓
pendingEvents store loaded with all queued events
  ↓
BackoffManager/UploadStateMachine states restored
  ↓
QueueFlushingPlugin triggers flush
  ↓
Events chunked into new batches
  ↓
Upload with preserved backoff state
```

**What's Preserved:**
- ✅ All queued events
- ✅ User traits, context, settings
- ✅ Backoff end times
- ✅ Rate limit end times
- ✅ Retry counts (in BackoffManager/UploadStateMachine)

**What's Lost:**
- ❌ Batch composition (reformed)
- ❌ In-flight HTTP requests

**File References:**
- `/Users/abueide/code/analytics-react-native/packages/core/src/storage/sovranStorage.ts:243-252`
- `/Users/abueide/code/analytics-react-native/packages/core/src/plugins/QueueFlushingPlugin.ts:78-89`

---

### Kotlin Crash Recovery

**Recovery Flow:**
```
App Restart
  ↓
StorageImpl scans directory for finalized batch files
  ↓
Files sorted by index (via SharedPreferences counter)
  ↓
EventPipeline.uploadFiles() called on restart
  ↓
Each batch file uploaded sequentially
  ↓
Successful batches deleted
```

**What's Preserved:**
- ✅ All batch files
- ✅ Batch composition (same files)
- ✅ Batch order (index counter)

**What's Lost:**
- ❌ Retry counts per batch
- ❌ Backoff state (no TAPI yet)
- ❌ In-flight uploads

**File References:**
- `/Users/abueide/code/analytics-kotlin/core/src/main/java/com/segment/analytics/kotlin/core/utilities/StorageImpl.kt`
- `/Users/abueide/code/analytics-kotlin/core/src/main/java/com/segment/analytics/kotlin/core/platform/EventPipeline.kt`

---

### Swift Crash Recovery

**Recovery Flow:**
```
App Restart
  ↓
DirectoryStore.fetch() scans directory for .temp files
  ↓
Files sorted by index (from UserDefaults)
  ↓
SegmentDestination.flush() uploads each file
  ↓
Successful batches deleted
```

**What's Preserved:**
- ✅ All batch files (.temp)
- ✅ Batch composition (same files)
- ✅ File order (index)

**What's Lost:**
- ❌ Retry counts
- ❌ Rate limit state (Telemetry only)
- ❌ In-flight uploads

**File References:**
- `/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/Types/DirectoryStore.swift:183-205`
- `/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/SegmentDestination.swift`

---

### JavaScript Browser Crash Recovery

**Recovery Flow:**
```
Page Refresh
  ↓
PersistedPriorityQueue constructor
  ↓
Load from localStorage:
  - items: Context[]
  - seen: Map<id, attempts>
  ↓
Restore in-memory queue
  ↓
Resume delivery loop
```

**What's Preserved:**
- ✅ All queued events (Contexts)
- ✅ Retry attempt counts
- ✅ Event order (priority-based)

**What's Lost:**
- ❌ Batch composition (reformed)
- ❌ In-flight fetch requests
- ❌ Rate limit timeout (single variable)

**File References:**
- `/Users/abueide/code/analytics-next/packages/browser/src/lib/priority-queue/persisted.ts:23-40`

---

### JavaScript Node.js Crash Recovery

**No Recovery:**
```
Process Restart
  ↓
All in-memory state lost
  ↓
Events in _batch are lost
  ↓
No retry possible
```

**Application Responsibility:**
```typescript
// User must implement graceful shutdown
process.on('SIGTERM', async () => {
  await analytics.closeAndFlush()
  process.exit(0)
})
```

**What's Preserved:**
- ❌ Nothing

**What's Lost:**
- ❌ All events in current batch
- ❌ All retry state

---

## 6. Storage Limits & Cleanup

### Storage Quotas

| SDK | Storage Limit | Enforced | Cleanup Strategy |
|-----|---------------|----------|------------------|
| **React Native** | AsyncStorage (~5-10MB) | No | Manual via reset() |
| **Kotlin** | Disk space | No | Manual or automatic on error |
| **Swift** | Disk space | No | Manual via reset() |
| **JS Browser** | localStorage (5-10MB) | Yes (quota) | FIFO eviction or manual |
| **JS Node.js** | Heap memory | No | Single batch limit |

### React Native Cleanup

**No Automatic Limits:**
- Events accumulate unbounded in pendingEvents store
- AsyncStorage quota (platform-dependent)
- Potential issue: Failed batches accumulate indefinitely

**Manual Cleanup:**
```typescript
await analytics.reset()  // Clears all stores, including pending events
```

**Potential Issue:**
```
If TAPI consistently fails (e.g., 400 errors):
  → Events remain in queue indefinitely
  → AsyncStorage fills up
  → Eventually quota exceeded
  → New events fail to persist
```

**Recommendation:**
- Add max queue size limit
- Implement dead-letter queue for permanent failures
- Periodic cleanup of old events

---

### Kotlin Cleanup

**No Automatic Limits:**
- Batch files accumulate on disk
- Limited only by available disk space

**Manual Cleanup:**
```kotlin
analytics.reset()  // Clears storage
```

**Potential Issue:**
```
If TAPI consistently fails:
  → Batch files accumulate: abc123-1, abc123-2, abc123-3, ...
  → Disk space gradually consumed
  → No automatic cleanup
```

**Current Behavior:**
- StorageImpl.remove() deletes successful batches
- Failed batches remain indefinitely

**Recommendation:**
- Add max batch file count
- Implement batch TTL (time-to-live)
- Periodic cleanup of old batches

---

### Swift Cleanup

**Similar to Kotlin:**
- Batch files (.temp) accumulate on disk
- No automatic cleanup of failed batches

**Manual Cleanup:**
```swift
analytics.reset()  // Clears storage
```

**MemoryStore Mode:**
- FIFO eviction when `maxCount` exceeded
- Prevents unbounded growth

---

### JavaScript Browser Cleanup

**FIFO Eviction:**
```typescript
// When maxAttempts exceeded:
if (attempt > this.maxAttempts) {
  // Event dropped from queue
  return false
}
```

**localStorage Quota:**
```typescript
try {
  localStorage.setItem(key, JSON.stringify(value))
} catch (e) {
  // QuotaExceededError - silent fail with warning
}
```

**Automatic Cleanup:**
- Events dropped after 10 retry attempts (configurable)
- Failed events not persisted beyond maxAttempts

---

### JavaScript Node.js Cleanup

**Single Batch Limit:**
```typescript
MAX_BATCH_SIZE_IN_KB = 480

// Batch overflow triggers send:
if (this._batch.getSizeInKB() + eventSize > MAX_BATCH_SIZE_IN_KB) {
  await this.send(this._batch)
  this._batch = undefined
}
```

**No Accumulation:**
- Only one batch in memory at a time
- No unbounded growth

---

## 7. Performance Characteristics

### Write Performance

| SDK | Mechanism | Concurrency | Overhead |
|-----|-----------|-------------|----------|
| **React Native** | AsyncStorage write | Async dispatch | Medium (full array rewrite) |
| **Kotlin** | File append | Single-threaded dispatcher | Low (append-only) |
| **Swift** | File append | GCD queue | Low (append-only) |
| **JS Browser** | localStorage write | Debounced | Medium (full array serialize) |
| **JS Node.js** | Memory write | Direct | Very Low (no I/O) |

### Read Performance

| SDK | Mechanism | Overhead |
|-----|-----------|----------|
| **React Native** | Sovran store.getState() | Low (in-memory cache) |
| **Kotlin** | File read (line-by-line) | Medium (I/O) |
| **Swift** | File read (line-by-line) | Medium (I/O) |
| **JS Browser** | localStorage.getItem() | Low (browser-optimized) |
| **JS Node.js** | Memory access | Very Low |

### Flush Performance

**React Native:**
```
Flush:
  → Read events from Sovran store (fast, in-memory)
  → Chunk into batches (CPU bound)
  → Send multiple batches in parallel (Promise.all)
  → Remove events from store on success (AsyncStorage write)

Bottleneck: AsyncStorage write on success (full array rewrite)
```

**Kotlin:**
```
Flush:
  → Scan directory for finalized batch files (I/O)
  → Read each file into memory (I/O, line-by-line)
  → Send batches sequentially (one at a time)
  → Delete files on success (I/O)

Bottleneck: Sequential uploads, I/O for file operations
```

**Swift:**
```
Flush:
  → DirectoryStore.fetch() scans for .temp files (I/O)
  → Read each file into memory (I/O)
  → Send batches (one at a time)
  → Delete files on success (I/O)

Bottleneck: File I/O, sequential uploads
```

**JavaScript Browser:**
```
Flush:
  → Pop events from in-memory queue (fast)
  → Send batches (configurable batch size)
  → Persist remaining queue to localStorage (debounced)

Bottleneck: localStorage serialization (if queue is large)
```

**JavaScript Node.js:**
```
Flush:
  → Send in-memory batch (fast)
  → No persistence overhead

Bottleneck: Network only (no storage I/O)
```

---

## 8. Key Differences Analysis

### Fundamental Design Choices

**Event-First vs Batch-First:**

| Pattern | SDKs | Pros | Cons |
|---------|------|------|------|
| **Event-First** | RN, Swift, JS Browser | - Flexible batch composition<br>- Event-level retry tracking<br>- Easy to inspect individual events | - No stable batch IDs<br>- Batches reformed on retry<br>- Batch metadata complex |
| **Batch-First** | Kotlin, JS Node.js | - Stable batch IDs<br>- Atomic batch operations<br>- Simple retry logic | - Rigid batch composition<br>- Event-level inspection harder<br>- Batch size limits critical |

**Platform Justification:**

| SDK | Pattern | Justified? | Reason |
|-----|---------|------------|--------|
| **React Native** | Event-first | ⚠️ Debatable | AsyncStorage key-value model favors event-first, but file-based also viable |
| **Kotlin** | Batch-first | ✅ Yes | File system natural fit, efficient append-only writes |
| **Swift** | Event-first | ⚠️ Debatable | File system available, could be batch-first like Kotlin |
| **JS Browser** | Event-first | ✅ Yes | localStorage quota limits favor flexible batching, event-level retry useful for long-lived tabs |
| **JS Node.js** | Batch-first | ✅ Yes | No persistence needed, batch-first simplifies server-side handling |

### Persistence Strategy Differences

**Why JS Node.js is different:**

1. **Server Environment:** Process lifecycle predictable, no unexpected crashes
2. **Deployment Model:** Process restart is controlled (no user-driven kill)
3. **Performance Priority:** No I/O overhead for maximum throughput
4. **Failure Handling:** Application responsible for graceful shutdown

**Why Others Persist:**

1. **Mobile Apps:** User can kill app at any time
2. **Browsers:** Tab close, page refresh, crashes
3. **Data Loss:** User-facing consequence of not persisting

### Storage Technology Choices

**React Native - AsyncStorage:**
- **Why:** React Native standard, cross-platform (iOS/Android)
- **Alternative:** SQLite (heavier), file system (less structured)
- **Trade-off:** Limited by platform quota, async overhead

**Kotlin - File System:**
- **Why:** Android has robust file system, append-only efficient
- **Alternative:** Room database (heavier), SharedPreferences (size limits)
- **Trade-off:** I/O overhead vs persistence guarantees

**Swift - Pluggable:**
- **Why:** Flexibility for different use cases (file vs memory)
- **Alternative:** CoreData (overkill), UserDefaults (size limits)
- **Trade-off:** Complexity vs flexibility

**JS Browser - localStorage:**
- **Why:** Browser standard, synchronous API, persistent
- **Alternative:** IndexedDB (complex), Cookies (size limits)
- **Trade-off:** Quota limits vs simplicity

**JS Node.js - In-Memory:**
- **Why:** Maximum performance, no persistence needed
- **Alternative:** File system (unnecessary overhead)
- **Trade-off:** Data loss on crash vs performance

---

## 9. Recommendations

### For React Native

**Current State:**
- Event-first architecture with AsyncStorage
- No automatic queue cleanup
- No stable batch IDs

**Recommendations:**

1. **Add Queue Size Limit:**
   ```typescript
   const MAX_QUEUE_SIZE = 10000  // Max events in pending queue

   if (pendingEvents.length >= MAX_QUEUE_SIZE) {
     // Drop oldest events (FIFO)
     const dropped = pendingEvents.slice(0, pendingEvents.length - MAX_QUEUE_SIZE)
     pendingEvents = pendingEvents.slice(-MAX_QUEUE_SIZE)
     logger.warn(`Dropped ${dropped.length} events due to queue overflow`)
   }
   ```

2. **Add Event TTL:**
   ```typescript
   interface QueuedEvent extends SegmentEvent {
     _queuedAt: number  // Timestamp
   }

   // On flush, filter old events:
   const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000  // 7 days
   const now = Date.now()
   const recentEvents = events.filter(e => now - e._queuedAt < MAX_EVENT_AGE_MS)
   ```

3. **Consider File-Based Storage:**
   - Would enable batch-first architecture
   - Stable batch IDs for per-batch backoff
   - Similar to Kotlin/Swift
   - Trade-off: I/O overhead vs architectural benefits

**Priority:** Medium (current implementation functional but could improve)

---

### For Kotlin

**Current State:**
- Batch-first with file system
- No automatic cleanup
- No TTL or max file count

**Recommendations:**

1. **Add Batch TTL:**
   ```kotlin
   val MAX_BATCH_AGE_MS = 7 * 24 * 60 * 60 * 1000L  // 7 days

   fun cleanupOldBatches() {
     val now = System.currentTimeMillis()
     val batchFiles = directory.listFiles()
     batchFiles?.forEach { file ->
       if (now - file.lastModified() > MAX_BATCH_AGE_MS) {
         file.delete()
         logger.warn("Deleted old batch file: ${file.name}")
       }
     }
   }
   ```

2. **Add Max File Count:**
   ```kotlin
   val MAX_BATCH_FILES = 1000

   fun cleanupExcessBatches() {
     val batchFiles = directory.listFiles()?.sortedBy { it.lastModified() }
     if (batchFiles != null && batchFiles.size > MAX_BATCH_FILES) {
       val toDelete = batchFiles.take(batchFiles.size - MAX_BATCH_FILES)
       toDelete.forEach { it.delete() }
       logger.warn("Deleted ${toDelete.size} excess batch files")
     }
   }
   ```

**Priority:** High (unbounded growth is production risk)

---

### For Swift

**Current State:**
- Event-first (DirectoryStore) or memory-only (MemoryStore)
- No automatic cleanup in DirectoryStore
- MemoryStore has FIFO eviction

**Recommendations:**

1. **Add Cleanup to DirectoryStore:**
   - Same as Kotlin (TTL + max file count)
   - Prevent unbounded .temp file accumulation

2. **Consider Default Mode:**
   - MemoryStore is safer (no unbounded growth)
   - DirectoryStore needs cleanup for production use

**Priority:** High (same risk as Kotlin)

---

### For JavaScript Browser

**Current State:**
- Event-first with localStorage
- Automatic cleanup (maxAttempts)
- FIFO eviction on quota exceeded

**Recommendations:**

1. **Add Event TTL (Optional):**
   - Current FIFO is sufficient
   - TTL would add extra safety for long-lived tabs

2. **Document Quota Handling:**
   - Clear docs on what happens when quota exceeded
   - Guidance on monitoring localStorage usage

**Priority:** Low (current implementation robust)

---

### For JavaScript Node.js

**Current State:**
- Batch-first in-memory
- No persistence
- Application handles graceful shutdown

**Recommendations:**

1. **Document Shutdown Pattern:**
   ```typescript
   // Example in README
   process.on('SIGTERM', async () => {
     await analytics.closeAndFlush()
     process.exit(0)
   })
   ```

2. **Optional: Add File-Based Persistence:**
   - For use cases requiring crash recovery
   - Trade-off: I/O overhead vs reliability

**Priority:** Low (current design intentional for performance)

---

### Cross-SDK Consistency Opportunities

**Queue Limits:**
- All SDKs should have configurable max queue size
- All SDKs should have event/batch TTL
- Prevents unbounded growth across all platforms

**Storage Abstraction:**
- React Native, Swift already have pluggable storage
- Kotlin could benefit from DataStore protocol
- Enables file-based, DB-based, or memory-based storage per use case

**Cleanup Strategy:**
- Standardize cleanup logic across SDKs
- Document cleanup behavior in all READMEs
- Add observability (emit metrics on dropped events/batches)

---

## Summary

### Key Findings

1. **Two Architectural Patterns:**
   - **Event-First:** React Native, Swift, JS Browser
   - **Batch-First:** Kotlin, JS Node.js

2. **Persistence Strategy Varies:**
   - Mobile/Browser: Persistent (critical for UX)
   - Node.js: In-memory (performance priority)

3. **Storage Technology Choices:**
   - Each SDK uses platform-appropriate storage
   - Trade-offs: performance vs persistence vs complexity

4. **Common Gap: Cleanup:**
   - Most SDKs lack automatic cleanup
   - Risk: Unbounded growth in failure scenarios
   - **Action Required:** Add TTL + max limits

5. **TAPI Implications:**
   - **Event-first:** Requires global backoff or refactor for per-batch
   - **Batch-first:** Natural fit for per-batch backoff
   - **JS Browser proves:** Event-first + global backoff = TAPI-compliant ✅

### Platform vs Design

**Platform-Justified:**
- ✅ JS Node.js in-memory (server environment)
- ✅ JS Browser localStorage (browser standard)
- ⚠️ Others debatable (file system available on all mobile platforms)

**Design Choice:**
- Event-first vs batch-first not dictated by platform
- JS SDK has both patterns in same repo
- React Native/Swift could adopt batch-first like Kotlin

### Next Steps

1. Review cleanup recommendations (high priority)
2. Evaluate event-first vs batch-first for TAPI implementation
3. Consider storage abstraction for cross-SDK consistency
