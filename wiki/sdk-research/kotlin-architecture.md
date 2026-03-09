# Kotlin SDK Architecture Analysis

**Repository:** https://github.com/segmentio/analytics-kotlin
**Location:** ~/code/analytics-kotlin
**Date:** 2026-03-06
**Status:** Complete ✅

---

## Executive Summary

The Kotlin SDK uses **file-based batch persistence** with **stable file identifiers**. Unlike React Native, batches have persistent identities (file paths) and survive app restarts. The architecture uses Kotlin coroutines with sequential batch uploads and already has basic error classification.

**Key Findings:**
- ✅ **Stable batch identities** — each batch is a persistent file
- ✅ File-based storage (475KB max per batch)
- ✅ Sequential uploads (single-threaded network dispatcher)
- ✅ Basic error classification (4xx delete, 429/5xx retry)
- ✅ Crash-safe batch persistence
- ❌ **No TAPI backoff implementation** in EventPipeline yet
- ✅ Telemetry system has basic 429 rate limiting
- ✅ **Per-batch backoff is FEASIBLE** with minimal changes

**Critical Difference from React Native:**
- RN: Events persisted, batches ephemeral (recreated per flush)
- Kotlin: **Batches persisted as files** — stable across restarts

---

## 1. Event Lifecycle

### 1.1 Event Creation & Pipeline

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/Analytics.kt:509-520`

```kotlin
fun process(event: BaseEvent) {
    analyticsScope.launch(analyticsDispatcher) {
        timeline.process(event)
    }
}
```

**Flow:**
1. Event created (track, identify, screen, etc.)
2. Dispatched to `analyticsDispatcher` (cached thread pool)
3. Timeline processes through plugins (before → enrichment → destination → after)
4. SegmentDestination plugin queues to EventPipeline

### 1.2 Event Queueing

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/platform/EventPipeline.kt:58-79`

```kotlin
class EventPipeline(
    val writeChannel: Channel<BaseEvent> = Channel(UNLIMITED),
    val uploadChannel: Channel<String> = Channel(UNLIMITED)
) {
    suspend fun put(event: BaseEvent) {
        writeChannel.send(event)
    }
}
```

**Queue Characteristics:**
- **Type:** Kotlin Channel with UNLIMITED capacity
- **Persistence:** Events written to disk immediately
- **Durability:** Files survive app restart/crash
- **Format:** JSON array wrapped in batch object

### 1.3 Event Writing to Disk

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/platform/EventPipeline.kt:101-123`

```kotlin
private suspend fun write() {
    for (event in writeChannel) {
        // Stringify event
        val eventString = stringifyBaseEvent(event)

        // Write to current batch file
        storage.write(Storage.Constants.Events, eventString)

        // Check if should flush
        if (shouldFlush.value) {
            // Close current batch, start new one
            storage.rollover()
            // Queue batch file for upload
            uploadChannel.send(storage.readAsStream(Storage.Constants.Events))
        }
    }
}
```

**Write Pattern:**
1. Consume from writeChannel (blocking until event available)
2. Serialize event to JSON string
3. Append to current batch file
4. Check flush policies
5. If should flush: close file, queue for upload

---

## 2. Flush Triggers

### 2.1 Count-Based Flush Policy

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/platform/policies/CountBasedFlushPolicy.kt`

- **Default:** 20 events
- **Behavior:** Counter increments per event
- **Trigger:** Sets `shouldFlush = true` when count >= threshold

### 2.2 Frequency-Based Flush Policy

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/platform/policies/FrequencyFlushPolicy.kt:9-34`

```kotlin
override fun schedule() {
    timer = fixedRateTimer(
        name = "FrequencyFlushPolicy",
        period = flushIntervalInMillis
    ) {
        reset()
        shouldFlush.value = true
    }
}
```

- **Default:** 30 seconds (30000ms)
- **Behavior:** Timer fires on interval
- **Trigger:** Sets `shouldFlush = true`

### 2.3 Manual Flush

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/Analytics.kt:625-630`

```kotlin
fun flush() {
    analyticsScope.launch(analyticsDispatcher) {
        timeline.flush()
    }
}
```

- Called via `analytics.flush()`
- Triggers immediate batch closure and upload

