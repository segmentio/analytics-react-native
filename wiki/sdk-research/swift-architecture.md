# Analytics-Swift SDK Architecture Analysis

**Repository:** https://github.com/segmentio/analytics-swift
**Local Path:** /Users/abueide/code/analytics-swift
**Analysis Date:** 2026-03-06
**Purpose:** Understand architecture patterns for TAPI backoff implementation planning

---

## Table of Contents

1. [Event Lifecycle](#1-event-lifecycle)
2. [Queue & Batch Architecture](#2-queue--batch-architecture)
3. [Storage Layer](#3-storage-layer)
4. [Concurrency Model](#4-concurrency-model)
5. [Plugin Architecture](#5-plugin-architecture)
6. [Error Handling & Retry Logic](#6-error-handling--retry-logic)
7. [Platform Capabilities](#7-platform-capabilities)
8. [Batch Identity & Tracking](#8-batch-identity--tracking)
9. [Existing TAPI Implementation](#9-existing-tapi-implementation)
10. [Memory Management](#10-memory-management)
11. [Key Architectural Decisions](#11-key-architectural-decisions)
12. [TAPI Implementation Feasibility](#12-tapi-implementation-feasibility)
13. [Critical Findings](#13-critical-findings)

---

## 1. Event Lifecycle

### Flow Overview

```
analytics.track()
  → Analytics.process()
  → Timeline.process() (plugin chain)
  → SegmentDestination.queueEvent()
  → Storage.write(.events)
  → TransientDB.append()
  → DirectoryStore/MemoryStore

[Later, on flush trigger]
  → SegmentDestination.flush()
  → DirectoryStore.fetch()
  → HTTPClient.startBatchUpload()
  → Server Response Handler
    → 2xx: Delete batch
    → 400: Delete batch (malformed)
    → 429/5xx: Keep batch, NO BACKOFF
```

### Key Files

- **Event Entry Point:**
  `/Users/abueide/code/analytics-swift/Sources/Segment/Analytics.swift:108-143`

- **Plugin Chain Execution:**
  `/Users/abueide/code/analytics-swift/Sources/Segment/Timeline.swift:28-53, 94-118`

- **SegmentDestination Queueing:**
  `/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/SegmentDestination.swift:115-122, 155-211`

- **HTTP Response Handling:**
  `/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Networking/HTTPClient.swift:98-119`

### Event Processing Details

1. **Track Entry:**
   ```swift
   analytics.track(name: "Button Clicked", properties: ["button": "submit"])
   ```

2. **Message ID Assignment:**
   ```swift
   result.messageId = UUID().uuidString  // Unique per event
   result.timestamp = Date().iso8601()
   ```
   Location: `/Users/abueide/code/analytics-swift/Sources/Segment/Types.swift:21-33`

3. **Plugin Chain:**
   - `.before` plugins (can filter/modify)
   - `.enrichment` plugins (middleware)
   - `.destination` plugins (SegmentDestination, custom integrations)
   - `.after` plugins (cleanup)

4. **Storage:**
   - Events appended to active file or memory buffer
   - Async or sync mode (configurable)

5. **Flush Triggers:**
   - Manual: `analytics.flush()`
   - Count-based: When event count reaches `flushAt` (default 20)
   - Interval-based: Every `flushInterval` seconds (default 30s)
   - Lifecycle: On app background

---

## 2. Queue & Batch Architecture

### Queue Implementation

The Swift SDK provides **three storage modes** via the `DataStore` protocol:

#### Mode 1: DirectoryStore (Default - File-based)

**Purpose:** Persistent event storage with disk-based batches

**File Naming Pattern:**
```
{index}-segment-events        // Active batch being written to
{index}-segment-events.temp   // Finalized batch ready for upload
```

**File Format:**
```json
{
  "batch": [
    {"type":"track", "event":"Click", "messageId":"uuid1", "timestamp":"2025-03-06T..."},
    {"type":"track", "event":"View", "messageId":"uuid2", "timestamp":"2025-03-06T..."}
  ],
  "sentAt": "2025-03-06T10:35:20.123Z",
  "writeKey": "write_key_here"
}
```

**Storage Location:**
```swift
static func eventStorageDirectory(writeKey: String) -> URL {
    // Returns: {Application Support}/segment/events/{writeKey}/
}
```

**Max File Size:** 475KB (server max is 500KB)

**Index Management:**
```swift
// Stored in UserDefaults
func getIndex() -> Int {
    let index: Int = userDefaults.integer(forKey: config.indexKey)
    return index
}

func incrementIndex() {
    let index = getIndex()
    userDefaults.set(index + 1, forKey: config.indexKey)
}
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/Types/DirectoryStore.swift:62-106, 183-205, 208-218`

#### Mode 2: MemoryStore (In-memory)

**Purpose:** Non-persistent event storage for testing or specific use cases

**Structure:**
```swift
internal class MemoryStore<StoreType: Codable>: DataStore {
    internal var storage = [String: StoreType]()  // Key = UUID
}
```

**Behavior:**
- Items stored with UUID keys
- FIFO eviction when max count exceeded
- All data lost on app restart

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/Types/MemoryStore.swift:59-92`

#### Mode 3: Custom DataStore

Users can implement their own storage backend via the `DataStore` protocol.

### Batch Creation Strategy

**Batching Logic:**

1. **Event Append:**
   ```swift
   // Each event appended as single JSON line
   storage.write(Storage.Constants.events, value: event)
   ```

2. **File Rotation:**
   ```swift
   if fileSize > maxFileSize {
       store.finishFile()  // Rename to .temp
       store.nextFile()    // Start new file
   }
   ```

3. **Batch Fetch on Flush:**
   ```swift
   let urls = storage.read(Storage.Constants.events,
                          count: maxBatchSize,
                          maxBytes: maxBatchBytes)
   ```

**Batch Size Limits:**
- Default `flushAt`: 20 events
- Max file size: 475KB
- Server max: 500KB

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/Types/DirectoryStore.swift:151-172`

### Concurrency Control

All storage operations serialized through dedicated queue:

```swift
private let syncQueue = DispatchQueue(label: "transientDB.sync")

func append(data: [UInt8]) {
    syncQueue.sync {
        store.append(data: data)
    }
}
```

**Operating Modes:**
- **Async** (default): Non-blocking event appends
- **Sync**: Blocking appends for guaranteed write before return

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/TransientDB.swift:13-73`

---

## 3. Storage Layer

### Three-Layer Storage Architecture

#### Layer 1: Event Queue

**DirectoryStore Implementation:**

```swift
// Append event to active file
func append(data: [UInt8]) throws {
    try ensureActiveFile()
    try writer.writeLine(data: data)
    try writer.flush()
}

// Fetch batches for upload
func fetch(count: Int, maxBytes: Int) -> [URL] {
    let files = try? fileManager.contentsOfDirectory(at: directory, ...)
    let tempFiles = files?.filter { $0.pathExtension == "temp" }
    return Array(tempFiles.prefix(count))
}

// Delete after successful upload
func remove(data: [URL]) throws {
    for url in data {
        try fileManager.removeItem(at: url)
    }
}
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/Types/DirectoryStore.swift`

#### Layer 2: User State (UserDefaults)

**Stored Data:**
```swift
UserDefaults.standard {
    "com.segment.storage.{writeKey}": {
        "userId": "user123",
        "anonymousId": "anon456",
        "traits": { "email": "user@example.com" },
        "settings": { /* Segment settings */ }
    },
    "com.segment.directoryStore.index": 5  // Current file index
}
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/Storage.swift:21-59`

#### Layer 3: Settings Cache

**Remote Settings:**
- Fetched from `cdn-settings.segment.com/v1/projects/{writeKey}/settings`
- Cached in UserDefaults
- Refreshed on app foreground

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Startup.swift:81-91`

### File Lifecycle

```
Create:    0-segment-events (no extension)
           ↓ (append events as JSON lines)
Active:    0-segment-events
           ↓ (file reaches 475KB or flush triggered)
Finalize:  0-segment-events.temp (add closing bracket)
           ↓ (upload attempt)
Upload:    HTTP POST to api.segment.io/v1/b
           ↓
Success:   File deleted
Failure:   File remains as .temp (retry on next flush)
```

### Crash Recovery

**On App Restart:**
1. Any `.temp` files automatically included in next fetch
2. Active file (without `.temp`) continues to be appended to
3. No events lost if written to disk before crash

**On App Upgrade:**
- Storage location preserved across versions
- UserDefaults index persists

---

## 4. Concurrency Model

### GCD-Only Architecture

**No async/await or actors used** in entire codebase. All concurrency via Grand Central Dispatch.

### Synchronization Mechanisms

#### 1. OS Unfair Lock (Atomic Wrapper)

```swift
@propertyWrapper
struct Atomic<Value> {
    private var lock = os_unfair_lock_s()  // Darwin only
    private var value: Value

    func mutate(_ mutation: (inout Value) -> Void) {
        os_unfair_lock_lock(&lock)
        mutation(&value)
        os_unfair_lock_unlock(&lock)
    }
}

// Usage:
@Atomic internal var eventCount: Int = 0
@Atomic internal var rateLimitEndTime: TimeInterval = 0

_eventCount.mutate { $0 += 1 }
```

**Platform Differences:**
- **Darwin:** `os_unfair_lock` (kernel-level unfair spinlock)
- **Linux/Windows:** Falls back to `NSLock`

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Atomic.swift:23-86`

#### 2. DispatchQueue Serialization

```swift
// TransientDB uses serial queue for all storage operations
private let syncQueue = DispatchQueue(label: "transientDB.sync")

// Blocking write
syncQueue.sync {
    store.append(data: event)
}

// Non-blocking write (async mode)
syncQueue.async {
    store.append(data: event)
}
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/TransientDB.swift`

#### 3. CompletionGroup (Multi-plugin Coordination)

```swift
// Flush multiple plugins in parallel
let completionGroup = CompletionGroup(queue: flushQueue)

apply { plugin in
    completionGroup.add { group in
        if let p = plugin as? FlushCompletion {
            p.flush(group: group)
        }
    }
}

completionGroup.run(mode: operatingMode) {
    completion?()
}
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Timeline.swift:28-53`

#### 4. DispatchSemaphore (Wait on Upload)

```swift
// Wait for in-memory batch upload to complete
let semaphore = DispatchSemaphore(value: 0)

httpClient.startBatchUpload(...) { result in
    semaphore.signal()
}

_ = semaphore.wait(timeout: .distantFuture)
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/SegmentDestination.swift:251-263`

### Operating Modes

```swift
public enum OperatingMode {
    case synchronous  // Blocking operations
    case asynchronous // Non-blocking operations (default)
}

// Configuration:
config.operatingMode = .asynchronous
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Configuration.swift:27-35`

---

## 5. Plugin Architecture

### Plugin System Overview

```
Event → Timeline.process()
  ├→ .before plugins (can filter/modify)
  ├→ .enrichment plugins (middleware)
  ├→ .destination plugins (isolated, no return propagation)
  └→ .after plugins (cleanup)
```

### Plugin Types

```swift
public enum PluginType: Int, CaseIterable {
    case before = 0
    case enrichment = 1
    case destination = 2
    case after = 3
    case utility = 4
}
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Plugins.swift:13-59`

### Plugin Protocols

```swift
// Base protocol
public protocol Plugin: AnyObject {
    var type: PluginType { get }
    var analytics: Analytics? { get set }

    func configure(analytics: Analytics)
    func execute<T: RawEvent>(event: T?) -> T?
}

// Event-handling plugin
public protocol EventPlugin: Plugin {
    func identify(event: IdentifyEvent) -> IdentifyEvent?
    func track(event: TrackEvent) -> TrackEvent?
    func screen(event: ScreenEvent) -> ScreenEvent?
    func group(event: GroupEvent) -> GroupEvent?
    func alias(event: AliasEvent) -> AliasEvent?
    func flush()
    func reset()
}

// Destination plugin (has own timeline)
public protocol DestinationPlugin: EventPlugin {
    var key: String { get }
    var timeline: Timeline { get }

    func add(plugin: Plugin) -> Plugin
    func apply(closure: (Plugin) -> Void)
    func remove(plugin: Plugin)
}
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Plugins.swift:89-150`

### SegmentDestination (Built-in)

```swift
public class SegmentDestination: DestinationPlugin {
    public var type = PluginType.destination
    public var key = "Segment.io"
    public var timeline = Timeline()

    private var uploads = [UploadTaskInfo]()  // Track in-flight uploads

    public func track(event: TrackEvent) -> TrackEvent? {
        queueEvent(event: event)
        return event
    }

    internal func queueEvent<T: RawEvent>(event: T) {
        storage?.write(Storage.Constants.events, value: event)
    }

    public func flush() {
        sendBatches()
    }
}
```

**Responsibilities:**
- Queue events to storage
- Manage batch uploads
- Handle upload responses
- Track in-flight upload tasks

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/SegmentDestination.swift`

### Adding Custom Plugins

```swift
// Add destination plugin
analytics.add(plugin: MyDestination())

// Add enrichment closure
analytics.add(enrichment: { event in
    var modifiedEvent = event
    modifiedEvent.context?["custom"] = "value"
    return modifiedEvent
})

// Add before plugin (filtering)
class ValidationPlugin: Plugin {
    var type: PluginType = .before

    func execute<T: RawEvent>(event: T?) -> T? {
        guard let trackEvent = event as? TrackEvent else { return event }
        return trackEvent.event.isEmpty ? nil : event  // Filter empty
    }
}
```

---

## 6. Error Handling & Retry Logic

### Error Classification

```swift
public enum AnalyticsError: Error {
    // Storage errors
    case storageUnableToCreate(String)
    case storageUnableToWrite(String)
    case storageUnableToRename(String)
    case storageUnableToOpen(String)
    case storageUnableToClose(String)
    case storageInvalid(String)

    // Network errors
    case networkUnknown(Error)
    case networkServerRejected(code: Int)
    case networkServerLimited(code: Int)
    case networkUnexpectedHTTPCode(code: Int)
    case networkInvalidData

    // JSON errors
    case jsonUnableToSerialize(error: Error)
    case jsonUnableToDeserialize(error: Error)
    case jsonUnknown(error: Error)

    // Plugin errors
    case pluginError(error: Error)

    // Compound errors
    case settingsFail(error: Error)
    case batchUploadFail(error: Error)
}

public enum HTTPClientErrors: Error {
    case badSession
    case failedToOpenBatch
    case statusCode(code: Int)
    case unknown(error: Error)
}
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Errors.swift`

### HTTP Response Handling

**Current Implementation:**

```swift
// HTTPClient.swift:98-119
private func handleResponse(response: URLResponse?, error: Error?) -> HTTPClientErrors? {
    if let error = error {
        return .unknown(error: error)
    }

    if let httpResponse = response as? HTTPURLResponse {
        let httpStatusCode = httpResponse.statusCode

        switch httpStatusCode {
        case 1..<300:
            return nil  // SUCCESS

        case 300..<400:
            return .statusCode(code: httpStatusCode)  // REDIRECT

        default:
            return .statusCode(code: httpStatusCode)  // ERROR
        }
    }

    return .badSession
}

// SegmentDestination.swift:180-192
private func handleResult(result: Result<UploadTaskInfo, Error>) {
    switch result {
    case .success(let info):
        // Delete batch file
        if let url = info.url {
            storage?.remove(data: [url])
        }
        info.cleanup?()

    case .failure(let error):
        // Report error, keep batch
        reportInternalError(...)
        // NO RETRY DELAY, NO BACKOFF
    }
}
```

**Response Code Behavior:**

| Code Range | Action | Batch Fate | Retry Behavior |
|------------|--------|------------|----------------|
| 2xx | Success | Deleted | N/A |
| 400 | Malformed JSON | Deleted | N/A (non-retryable) |
| 429 | Rate Limited | **Kept** | **Immediate retry on next flush** |
| 5xx | Server Error | **Kept** | **Immediate retry on next flush** |
| Network | Connection Failed | **Kept** | **Immediate retry on next flush** |

**Critical Gap:**
- ❌ No exponential backoff
- ❌ No jitter
- ❌ No retry delay
- ❌ No max retry attempts
- ❌ No Retry-After header parsing for batch uploads

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Networking/HTTPClient.swift:98-119`
`/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/SegmentDestination.swift:180-192, 251-263`

### Error Reporting

```swift
// User-provided error handler
configuration.values.errorHandler?(translatedError)

// Telemetry error tracking
Telemetry.shared.error(metric: INVOKE_ERROR_METRIC, ...)
```

---

## 7. Platform Capabilities

### iOS Lifecycle Events Monitored

```swift
// iOSLifecycleMonitor.swift:39-242
NotificationCenter.default.addObserver(
    forName: UIApplication.didEnterBackgroundNotification,
    object: nil, queue: OperationQueue.main) { _ in
    analytics.flush()  // Flush on background
}

NotificationCenter.default.addObserver(
    forName: UIApplication.willEnterForegroundNotification,
    object: nil, queue: OperationQueue.main) { _ in
    analytics.checkSettings()  // Refresh settings on foreground
}
```

**Monitored Events:**
- `didFinishLaunching` → Initialize
- `didBecomeActive` → Resume operations
- `willResignActive` → Pause operations
- `didEnterBackground` → Flush events
- `willEnterForeground` → Resume timers, check settings
- `willTerminate` → Final flush
- `didReceiveMemoryWarning` → Potential storage purge
- `significantTimeChange` → Clock sync
- `backgroundRefreshStatusDidChange` → Monitor capabilities

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/Platforms/iOS/iOSLifecycleMonitor.swift:39-242`

### Background Task Management

**Purpose:** Allow uploads to continue after app backgrounding

```swift
// iOSLifecycleMonitor.swift:190-209
internal static func beginBackgroundTask(application: UIApplication,
                                        urlTask: URLSessionTask) -> (() -> Void)? {
    var taskIdentifier: UIBackgroundTaskIdentifier = .invalid

    taskIdentifier = application.beginBackgroundTask {
        urlTask.cancel()
        application.endBackgroundTask(taskIdentifier)
    }

    return {
        application.endBackgroundTask(taskIdentifier)
    }
}
```

**Behavior:**
- Requests extra background time from iOS
- Allows upload to complete even after app goes to background
- System grants ~30 seconds (not guaranteed)
- Upload canceled if time expires

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/Platforms/iOS/iOSLifecycleMonitor.swift:190-209`

### Flush Policy Integration

**IntervalBasedFlushPolicy:**
```swift
public class IntervalBasedFlushPolicy: FlushPolicy {
    private var timer: Timer?

    func schedule(interval: TimeInterval) {
        timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { _ in
            self.analytics?.flush()
        }
    }

    func applicationDidEnterBackground() {
        timer?.invalidate()  // Pause timer
    }

    func applicationWillEnterForeground() {
        schedule(interval: flushInterval)  // Resume timer
    }
}
```

**Prevents unnecessary wakeups when app is backgrounded.**

---

## 8. Batch Identity & Tracking

### Event-Level Identity

Every event gets a unique identifier at enrichment time:

```swift
// Types.swift:21-33
public struct RawEvent {
    public var messageId: String? = nil
    public var timestamp: String? = nil
    // ...
}

// Applied in applyRawEventData():
result.messageId = UUID().uuidString  // Unique per event
result.timestamp = Date().iso8601()
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Types.swift:21-33`

### Batch-Level Identity

Batches identified via file index counter:

```swift
// DirectoryStore.swift:208-218
func getIndex() -> Int {
    let index: Int = userDefaults.integer(forKey: config.indexKey)
    return index
}

func incrementIndex() {
    let index = getIndex()
    userDefaults.set(index + 1, forKey: config.indexKey)
}

// File naming pattern:
// 0-segment-events (batch 0, active)
// 1-segment-events (batch 1, active)
// 2-segment-events.temp (batch 2, finalized)
```

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Storage/Types/DirectoryStore.swift:208-218`

### Upload Task Tracking

```swift
// SegmentDestination.swift:41-48
internal struct UploadTaskInfo {
    let url: URL?              // File URL identifies batch
    let data: Data?            // In-memory data
    let task: DataTask         // URLSessionTask
    var cleanup: CleanupClosure?
}

private var uploads = [UploadTaskInfo]()  // Track in-flight uploads
```

**Tracking Behavior:**
- In-flight uploads stored in array
- Identified by file URL or data buffer
- Removed on success or failure
- No persistent retry metadata

**Important Limitation:**
- No public batch ID API exposed
- No way for users to correlate failed batches to original events
- No retry count tracking per batch
- No per-batch backoff state

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/SegmentDestination.swift:41-48, 289-321`

---

## 9. Existing TAPI Implementation

### Rate Limiting: Telemetry Only

**✅ Exists for Telemetry (Metrics):**

```swift
// Telemetry.swift:90
@Atomic private var rateLimitEndTime: TimeInterval = 0

// Telemetry.swift:177-180
private func isRateLimited() -> Bool {
    let currentTime = Date().timeIntervalSince1970
    return currentTime < rateLimitEndTime
}

// Telemetry.swift:213-216
if let retryAfterHeader = httpResponse.value(forHTTPHeaderField: "Retry-After"),
   let retryAfterSeconds = TimeInterval(retryAfterHeader) {
    rateLimitEndTime = currentTime + retryAfterSeconds
}
```

**Behavior:**
- Parses `Retry-After` header
- Tracks rate limit window in `@Atomic` variable
- Skips telemetry sends during rate limit window
- **Only applies to telemetry endpoints, NOT batch uploads**

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Telemetry.swift:90, 177-180, 213-216`

### Batch Uploads: No TAPI Compliance

**❌ Missing for Batch Uploads:**

```swift
// HTTPClient.swift - No Retry-After parsing
private func handleResponse(response: URLResponse?, error: Error?) -> HTTPClientErrors? {
    if let httpResponse = response as? HTTPURLResponse {
        let httpStatusCode = httpResponse.statusCode

        switch httpStatusCode {
        case 1..<300:
            return nil  // SUCCESS
        case 300..<400:
            return .statusCode(code: httpStatusCode)  // REDIRECT
        default:
            return .statusCode(code: httpStatusCode)  // ERROR
        }
    }

    return .badSession
}

// SegmentDestination.swift - No backoff logic
case .failure(let error):
    reportInternalError(...)
    // Batch remains queued
    // NO DELAY, NO BACKOFF, NO RETRY-AFTER
```

**Missing Features:**
- ❌ No `Retry-After` header parsing
- ❌ No exponential backoff
- ❌ No jitter
- ❌ No retry count tracking
- ❌ No max retry attempts
- ❌ No backoff state persistence
- ❌ No rate limit status API

**Retry Behavior:**
| Error | Current Behavior | SDD-Compliant Behavior |
|-------|------------------|------------------------|
| 429 | Immediate retry on next flush | Exponential backoff with jitter |
| 5xx | Immediate retry on next flush | Exponential backoff with jitter |
| Network | Immediate retry on next flush | Exponential backoff with jitter |

**Location:**
`/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Networking/HTTPClient.swift:98-119`
`/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/SegmentDestination.swift:180-192`

---

## 10. Memory Management

### Event Count Tracking

```swift
@Atomic internal var eventCount: Int = 0

func track(name: String, properties: [String: Any]? = nil) {
    _eventCount.mutate { $0 += 1 }
    // ...
}
```

### Queue Limits

**DirectoryStore:**
- No explicit event count limit
- Limited by disk space
- Max file size: 475KB per batch
- Files accumulate until uploaded

**MemoryStore:**
```swift
internal var maxCount: Int = 1000

func append(data: [UInt8]) throws {
    if storage.count >= maxCount {
        // FIFO eviction - remove oldest item
        if let firstKey = storage.keys.first {
            storage.removeValue(forKey: firstKey)
        }
    }
    storage[UUID().uuidString] = data
}
```

### File Cleanup

**Successful Upload:**
```swift
storage?.remove(data: [url])  // Delete batch file
```

**Failed Upload:**
- Batch file remains on disk
- Retried on next flush
- No automatic cleanup of failed batches
- **Potential accumulation if TAPI consistently fails**

---

## 11. Key Architectural Decisions

### Design Principles

1. **GCD-Only Concurrency**
   - No async/await despite Swift 5.5+ availability
   - Likely for iOS 13+ compatibility
   - Uses os_unfair_lock for atomic operations

2. **Pluggable Storage**
   - File-based (persistent)
   - Memory-based (ephemeral)
   - Custom (user-provided)

3. **Event-First Architecture**
   - Events are primary storage unit
   - Batches created on-demand from event files
   - No stable batch identifiers
   - Similar to React Native approach

4. **Plugin Isolation**
   - Destination plugins have own timelines
   - Errors in one destination don't affect others
   - Sequential execution within plugin types

5. **Lifecycle-Aware**
   - Automatic flush on background
   - Timer suspension on background
   - Background task support for uploads

### Trade-offs

**Pros:**
✅ Simple, predictable concurrency model
✅ Flexible storage backends
✅ Clean plugin architecture
✅ Good iOS platform integration
✅ Type-safe event system

**Cons:**
❌ No stable batch identifiers (complicates per-batch backoff)
❌ No TAPI compliance for batch uploads
❌ No retry limits (failed batches accumulate)
❌ Immediate retry on failure (no backoff)
❌ GCD-only (misses modern Swift concurrency benefits)

---

## 12. TAPI Implementation Feasibility

### Current State

**Telemetry:**
✅ Has Retry-After parsing
✅ Has rate limit window tracking
✅ Skips sends during rate limit

**Batch Uploads:**
❌ No Retry-After parsing
❌ No backoff delays
❌ No retry count tracking
❌ No max retry attempts

### Per-Batch Backoff Challenges

**Similar to React Native:**

1. **No Stable Batch IDs**
   - Batches identified by file URL
   - File URLs change on rename
   - No persistent batch metadata

2. **File-Based Storage Limitations**
   - Would need separate metadata file per batch
   - Example: `2-segment-events.metadata` containing retry count, backoff state
   - Adds complexity to file management

3. **Ephemeral Upload Tracking**
   - `UploadTaskInfo` only exists during upload
   - No retry state persisted between app restarts

### Implementation Options

#### Option 1: Global Backoff (Simple)

**Changes Required:**
1. Add `@Atomic var backoffEndTime: TimeInterval` to SegmentDestination
2. Parse Retry-After header in HTTPClient
3. Check backoff state before sending batches
4. Implement exponential backoff with jitter

**Estimated Effort:** 50-100 LOC

**Pros:**
- Minimal changes
- No batch identity tracking needed
- Follows React Native current approach

**Cons:**
- One failed batch blocks all batches
- Less resilient during partial failures

#### Option 2: Per-Batch Backoff with Metadata Files

**Changes Required:**
1. Create `BatchMetadata` struct (retry count, last attempt, backoff end time)
2. Persist metadata alongside batch files (`.metadata` extension)
3. Load metadata before upload attempt
4. Update metadata after each attempt
5. Implement exponential backoff per batch

**Estimated Effort:** 300-400 LOC

**Pros:**
- Per-batch isolation
- Better resilience
- SDD-compliant

**Cons:**
- Significant file management complexity
- Metadata sync issues
- Crash recovery complexity

#### Option 3: In-Memory Backoff State (Hybrid)

**Changes Required:**
1. Track backoff state per file URL in dictionary
2. State lost on app restart (acceptable?)
3. Implement exponential backoff per batch in-memory

**Estimated Effort:** 150-200 LOC

**Pros:**
- Per-batch isolation during app session
- Less file management complexity

**Cons:**
- State lost on restart (batches retry immediately)
- Memory overhead

### Recommendation

**Start with Option 1 (Global Backoff)** for Swift SDK:

**Justification:**
1. Architectural parity with React Native (both event-first)
2. Minimal implementation risk
3. Telemetry already has this pattern (reuse code)
4. Can refactor to per-batch later if needed

**Code Reuse from Telemetry:**
```swift
// Copy pattern from Telemetry.swift:90, 177-180, 213-216
@Atomic private var backoffEndTime: TimeInterval = 0

private func isBackoffActive() -> Bool {
    let currentTime = Date().timeIntervalSince1970
    return currentTime < backoffEndTime
}

// In HTTPClient response handler:
if let retryAfterHeader = httpResponse.value(forHTTPHeaderField: "Retry-After"),
   let retryAfterSeconds = TimeInterval(retryAfterHeader) {
    backoffEndTime = currentTime + retryAfterSeconds
}
```

---

## 13. Critical Findings

### Architectural Similarities to React Native

Both SDKs share:
1. **Event-first architecture** (events are persistence unit)
2. **Ephemeral batches** (no stable batch IDs)
3. **File index-based naming** (counter in UserDefaults/AsyncStorage)
4. **On-demand batch formation** (batches created at flush time)
5. **No per-batch metadata tracking**

### Key Differences from Kotlin

| Aspect | Swift | Kotlin |
|--------|-------|--------|
| **Batch Identity** | File index only | File-based with stable paths |
| **Concurrency** | GCD | Coroutines |
| **Storage** | Pluggable (file/memory) | File-only |
| **Retry Metadata** | None | Can add to file |
| **TAPI Support** | Telemetry only | None yet |

### TAPI Implementation Implications

1. **Global backoff is architecturally natural** for Swift (same as RN)
2. **Per-batch backoff requires significant changes** (~300-400 LOC)
3. **Telemetry pattern can be reused** for global backoff
4. **File metadata approach possible** but adds complexity

### Immediate Action Items

**High Priority:**
1. Add Retry-After header parsing to HTTPClient
2. Implement exponential backoff with jitter
3. Add configuration options for backoff behavior
4. Add rate limit status API for observability

**Medium Priority:**
5. Track retry counts (even if global)
6. Implement max retry attempts
7. Add batch cleanup for permanently failed batches
8. Persist backoff state across app restarts

**Low Priority:**
9. Consider per-batch backoff (requires major refactor)
10. Migrate to async/await (requires iOS 15+ minimum)

---

## Summary

The analytics-swift SDK has a **solid, thread-safe architecture** with:
- ✅ Clean plugin system
- ✅ Pluggable storage backends
- ✅ Proper lifecycle handling
- ✅ Type-safe event system

But lacks **production-grade TAPI compliance**:
- ❌ No exponential backoff for batch uploads
- ❌ No Retry-After header parsing for batches
- ❌ No per-batch retry tracking
- ❌ No max retry attempts

**Key Finding:** Swift SDK's event-first architecture mirrors React Native, making **global backoff the natural implementation choice** with minimal changes (~50-100 LOC) by reusing the telemetry rate limit pattern.

Per-batch backoff would require significant refactoring (~300-400 LOC) to add batch metadata tracking, similar to React Native's challenge.
