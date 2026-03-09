# Cross-SDK Concurrency & Threading Comparison

**Analysis Date:** 2026-03-06
**Purpose:** Compare concurrency models, threading strategies, and parallel execution patterns across all Segment SDKs

---

## Table of Contents

1. [Overview](#1-overview)
2. [Concurrency Models](#2-concurrency-models)
3. [Threading Architecture](#3-threading-architecture)
4. [Synchronization Mechanisms](#4-synchronization-mechanisms)
5. [Parallel vs Sequential Execution](#5-parallel-vs-sequential-execution)
6. [Platform Constraints](#6-platform-constraints)
7. [Performance Implications](#7-performance-implications)
8. [Key Differences Analysis](#8-key-differences-analysis)
9. [Recommendations](#9-recommendations)

---

## 1. Overview

### Concurrency Model Summary

| SDK | Primary Model | Thread Management | Async Pattern | Batch Uploads |
|-----|---------------|-------------------|---------------|---------------|
| **React Native** | Promise-based | Single JS thread | async/await | Parallel (unbounded) |
| **Kotlin** | Coroutines | Multi-dispatcher | suspend funs | Sequential |
| **Swift** | GCD | Dispatch queues | Callbacks | Sequential |
| **JS Browser** | Event loop | Single thread | async/await + Promises | Parallel (guarded) |
| **JS Node.js** | Event loop | Single thread | async/await | Sequential |

### Key Architectural Differences

**Modern Async (React Native, JS, Kotlin):**
- Use structured concurrency (async/await, coroutines)
- Explicit async boundaries
- Better error propagation

**Legacy Callback (Swift):**
- Grand Central Dispatch (GCD)
- Callback-based async
- Pre-Swift 5.5 concurrency model

**Threading Strategy:**
- **Single-threaded:** React Native, JS (event loop)
- **Multi-threaded:** Kotlin (multiple dispatchers), Swift (multiple queues)

---

## 2. Concurrency Models

### React Native: Promise-Based Event Loop

**Architecture:**
```
JavaScript Thread (Single)
  ↓
Promise Chain / async-await
  ↓
Native Bridge (when needed)
  ↓
Native Threads (iOS/Android)
```

**Event Processing:**
```typescript
// analytics.ts
async process(event: SegmentEvent): Promise<void> {
  // Single-threaded execution
  await this.timeline.process(event)
  // All plugins execute on same thread
}

// Plugin execution
async execute(event: SegmentEvent): Promise<SegmentEvent | undefined> {
  // Can be sync or async
  const enriched = await enrichPlugin.execute(event)
  return enriched
}
```

**Key Characteristics:**
- ✅ Single JS thread (no race conditions in JS land)
- ✅ Simple mental model
- ❌ CPU-bound operations block event loop
- ✅ I/O operations non-blocking (fetch, AsyncStorage)

**File References:**
- `/Users/abueide/code/analytics-react-native/packages/core/src/analytics.ts:507-537`
- `/Users/abueide/code/analytics-react-native/packages/core/src/timeline.ts`

---

### Kotlin: Coroutines with Multiple Dispatchers

**Architecture:**
```
┌─────────────────────────────────────────┐
│ Coroutine Dispatchers                   │
│ ┌─────────────────────────────────────┐ │
│ │ analyticsDispatcher                 │ │ ← Main processing
│ │ (single-threaded)                   │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ fileIODispatcher                    │ │ ← File I/O
│ │ (multi-threaded pool)               │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ networkIODispatcher                 │ │ ← Network uploads
│ │ (single-threaded)                   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Dispatcher Configuration:**
```kotlin
// AnalyticsConfiguration.kt
analyticsDispatcher = newSingleThreadContext("Analytics")
fileIODispatcher = Dispatchers.IO.limitedParallelism(1)
networkIODispatcher = newSingleThreadContext("NetworkIO")
```

**Event Processing Flow:**
```kotlin
// Analytics.kt
suspend fun process(event: Event) {
    withContext(analyticsDispatcher) {
        // Single-threaded processing
        timeline.process(event)
    }
}

// Storage operations
suspend fun writeEvent(event: Event) {
    withContext(fileIODispatcher) {
        // I/O on separate thread
        storage.write(event)
    }
}

// Network uploads
suspend fun uploadBatch(batch: Batch) {
    withContext(networkIODispatcher) {
        // Sequential uploads on dedicated thread
        httpClient.post(batch)
    }
}
```

**Key Characteristics:**
- ✅ Structured concurrency (coroutines)
- ✅ Explicit context switching
- ✅ Cancellation support
- ✅ Thread pool for I/O
- ✅ Sequential uploads prevent race conditions

**File References:**
- `/Users/abueide/code/analytics-kotlin/core/src/main/java/com/segment/analytics/kotlin/core/Analytics.kt`
- `/Users/abueide/code/analytics-kotlin/core/src/main/java/com/segment/analytics/kotlin/core/AnalyticsConfiguration.kt`

---

### Swift: Grand Central Dispatch (GCD)

**Architecture:**
```
┌─────────────────────────────────────────┐
│ GCD Dispatch Queues                     │
│ ┌─────────────────────────────────────┐ │
│ │ transientDB.sync (serial)           │ │ ← Storage thread-safety
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Various plugin queues               │ │ ← Per-plugin queues
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Main queue (UI operations)          │ │ ← Lifecycle events
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Synchronization:**
```swift
// TransientDB.swift
private let syncQueue = DispatchQueue(label: "transientDB.sync")

func append(data: [UInt8]) {
    syncQueue.sync {
        store.append(data: data)
    }
}

// Async mode
func appendAsync(data: [UInt8]) {
    syncQueue.async {
        store.append(data: data)
    }
}
```

**Atomic Operations:**
```swift
// Atomic.swift
@propertyWrapper
struct Atomic<Value> {
    private var lock = os_unfair_lock_s()  // Kernel-level lock
    private var value: Value

    mutating func mutate(_ mutation: (inout Value) -> Void) {
        os_unfair_lock_lock(&lock)
        mutation(&value)
        os_unfair_lock_unlock(&lock)
    }
}

// Usage:
@Atomic internal var eventCount: Int = 0
@Atomic internal var rateLimitEndTime: TimeInterval = 0
```

**Flush Coordination:**
```swift
// CompletionGroup.swift - Multi-plugin coordination
let completionGroup = CompletionGroup(queue: flushQueue)

apply { plugin in
    completionGroup.add { group in
        if let p = plugin as? FlushCompletion {
            p.flush(group: group)
        }
    }
}

completionGroup.run(mode: operatingMode) { completion?() }
```

**Key Characteristics:**
- ✅ Multiple dispatch queues for isolation
- ✅ os_unfair_lock for atomic operations
- ❌ Callback-based (no async/await used)
- ❌ More complex than coroutines/promises
- ✅ Fine-grained thread control

**File References:**
- `/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/TransientDB.swift`
- `/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Atomic.swift:23-86`
- `/Users/abueide/code/analytics-swift/Sources/Segment/Timeline.swift`

---

### JavaScript Browser: Single-Threaded Event Loop

**Architecture:**
```
Main Thread (Single)
  ↓
Event Loop
  ↓
Microtask Queue (Promises)
  ↓
Macrotask Queue (setTimeout, fetch callbacks)
```

**Event Processing:**
```typescript
// event-queue.ts
private async deliverLoop(): Promise<unknown> {
    const ctx = await this.queue.pop('nextAttempt')

    if (!ctx) return  // Queue empty

    try {
        await this.flushOne(ctx, this.plugins)
    } catch (err) {
        this.enqueuRetry(err, ctx)
    }

    return this.deliverLoop()  // Recursive, but async (yields)
}
```

**Concurrent Flush Guard:**
```typescript
// batched-dispatcher.ts
let flushing = false
let schedule: any

function scheduleFlush(attempt = 1): void {
    if (schedule || flushing) return  // Prevent duplicate flushes

    schedule = setTimeout(() => {
        schedule = undefined
        flushing = true
        flush(attempt)
            .catch(console.error)
            .finally(() => { flushing = false })
    }, timeout)
}
```

**Key Characteristics:**
- ✅ Simple single-threaded model
- ✅ No race conditions in event processing
- ✅ async/await for clean async code
- ❌ CPU-bound operations block UI
- ✅ Fetch API non-blocking

**File References:**
- `/Users/abueide/code/analytics-next/packages/core/src/queue/event-queue.ts:180-239`
- `/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/batched-dispatcher.ts:34-70`

---

### JavaScript Node.js: Single-Threaded Event Loop

**Architecture:**
```
Main Thread (Single)
  ↓
Event Loop (libuv)
  ↓
Thread Pool (I/O operations)
```

**Sequential Batch Processing:**
```typescript
// publisher.ts
private _flushing = false

public async enqueue(ctx: Context): Promise<void> {
    // Add to batch
    this._batch.tryAddContext(ctx)

    // Send if full
    if (this._batch.getContexts().length >= this._flushAt) {
        await this.send(this._batch)  // Sequential, awaits completion
        this._batch = undefined
    }
}

async send(batch: ContextBatch) {
    const maxAttempts = this._maxRetries + 1
    let currentAttempt = 0

    while (currentAttempt < maxAttempts) {
        currentAttempt++
        // Retry loop is sequential
        const response = await this._httpClient.makeRequest(...)
        // Process response...
    }
}
```

**Key Characteristics:**
- ✅ Single-threaded like browser
- ✅ async/await throughout
- ✅ Sequential batch sends (no parallel uploads)
- ✅ Simple reasoning about state
- ❌ One batch at a time (limited throughput)

**File References:**
- `/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts:87-325`

---

## 3. Threading Architecture

### Thread Usage Comparison

| SDK | Event Processing | Storage I/O | Network Uploads | Plugin Execution |
|-----|------------------|-------------|-----------------|------------------|
| **React Native** | JS thread | JS thread → Native | JS thread | JS thread |
| **Kotlin** | analyticsDispatcher (1 thread) | fileIODispatcher (pool) | networkIODispatcher (1 thread) | analyticsDispatcher |
| **Swift** | Various queues | transientDB.sync (serial) | URLSession pool | Per-plugin queues |
| **JS Browser** | Main thread | Main thread | Main thread | Main thread |
| **JS Node.js** | Main thread | libuv pool | libuv pool | Main thread |

### React Native Threading

**JavaScript Layer:**
- Single JavaScript thread
- All SDK code runs here
- AsyncStorage/fetch bridge to native

**Native Layer (iOS/Android):**
- Native AsyncStorage implementation uses native threads
- Fetch uses native HTTP stack
- SDK doesn't directly manage native threads

**Bridge Overhead:**
```
JS Thread              Native Thread
    │                       │
    ├─ AsyncStorage.set()─→ │
    │  (marshaling)          │
    │                        ├─ Write to disk
    │                        │
    │ ←─ callback ──────────┤
    │  (marshaling)          │
```

---

### Kotlin Threading

**Three-Dispatcher Model:**

```kotlin
// 1. Analytics Dispatcher (Event Processing)
analyticsDispatcher = newSingleThreadContext("Analytics")
// - Single-threaded for consistency
// - All event processing happens here
// - No race conditions in event handling

// 2. File I/O Dispatcher (Storage Operations)
fileIODispatcher = Dispatchers.IO.limitedParallelism(1)
// - Thread pool for I/O operations
// - Limited to 1 for sequential writes
// - Prevents file corruption

// 3. Network I/O Dispatcher (Uploads)
networkIODispatcher = newSingleThreadContext("NetworkIO")
// - Single-threaded for sequential uploads
// - One batch at a time
// - Prevents server overload
```

**Context Switching:**
```kotlin
// Explicit dispatcher switching
suspend fun track(event: TrackEvent) {
    withContext(analyticsDispatcher) {
        // Process event on analytics thread
        timeline.process(event)
    }

    withContext(fileIODispatcher) {
        // Write to storage on I/O thread
        storage.write(event)
    }
}
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ No race conditions (single-threaded per dispatcher)
- ✅ I/O doesn't block event processing
- ✅ Explicit context makes reasoning easy

---

### Swift Threading

**Multiple Dispatch Queues:**

```swift
// Storage queue (serial)
private let syncQueue = DispatchQueue(label: "transientDB.sync")

// Plugin queues (varies per plugin)
// Each plugin can have own queue

// Main queue (lifecycle events)
NotificationCenter.default.addObserver(
    forName: UIApplication.didEnterBackgroundNotification,
    object: nil,
    queue: OperationQueue.main  // Main thread
) { _ in
    analytics.flush()
}
```

**Operating Modes:**
```swift
public enum OperatingMode {
    case synchronous   // Blocking operations
    case asynchronous  // Non-blocking operations (default)
}

// Sync mode:
syncQueue.sync {
    store.append(data: event)
}

// Async mode:
syncQueue.async {
    store.append(data: event)
}
```

**Atomic Operations:**
```swift
// os_unfair_lock for simple atomic values
@Atomic internal var eventCount: Int = 0
@Atomic internal var rateLimitEndTime: TimeInterval = 0

// Usage (thread-safe):
_eventCount.mutate { $0 += 1 }
```

**Benefits:**
- ✅ Fine-grained control
- ✅ Kernel-level locks (os_unfair_lock)
- ❌ More complex than coroutines
- ❌ Callback hell potential

---

### JavaScript Browser/Node.js Threading

**Single Main Thread:**
- All JavaScript execution on one thread
- Web Workers not used (too heavyweight for SDK)
- Node.js worker threads not used

**libuv Thread Pool (Node.js only):**
- File I/O operations
- DNS lookups
- Some crypto operations
- SDK doesn't directly interact with this

**Benefits:**
- ✅ Simplest mental model
- ✅ No race conditions
- ✅ No locks needed
- ❌ CPU-bound work blocks event loop

---

## 4. Synchronization Mechanisms

### Synchronization Primitives Comparison

| SDK | Mechanism | Use Case | Location |
|-----|-----------|----------|----------|
| **React Native** | None needed | Single-threaded JS | N/A |
| **Kotlin** | Coroutine contexts | Dispatcher isolation | withContext() calls |
| **Swift** | os_unfair_lock | Atomic values | @Atomic wrapper |
| **Swift** | DispatchQueue.sync | Serialized access | TransientDB |
| **JS Browser** | Guard flags | Prevent concurrent flush | `flushing` boolean |
| **JS Node.js** | Sequential await | Single batch at a time | async/await |

### React Native: No Synchronization Needed

```typescript
// Single-threaded, no race conditions
const events: SegmentEvent[] = []

function addEvent(event: SegmentEvent) {
    events.push(event)  // Safe without locks
}

function removeEvents(toRemove: Set<SegmentEvent>) {
    const filtered = events.filter(e => !toRemove.has(e))
    // Safe - atomic assignment in JS
}
```

**Why No Locks:**
- Single JavaScript thread
- All state modifications on same thread
- Native bridge operations are async but return to JS thread

---

### Kotlin: Coroutine Context as Synchronization

```kotlin
// Dispatcher acts as synchronization boundary
private val analyticsDispatcher = newSingleThreadContext("Analytics")

// All accesses to shared state happen on same dispatcher
suspend fun modifyState() {
    withContext(analyticsDispatcher) {
        // Only one coroutine executes here at a time
        sharedState.modify()
    }
}
```

**Shared State Example:**
```kotlin
// EventPipeline.kt
private val events = mutableListOf<Event>()

suspend fun addEvent(event: Event) {
    withContext(analyticsDispatcher) {
        events.add(event)  // Safe - single-threaded dispatcher
    }
}
```

**Benefits:**
- ✅ No explicit locks
- ✅ Structured concurrency
- ✅ Compiler-enforced safety (suspend functions)

---

### Swift: os_unfair_lock + Dispatch Queues

**Atomic Wrapper:**
```swift
@propertyWrapper
struct Atomic<Value> {
    private var lock = os_unfair_lock_s()
    private var value: Value

    mutating func mutate(_ mutation: (inout Value) -> Void) {
        os_unfair_lock_lock(&lock)
        defer { os_unfair_lock_unlock(&lock) }
        mutation(&value)
    }

    var wrappedValue: Value {
        mutating get {
            os_unfair_lock_lock(&lock)
            defer { os_unfair_lock_unlock(&lock) }
            return value
        }
    }
}
```

**Serial Queue Synchronization:**
```swift
private let syncQueue = DispatchQueue(label: "transientDB.sync")

func append(data: [UInt8]) {
    syncQueue.sync {  // Blocking synchronous dispatch
        store.append(data: data)
    }
}

func appendAsync(data: [UInt8]) {
    syncQueue.async {  // Non-blocking asynchronous dispatch
        store.append(data: data)
    }
}
```

**Why Both Mechanisms:**
- **os_unfair_lock:** For simple atomic values (counters, flags)
- **DispatchQueue:** For complex operations (file I/O, batch processing)

---

### JavaScript: Guard Flags

**Browser Flush Guard:**
```typescript
let flushing = false
let schedule: any

function scheduleFlush(attempt = 1): void {
    if (schedule || flushing) return  // Guard against concurrent flushes

    schedule = setTimeout(() => {
        schedule = undefined
        flushing = true

        flush(attempt)
            .catch(console.error)
            .finally(() => { flushing = false })
    }, timeout)
}
```

**Why Simple Guards Work:**
- Single-threaded execution
- No preemption within synchronous code
- async operations yield control explicitly

---

## 5. Parallel vs Sequential Execution

### Batch Upload Strategies

| SDK | Upload Strategy | Concurrency | Max In-Flight | Rationale |
|-----|-----------------|-------------|---------------|-----------|
| **React Native** | Parallel | Unbounded | No limit | Maximize throughput |
| **Kotlin** | Sequential | 1 at a time | 1 batch | Prevent server overload |
| **Swift** | Sequential | 1 at a time | 1 batch | Simple retry logic |
| **JS Browser** | Parallel | Guarded | Multiple | Leverage browser connection pooling |
| **JS Node.js** | Sequential | 1 at a time | 1 batch | Simple state management |

### React Native: Parallel Uploads

**Implementation:**
```typescript
// SegmentDestination.ts:56
const batches = util.chunk(events, MAX_EVENTS_PER_BATCH, MAX_PAYLOAD_SIZE_IN_KB)

await Promise.all(
    batches.map(async (batch) => {
        try {
            await uploadEvents(batch)
            // Success: dequeue events
        } catch (error) {
            // Error: events remain in queue
        }
    })
)
```

**Characteristics:**
- ✅ Multiple batches sent simultaneously
- ✅ Faster flush when multiple batches
- ❌ Unbounded concurrency (could overwhelm server)
- ❌ No request throttling

**Performance:**
```
Scenario: 300 events = 3 batches

Parallel (React Native):
Batch 1: ████████ (1s)
Batch 2: ████████ (1s)
Batch 3: ████████ (1s)
Total: 1 second

Sequential:
Batch 1: ████████ (1s)
Batch 2:         ████████ (1s)
Batch 3:                 ████████ (1s)
Total: 3 seconds
```

---

### Kotlin: Sequential Uploads

**Implementation:**
```kotlin
// EventPipeline.kt
suspend fun uploadFiles() {
    withContext(networkIODispatcher) {
        val files = storage.listFiles()

        for (file in files) {
            try {
                val batch = storage.readBatch(file)
                httpClient.post(batch)  // Sequential await
                storage.delete(file)
            } catch (error) {
                // File remains for retry
            }
        }
    }
}
```

**Characteristics:**
- ✅ Simple error handling
- ✅ Predictable server load
- ✅ One batch retry at a time
- ❌ Slower than parallel for multiple batches

**Rationale:**
- Stable batch IDs enable per-batch retry
- Sequential uploads simplify backoff logic
- Single-threaded networkIODispatcher enforces ordering

---

### Swift: Sequential Uploads

**Implementation:**
```swift
// SegmentDestination.swift
public func flush() {
    let urls = storage?.read(Storage.Constants.events, count: maxBatchSize)

    urls?.forEach { url in
        let uploadTask = httpClient.startBatchUpload(url: url) { result in
            handleResult(result)
        }
        uploads.append(uploadTask)
    }
}
```

**Characteristics:**
- ✅ Simple retry logic
- ✅ One batch at a time
- ❌ Sequential processing

**Note:** While `forEach` suggests potential parallelism, the URLSession typically serializes requests, and retry logic is sequential.

---

### JavaScript Browser: Parallel (Guarded)

**Implementation:**
```typescript
// batched-dispatcher.ts
async function flush(attempt = 1): Promise<unknown> {
    if (buffer.length) {
        const batch = buffer
        buffer = []

        // sendBatch returns Promise
        return sendBatch(batch)?.catch((error) => {
            // Re-queue on failure
            buffer.push(...batch)
            scheduleFlush(attempt + 1)
        })
    }
}

// On page unload, parallel chunks:
if (pageUnloaded && buffer.length) {
    const reqs = chunks(buffer).map(sendBatch)  // Multiple fetches
    Promise.all(reqs).catch(console.error)
}
```

**Characteristics:**
- ✅ Parallel sends on page unload (maximize chances)
- ✅ Guarded flush (prevent duplicates)
- ✅ Browser connection pooling handles concurrency

---

### JavaScript Node.js: Sequential

**Implementation:**
```typescript
// publisher.ts
async send(batch: ContextBatch) {
    // Sequential retry loop
    while (currentAttempt < maxAttempts) {
        const response = await this._httpClient.makeRequest(...)

        if (response.status >= 200 && response.status < 300) {
            return  // Success
        }

        // Retry with backoff
        await sleep(backoff(...))
    }
}

// Only one batch in flight
private _batch?: ContextBatch
```

**Characteristics:**
- ✅ Simple state management
- ✅ Atomic batch retry
- ❌ Lower throughput

---

## 6. Platform Constraints

### Platform-Specific Threading Limitations

| Platform | Main Thread Constraint | Background Constraint | I/O Model |
|----------|------------------------|----------------------|-----------|
| **React Native iOS** | Must handle UI on main | Limited bg time (~30s) | Async bridged |
| **React Native Android** | Must handle UI on main | Services possible | Async bridged |
| **Android (Kotlin)** | Must handle UI on main | Services, WorkManager | NIO available |
| **iOS (Swift)** | Must handle UI on main | Limited bg time (~30s) | Foundation URL Loading |
| **Browser** | Must handle UI on main | Web Workers (not used) | Fetch API |
| **Node.js** | No UI constraint | No constraint | libuv event loop |

### React Native Constraints

**JavaScript Thread:**
- Single-threaded
- Shared with React rendering
- Heavy computation blocks UI

**Background Execution:**
- iOS: ~30 seconds after backgrounding
- Android: More flexible with services

**Bridge Overhead:**
- Native calls have marshaling cost
- Batch native calls when possible

---

### Kotlin Constraints

**Android Threading Rules:**
```kotlin
// UI updates must be on main thread
withContext(Dispatchers.Main) {
    updateUI()
}

// Long-running work off main thread
withContext(Dispatchers.IO) {
    networkRequest()
}
```

**Background Execution:**
- Services for long-running tasks
- WorkManager for deferrable work
- Analytics uses coroutines for async work

---

### Swift Constraints

**iOS Main Thread Rule:**
```swift
DispatchQueue.main.async {
    // UI updates here
}

// Background work
DispatchQueue.global(qos: .background).async {
    // Heavy computation
}
```

**Background Time:**
```swift
var taskIdentifier: UIBackgroundTaskIdentifier = .invalid
taskIdentifier = application.beginBackgroundTask {
    // Called when time expires (~30s)
    urlTask.cancel()
    application.endBackgroundTask(taskIdentifier)
}
```

---

### Browser Constraints

**Single Main Thread:**
- All JavaScript on main thread
- UI rendering shares same thread
- Long-running JS blocks UI

**Web Workers (Not Used):**
- Could offload CPU work
- Overhead not worth it for analytics
- Message passing complexity

---

### Node.js Constraints

**No UI:**
- No main thread constraint
- All threads are "background"

**Event Loop:**
- Single-threaded JavaScript
- CPU-bound work blocks event loop
- I/O operations offloaded to thread pool

---

## 7. Performance Implications

### Throughput Comparison

**Scenario: 10,000 events queued, 100 batches to send**

| SDK | Upload Strategy | Estimated Time | Bottleneck |
|-----|-----------------|----------------|------------|
| **React Native** | Parallel | ~10-30s | Network bandwidth |
| **Kotlin** | Sequential | ~100-300s | Single-threaded upload |
| **Swift** | Sequential | ~100-300s | Single-threaded upload |
| **JS Browser** | Parallel (guarded) | ~10-30s | Network bandwidth |
| **JS Node.js** | Sequential | ~100-300s | Single-threaded upload |

**Assumptions:**
- 1-3s per batch upload (network latency)
- No failures, no retries

### CPU Usage

| SDK | Event Processing | Storage I/O | Network I/O |
|-----|------------------|-------------|-------------|
| **React Native** | JS thread (low) | Native threads (low) | Native threads (low) |
| **Kotlin** | Single thread (low) | Thread pool (low) | Single thread (low) |
| **Swift** | Multiple queues (low) | Serial queue (low) | URLSession pool (low) |
| **JS Browser** | Main thread (medium) | Main thread (low) | Main thread (low) |
| **JS Node.js** | Main thread (low) | libuv pool (low) | libuv pool (low) |

**Note:** All SDKs have low CPU usage because:
- Event processing is simple (JSON serialization)
- I/O is the bottleneck, not CPU
- Network operations are async

### Memory Usage

| SDK | Event Buffer | Batch Buffer | In-Flight Batches |
|-----|--------------|--------------|-------------------|
| **React Native** | Unbounded array | Ephemeral | Multiple (unbounded) |
| **Kotlin** | File-backed | File-backed | 1 at a time |
| **Swift** | File-backed (default) | File-backed | 1 at a time |
| **JS Browser** | localStorage + in-memory | Ephemeral | Multiple (guarded) |
| **JS Node.js** | In-memory | In-memory | 1 at a time |

**Memory Efficiency:**
- **Best:** Kotlin, Swift (file-backed, small in-memory footprint)
- **Medium:** React Native (large in-memory array but persisted)
- **Variable:** JS Browser (localStorage offloads memory, but quota limits)
- **Worst:** JS Node.js (all in-memory, but only 1 batch so actually low)

---

## 8. Key Differences Analysis

### Modern vs Legacy Concurrency

**Modern (async/await, coroutines):**
- React Native: async/await
- Kotlin: suspend functions
- JavaScript: async/await

**Benefits:**
- ✅ Linear code flow
- ✅ Easy error handling (try/catch)
- ✅ Composable (functions return Promises/suspend)

**Legacy (callbacks, GCD):**
- Swift: Callbacks + DispatchQueue

**Drawbacks:**
- ❌ Callback nesting ("pyramid of doom")
- ❌ Error handling with closures
- ❌ Less composable

**Why Swift Hasn't Migrated:**
- Requires iOS 15+ for Swift Concurrency
- Backward compatibility priority
- Migration would be breaking change

---

### Single-Threaded vs Multi-Threaded

**Single-Threaded (React Native, JS):**

**Pros:**
- ✅ Simple mental model
- ✅ No race conditions
- ✅ No locks needed

**Cons:**
- ❌ CPU-bound work blocks event loop
- ❌ Can't utilize multiple cores

**Multi-Threaded (Kotlin, Swift):**

**Pros:**
- ✅ I/O on separate threads
- ✅ Can utilize multiple cores
- ✅ More responsive

**Cons:**
- ❌ Requires synchronization
- ❌ More complex debugging
- ❌ Race condition risk

**For Analytics SDKs:**
- Single-threaded is sufficient (I/O bound, not CPU bound)
- Multi-threaded offers marginal benefit
- Complexity not justified

---

### Parallel vs Sequential Uploads

**Parallel (React Native, JS Browser):**

**Benefits:**
- ✅ Faster flush when multiple batches
- ✅ Better throughput

**Risks:**
- ❌ Can overwhelm server
- ❌ More complex error handling
- ❌ Potential thundering herd

**Sequential (Kotlin, Swift, JS Node.js):**

**Benefits:**
- ✅ Predictable server load
- ✅ Simple error handling
- ✅ One batch retry at a time

**Drawbacks:**
- ❌ Slower flush
- ❌ Lower throughput

**Recommendation:**
- **Parallel with limit:** Best of both worlds
- Add max concurrent requests (e.g., 3-5)
- React Native should add this

---

### Platform Justification

| SDK | Concurrency Model | Justified? | Reason |
|-----|-------------------|------------|--------|
| **React Native** | Single-threaded | ✅ Yes | JavaScript inherent constraint |
| **Kotlin** | Multi-dispatcher | ✅ Yes | Kotlin coroutines best practice |
| **Swift** | GCD | ⚠️ Legacy | Could migrate to Swift Concurrency (iOS 15+) |
| **JS Browser** | Single-threaded | ✅ Yes | Browser inherent constraint |
| **JS Node.js** | Single-threaded | ✅ Yes | Node.js inherent constraint |

---

## 9. Recommendations

### For React Native

**Current State:**
- Parallel uploads (unbounded)
- Promise-based async
- Single-threaded

**Recommendations:**

1. **Add Max Concurrent Uploads:**
   ```typescript
   const MAX_CONCURRENT_UPLOADS = 3

   async function uploadBatches(batches: Batch[]) {
       const results = []
       for (let i = 0; i < batches.length; i += MAX_CONCURRENT_UPLOADS) {
           const chunk = batches.slice(i, i + MAX_CONCURRENT_UPLOADS)
           const chunkResults = await Promise.all(chunk.map(uploadBatch))
           results.push(...chunkResults)
       }
       return results
   }
   ```

2. **Add Request Throttling:**
   - Prevent thundering herd during retry storms
   - Add delay between batch sends

**Priority:** Medium (unbounded concurrency could overwhelm server)

---

### For Kotlin

**Current State:**
- Sequential uploads
- Multi-dispatcher coroutines
- Explicit context switching

**Recommendations:**

1. **Consider Parallel Uploads (Optional):**
   ```kotlin
   suspend fun uploadFiles() {
       withContext(networkIODispatcher) {
           val files = storage.listFiles()

           // Parallel with limit
           files.chunked(3).forEach { chunk ->
               chunk.map { file ->
                   async { uploadFile(file) }
               }.awaitAll()
           }
       }
   }
   ```

2. **Keep Sequential for Simplicity:**
   - Current sequential approach is solid
   - Parallel not necessary unless throughput issue

**Priority:** Low (current implementation good)

---

### For Swift

**Current State:**
- GCD-based callbacks
- os_unfair_lock for atomics
- Sequential uploads

**Recommendations:**

1. **Migrate to Swift Concurrency (Long-term):**
   ```swift
   // Future state (iOS 15+)
   actor Analytics {
       func track(event: Event) async {
           await timeline.process(event)
           await storage.write(event)
       }
   }
   ```

2. **Keep GCD (Short-term):**
   - Maintains iOS 13+ compatibility
   - Migration is breaking change

**Priority:** Low (GCD works, migration is nice-to-have)

---

### For JavaScript Browser

**Current State:**
- Parallel uploads (guarded)
- Single-threaded event loop
- Flush guard

**Recommendations:**

1. **Current Implementation Good:**
   - Guard prevents duplicate flushes
   - Parallel on page unload is smart

2. **Consider Max Concurrent (Optional):**
   - Similar to React Native recommendation
   - Chunk batches to limit concurrency

**Priority:** Low (current implementation solid)

---

### For JavaScript Node.js

**Current State:**
- Sequential uploads
- Single-threaded
- Atomic batch retry

**Recommendations:**

1. **Keep Sequential:**
   - Simple state management
   - Server-side should handle high throughput via scaling
   - Multiple SDK instances can run in parallel

2. **Document Scaling Pattern:**
   ```typescript
   // Example: Multiple analytics instances
   const analytics1 = new Analytics({ writeKey: 'key1' })
   const analytics2 = new Analytics({ writeKey: 'key2' })

   // Each has own event loop, effectively parallel
   ```

**Priority:** Low (intentional design for simplicity)

---

### Cross-SDK Consistency

**Parallel Upload Limits:**
- All SDKs should have configurable max concurrent uploads
- Prevents server overload during retry storms
- Default: 3-5 concurrent requests

**Configuration Example:**
```typescript
interface UploadConfig {
    maxConcurrentUploads: number  // Default: 3
    uploadTimeout: number          // Default: 10s
}
```

**Priority:** High for React Native, Medium for others

---

## Summary

### Key Findings

1. **Concurrency Models Vary:**
   - Modern: React Native, Kotlin, JavaScript (async/await, coroutines)
   - Legacy: Swift (GCD callbacks)

2. **Threading Strategy:**
   - Single-threaded: React Native, JavaScript (platform constraint)
   - Multi-threaded: Kotlin, Swift (platform capability)

3. **Upload Strategy:**
   - Parallel: React Native, JS Browser (maximize throughput)
   - Sequential: Kotlin, Swift, JS Node.js (simplicity)

4. **Platform Justification:**
   - Most choices justified by platform constraints
   - Swift could modernize (Swift Concurrency)
   - React Native needs upload limits

5. **Performance:**
   - All SDKs I/O-bound, not CPU-bound
   - Parallel uploads 3-10x faster with multiple batches
   - Sequential simpler for retry logic

### Architectural Implications for TAPI

**Parallel Uploads:**
- Require careful backoff coordination
- Risk: Multiple batches hit rate limit simultaneously
- Mitigation: Global backoff blocks all uploads

**Sequential Uploads:**
- Natural fit for per-batch backoff
- Simple retry logic
- Lower throughput

**Recommendation:**
- **Parallel SDKs (RN, JS Browser):** Use global backoff
- **Sequential SDKs (Kotlin, Swift, JS Node):** Can use per-batch or global

### Next Steps

1. Add upload concurrency limits (React Native priority)
2. Document scaling patterns (Node.js)
3. Consider Swift Concurrency migration (long-term)