### 2.4 Flush Policy Composition

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/platform/plugins/SegmentDestination.kt:60-87`

```kotlin
configuration.flushPolicies.forEach { policy ->
    policy.schedule()
    policy.shouldFlush.addObserver {
        if (it) {
            pipeline.flush()
            policy.reset()
        }
    }
}
```

**Multiple policies can be active:**
- All policies observe same `shouldFlush` observable
- ANY policy can trigger flush
- Policies are composable and configurable

---

## 3. Batch Creation & Storage

### 3.1 File-Based Batching

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/utilities/StorageImpl.kt:44-45, 188-191`

**Batch File Naming:**
```kotlin
private val fileIndexKey = "segment.events.file.index.$writeKey"

private fun createBatchFile(): File {
    val index = storage.getInt(fileIndexKey, 0)
    storage.putInt(fileIndexKey, index + 1)
    return File(eventsDirectory, "$writeKey-$index.tmp")
}
```

**Pattern:**
- Files named: `{writeKey}-{index}.tmp` (during writing)
- Renamed to: `{writeKey}-{index}` (when finalized)
- Index stored in SharedPreferences/Properties
- Index increments on each rollover

### 3.2 Batch Size Limits

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/Storage.kt:98-99`

```kotlin
object Constants {
    const val Events: String = "events-v2"
    const val MaxPayloadSize = 475000  // 475 KB
}
```

**Limits:**
- **Max batch size:** 475 KB
- **No event count limit** (only size)
- **No queue size limit** (disk space is limit)

### 3.3 Batch File Structure

**Format:**
```json
{
  "batch": [
    {"messageId": "uuid1", "type": "track", ...},
    {"messageId": "uuid2", "type": "identify", ...}
  ],
  "sentAt": "2026-03-06T12:00:00.000Z",
  "writeKey": "abc123"
}
```

**Characteristics:**
- **No batch UUID** (currently)
- Individual events have `messageId` (event UUID)
- Batch has `sentAt` timestamp
- Entire batch is one JSON object

### 3.4 Rollover (Batch Finalization)

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/utilities/StorageImpl.kt`

```kotlin
override fun rollover() {
    withLock {
        // Close current batch file
        currentWriter?.close()

        // Rename .tmp to final name
        val tmpFile = File(eventsDirectory, "$writeKey-$index.tmp")
        val finalFile = File(eventsDirectory, "$writeKey-$index")
        tmpFile.renameTo(finalFile)

        // Start new batch
        createNewWriter()
    }
}
```

**Rollover triggers:**
1. Flush policy activated
2. Batch size exceeds 475KB
3. Manual `flush()` call

---

## 4. Batch Identity Analysis

### 4.1 Current Batch Identification

**Identity Mechanism:** ✅ **File path + index**

**Stable Identifier:**
- File path: `/storage/dir/{writeKey}-{index}`
- Index: Integer counter, increments on rollover
- Persisted in SharedPreferences/Properties

**Example:**
```
/data/data/com.app/files/analytics-kotlin/writeKeyABC123/events/writeKeyABC123-0
/data/data/com.app/files/analytics-kotlin/writeKeyABC123/events/writeKeyABC123-1
/data/data/com.app/files/analytics-kotlin/writeKeyABC123/events/writeKeyABC123-2
```

### 4.2 Batch Identity Stability

**Question:** Do batches maintain identity across retries?

**Answer:** ✅ **YES**

**Evidence:**
1. Batch file persists on disk until successfully uploaded
2. File path remains constant across app restarts
3. Upload failure leaves file intact
4. Next flush attempt uploads same file (same path, same content)

**Test Coverage:**
**File:** `core/src/test/kotlin/com/segment/analytics/kotlin/core/platform/plugins/SegmentDestinationTests.kt:227-266`

```kotlin
@Test
fun `flush reads events but does not delete on fail code_429`() {
    // Verify batch file persists after 429 error
    val files = tempDir.listFiles()
    assertNotNull(files)
    assertTrue(files.isNotEmpty())
}
```

### 4.3 Batch Composition on Retry

**Scenario:** Upload fails with 503

**What happens:**
1. Upload attempt fails
2. Exception caught in `handleUploadException()`
3. File NOT deleted (shouldCleanup = false)
4. File remains on disk with same content
5. Next flush: same file uploaded again

**Stability:** ✅ **100% stable**
- Same file path
- Same event composition
- Same JSON content
- No re-chunking or reformation

---

## 5. Storage Architecture

### 5.1 Storage Interface

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/Storage.kt:18-109`

```kotlin
interface Storage {
    suspend fun write(key: String, value: String)
    fun read(key: String): String?
    fun rollover()
    fun removeFile(filePath: String)
    fun readAsStream(source: String): String
}
```

### 5.2 Platform-Specific Implementations

**Android:**
**File:** `android/src/main/java/com/segment/analytics/kotlin/android/Storage.kt:81-88`

```kotlin
class AndroidStorage(context: Context, writeKey: String) : StorageImpl(
    rootDirectory = context.filesDir,
    writeKey = writeKey,
    storage = SharedPreferencesStorage(context, writeKey)
)
```

- **Events:** File system (`context.filesDir`)
- **Metadata:** SharedPreferences
- **Location:** `/data/data/{package}/files/analytics-kotlin/{writeKey}/events/`

**JVM:**
**File:** `core/src/main/java/com/segment/analytics/kotlin/core/utilities/StorageImpl.kt:216-224`

```kotlin
class PropertiesStorage(
    private val file: File,
    private val properties: Properties
) : Storage.StorageImpl {
    // Uses java.util.Properties for key-value storage
}
```

- **Events:** File system
- **Metadata:** Properties file
- **Location:** Configurable root directory

### 5.3 What Gets Persisted

**Event Files:**
- ✅ Full event JSON (all fields)
- ✅ Batch wrapper (sentAt, writeKey)
- ✅ Multiple batch files can coexist

**Metadata (SharedPreferences/Properties):**
- ✅ `userId` (user identifier)
- ✅ `traits` (user attributes)
- ✅ `settings` (from CDN)
- ✅ `anonymousId` (device identifier)
- ✅ `deviceId` (device token)
- ✅ File index counter
- ❌ Batch upload status (no tracking)
- ❌ Retry metadata (no tracking)

### 5.4 Crash Recovery

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/utilities/StorageImpl.kt:46-62`

**Mechanism:**
1. All batch files written to disk immediately
2. File writes are atomic (rename .tmp to final)
3. On app restart, all finalized files remain
4. Upload loop reads existing files and attempts upload

**Durability:**
- ✅ Completed batches survive crash
- ✅ In-progress writes may be lost (partial .tmp file)
- ✅ File index counter persisted (new batches get new indices)
- ❌ Upload state NOT persisted (which files were uploading)

---

## 6. Concurrency Model

### 6.1 Coroutine Architecture

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/Analytics.kt:86-104`

```kotlin
private val analyticsDispatcher = Executors
    .newCachedThreadPool()
    .asCoroutineDispatcher()

private val networkIODispatcher = Executors
    .newSingleThreadExecutor()
    .asCoroutineDispatcher()

private val fileIODispatcher = Executors
    .newFixedThreadPool(2)
    .asCoroutineDispatcher()

private val analyticsScope = CoroutineScope(
    SupervisorJob() + analyticsDispatcher + exceptionHandler
)
```

**Dispatcher Roles:**
- **analyticsDispatcher:** Event processing pipeline (multi-threaded, cached pool)
- **networkIODispatcher:** HTTP uploads (**SINGLE THREAD** — sequential uploads)
- **fileIODispatcher:** File I/O (2 threads — read + write)

### 6.2 Upload Concurrency

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/platform/EventPipeline.kt:125-160`

```kotlin
private suspend fun upload() = withContext(networkIODispatcher) {
    for (batchFile in uploadChannel) {
        try {
            // Upload batch file
            val response = httpClient.upload(url, batchFile)

            if (response.isSuccessful) {
                storage.removeFile(batchFile)
            } else {
                handleUploadException(response.error, batchFile)
            }
        } catch (e: Exception) {
            handleUploadException(e, batchFile)
        }
    }
}
```

**Upload Pattern:**
- ✅ **Sequential uploads** (one at a time)
- ✅ Batches processed in FIFO order (Channel)
- ❌ **NO parallel uploads** (single-threaded dispatcher)
- ✅ One batch completes before next starts

**Why sequential?**
- Avoids overwhelming server
- Simpler error handling
- Easier to reason about upload state

### 6.3 Thread Safety

**File I/O Protection:**
**File:** `core/src/main/java/com/segment/analytics/kotlin/core/utilities/StorageImpl.kt:35`

```kotlin
private val lock = Semaphore(1)

private inline fun <T> withLock(block: () -> T): T {
    lock.acquire()
    try {
        return block()
    } finally {
        lock.release()
    }
}
```

**All file operations protected by semaphore:**
- Write operations
- Rollover (file finalization)
- File deletion

### 6.4 Error Isolation

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/Analytics.kt:90-97`

```kotlin
private val exceptionHandler = CoroutineExceptionHandler { _, exception ->
    configuration.errorHandler?.also {
        it.onExceptionThrown(exception)
    } ?: run {
        // Default: log error
        log("Analytics Error: $exception")
    }
}
```

**Isolation Strategy:**
- **SupervisorJob:** One coroutine failure doesn't cancel others
- **CoroutineExceptionHandler:** Catches uncaught exceptions
- **Per-batch try/catch:** Upload failures isolated per batch

---

## 7. Error Handling & Retry Logic

### 7.1 Current Error Classification

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/platform/EventPipeline.kt:172-201`

```kotlin
private fun handleUploadException(e: Exception, file: String): Boolean {
    var shouldCleanup = false

    if (e is HTTPException) {
        if (e.is4xx() && e.responseCode != 429) {
            // 4xx errors (except 429) → DELETE batch
            shouldCleanup = true
            log("Batch $file rejected by server (${e.responseCode}), deleting")
        } else {
            // 429, 5xx, network errors → KEEP batch for retry
            shouldCleanup = false
            log("Batch $file upload failed (${e.responseCode}), will retry")
        }
    } else {
        // Non-HTTP errors → KEEP batch
        shouldCleanup = false
    }

    if (shouldCleanup) {
        storage.removeFile(file)
    }

    return shouldCleanup
}
```

**Error Classification:**
- ✅ **400-499 (except 429):** Permanent failure, delete batch
- ✅ **429:** Rate limited, keep batch
- ✅ **500+:** Transient failure, keep batch
- ✅ **Network errors:** Keep batch

### 7.2 Retry Strategy

**Current Implementation:** ❌ **NO BACKOFF LOGIC**

**How retry works:**
1. Upload fails → batch file kept on disk
2. Next flush trigger (timer or count) → upload attempted again
3. Same batch file uploaded (no delay, no backoff)

**Retry Frequency:**
- **Minimum:** 30 seconds (frequency flush policy)
- **No maximum:** Will retry indefinitely
- **No exponential backoff:** Fixed 30s interval

### 7.3 Telemetry System Has Rate Limiting

**File:** `core/src/main/java/com/segment/analytics/kotlin/core/Telemetry.kt:97, 234-237, 277-283`

```kotlin
private var rateLimitEndTime: Long = 0

override fun flush() {
    if (rateLimitEndTime > (System.currentTimeMillis() / 1000).toInt()) {
        log("Telemetry: Rate limited, skipping flush")
        return
    }
    // ... proceed with flush
}

private fun send() {
    try {
        val response = httpClient.upload(telemetryUrl, metricsData)
        // ... handle response
    } catch (e: HTTPException) {
        if (e.responseCode == 429) {
            val retryAfter = e.headers["Retry-After"]?.firstOrNull()?.toLongOrNull()
            if (retryAfter != null) {
                rateLimitEndTime = retryAfter + (System.currentTimeMillis() / 1000)
                log("Telemetry: Rate limited until $rateLimitEndTime")
            }
        }
    }
}
```

**Telemetry Features:**
- ✅ Parses `Retry-After` header
- ✅ Blocks flushes until rate limit expires
- ✅ Basic 429 handling
- ❌ NOT applied to main EventPipeline (only telemetry)

### 7.4 TAPI Implementation Status

**EventPipeline:** ❌ **NO TAPI BACKOFF**

**What's missing:**
- ❌ Exponential backoff for transient errors (5xx)
- ❌ Jitter to prevent thundering herd
- ❌ Max retry count enforcement
- ❌ Per-batch backoff metadata
- ❌ Retry-After header parsing for 429
- ❌ Max backoff duration

**What exists:**
- ✅ Error classification (4xx vs 429 vs 5xx)
- ✅ Batch file persistence on failure
- ✅ Basic retry (next flush cycle)

---

## 8. Per-Batch Backoff Feasibility

### 8.1 Current Architecture Support

**Batch Identity:** ✅ **File path is stable identifier**

**What enables per-batch backoff:**
1. Each batch has persistent file path
2. Files survive across app restarts
3. Failed batches keep same file path on retry
4. Upload loop can check batch state before upload

### 8.2 Implementation Options

**Option A: Add Batch UUID to JSON (Minimal Change)**

```kotlin
// Current format:
{
  "batch": [...],
  "sentAt": "...",
  "writeKey": "..."
}

// Enhanced format:
{
  "batchId": "uuid-generated-on-creation",
  "batch": [...],
  "sentAt": "...",
  "writeKey": "..."
}
```

**Changes needed:**
1. Generate UUID when creating batch file
2. Add `batchId` field to JSON
3. Create metadata map: `batchId → BackoffMetadata`
4. Check metadata before upload

**Effort:** ~50-100 LOC

---

**Option B: Use File Path as Batch ID (Zero Change)**

```kotlin
// File path already unique and stable:
val batchId = file.absolutePath

// Create metadata registry:
val batchMetadata = mutableMapOf<String, BackoffMetadata>()

data class BackoffMetadata(
    val attemptCount: Int,
    val nextRetryTime: Long,
    val firstFailureTime: Long
)
```

**Changes needed:**
1. Create in-memory metadata map (or persist to SharedPreferences)
2. Track per-batch state keyed by file path
3. Check metadata before upload
4. Update metadata on failure

**Effort:** ~30-50 LOC

---

**Option C: SQLite Batch Registry (Most Robust)**

```sql
CREATE TABLE batch_metadata (
    batch_id TEXT PRIMARY KEY,
    file_path TEXT,
    attempt_count INTEGER,
    next_retry_time INTEGER,
    first_failure_time INTEGER,
    last_error TEXT
);
```

**Changes needed:**
1. Add Room database dependency
2. Create batch metadata entity and DAO
3. Track per-batch state in database
4. Query before upload, update on failure

**Effort:** ~150-200 LOC

---

### 8.3 Recommended Approach

**Option B (File Path as ID) is best for TAPI:**

**Pros:**
- ✅ Zero breaking changes
- ✅ File path already stable and unique
- ✅ Simple implementation
- ✅ No external dependencies
- ✅ Aligns with existing architecture

**Implementation Sketch:**

```kotlin
class EventPipeline(
    // ... existing fields
    private val batchBackoff: MutableMap<String, BackoffMetadata> = mutableMapOf()
) {
    private suspend fun upload() = withContext(networkIODispatcher) {
        for (batchFile in uploadChannel) {
            // Check if batch is in backoff
            val metadata = batchBackoff[batchFile]
            if (metadata != null && System.currentTimeMillis() < metadata.nextRetryTime) {
                log("Batch $batchFile is in backoff, skipping")
                // Re-queue for later
                uploadChannel.send(batchFile)
                continue
            }

            try {
                val response = httpClient.upload(url, batchFile)

                if (response.isSuccessful) {
                    storage.removeFile(batchFile)
                    batchBackoff.remove(batchFile)
                } else {
                    updateBackoffMetadata(batchFile, response.error)
                }
            } catch (e: Exception) {
                updateBackoffMetadata(batchFile, e)
            }
        }
    }

    private fun updateBackoffMetadata(batchFile: String, error: Exception) {
        val current = batchBackoff[batchFile]
        val attemptCount = (current?.attemptCount ?: 0) + 1
        val backoffDelay = calculateExponentialBackoff(attemptCount)

        batchBackoff[batchFile] = BackoffMetadata(
            attemptCount = attemptCount,
            nextRetryTime = System.currentTimeMillis() + backoffDelay,
            firstFailureTime = current?.firstFailureTime ?: System.currentTimeMillis()
        )
    }
}
```

---

## 9. Architecture Comparison: Kotlin vs React Native

| Aspect | Kotlin SDK | React Native SDK |
|--------|-----------|------------------|
| **Batch Identity** | ✅ File path (stable) | ❌ None (ephemeral) |
| **Batch Persistence** | ✅ Files on disk | ❌ Events only |
| **Batch Stability** | ✅ 100% stable across retries | ⚠️ Recreated per flush |
| **Upload Concurrency** | Sequential (single thread) | Parallel (Promise.all) |
| **Error Classification** | ✅ Yes (4xx/429/5xx) | ⚠️ Basic (PR in progress) |
| **Retry Logic** | ❌ Fixed 30s interval | ❌ Fixed 30s interval |
| **TAPI Backoff** | ❌ Not implemented | ❌ Not implemented |
| **Per-Batch Backoff Feasible** | ✅ YES (minimal work) | ❌ NO (significant refactor) |
| **Storage** | File system + SharedPrefs | Sovran + AsyncStorage |
| **Concurrency Model** | Coroutines (multi-dispatcher) | Async/await (single thread) |
| **Platform Capabilities** | Android WorkManager, background | iOS/Android background limits |

---

## 10. Critical Findings for TAPI Decision

### 10.1 Kotlin Architecture ENABLES Per-Batch Backoff

**Why it works:**
1. ✅ Batches have stable file identifiers
2. ✅ Failed batches persist with same identity
3. ✅ Sequential uploads allow state checking
4. ✅ Simple to add metadata tracking (file path → metadata map)

**Implementation effort:** ~50-100 LOC

### 10.2 Design Patterns Worth Adopting

**From Kotlin:**
- File-based batch persistence (crash-safe)
- Sequential uploads (simpler, safer)
- Semaphore-protected file I/O
- Multi-dispatcher concurrency (separate concerns)

**To React Native:**
- Could add batch file persistence (significant refactor)
- Could switch to sequential uploads (easy change)
- Could add batch identity via file or hash

### 10.3 Key Architectural Difference

**Kotlin:** "Batch-first" architecture
- Batch is the unit of persistence
- Stable batch identity emerges from file system
- Per-batch tracking natural fit

**React Native:** "Event-first" architecture
- Event is the unit of persistence
- Batches created on-demand per flush
- Per-batch tracking requires new abstraction

---

## 11. Recommendations

### 11.1 For Kotlin TAPI Implementation

1. **Use Option B** (file path as batch ID)
2. Add in-memory metadata map: `filePath → BackoffMetadata`
3. Implement exponential backoff in `upload()` loop
4. Parse `Retry-After` header for 429
5. Enforce max retry count and max backoff duration

**Estimated effort:** ~50-100 LOC
**Breaking changes:** None

### 11.2 For Cross-SDK Consistency

**Should Kotlin match React Native's global approach?**
- ❌ **NO** — Kotlin architecture naturally supports per-batch
- Using per-batch is more resilient and aligns with SDD

**Should React Native match Kotlin's per-batch approach?**
- ⚠️ **MAYBE** — Would require significant refactor
- Need to evaluate cost vs benefit (see Phase 3 analysis)

---

## 12. Code Reference Summary

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Analytics client | Analytics.kt | 86-104, 509-520 | Main entry, coroutine setup |
| EventPipeline | EventPipeline.kt | 28-79, 101-160 | Queue, write, upload |
| Error handling | EventPipeline.kt | 172-201 | Error classification |
| Storage interface | Storage.kt | 18-109 | Abstract storage ops |
| Storage impl | StorageImpl.kt | 35-224 | File-based storage |
| Android storage | android/Storage.kt | 81-88 | SharedPreferences |
| Telemetry backoff | Telemetry.kt | 97, 234-283 | Rate limit handling |
| Count flush policy | CountBasedFlushPolicy.kt | - | Event count trigger |
| Frequency policy | FrequencyFlushPolicy.kt | 9-34 | Timer trigger |
| SegmentDestination | SegmentDestination.kt | 60-87 | Pipeline setup |
| Tests | SegmentDestinationTests.kt | 227-266 | 429 behavior test |

---

## 13. Summary

The Kotlin SDK's architecture is **well-suited for per-batch TAPI backoff** implementation. Its file-based batch persistence provides stable batch identities without additional abstractions. The sequential upload pattern and existing error classification make adding per-batch backoff straightforward.

**For TAPI Implementation:**
- Kotlin should implement per-batch backoff (aligns with architecture)
- React Native needs architectural decision (global vs refactor for per-batch)
- Cross-SDK consistency is LESS important than platform optimization

**Next Steps:**
- Continue research: Swift SDK, JavaScript SDK
- Compare all four architectures
- Make informed recommendation for React Native
