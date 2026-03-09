# Cross-SDK Error Handling & Retry Logic Comparison

**Analysis Date:** 2026-03-06
**Purpose:** Compare error handling, retry strategies, and TAPI compliance across all Segment SDKs - **CRITICAL FOR TAPI IMPLEMENTATION**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Error Classification](#2-error-classification)
3. [HTTP Status Code Handling](#3-http-status-code-handling)
4. [Retry Strategies](#4-retry-strategies)
5. [Exponential Backoff](#5-exponential-backoff)
6. [Rate Limiting (429 Handling)](#6-rate-limiting-429-handling)
7. [Retry-After Header Parsing](#7-retry-after-header-parsing)
8. [TAPI Compliance Status](#8-tapi-compliance-status)
9. [Key Differences Analysis](#9-key-differences-analysis)
10. [Recommendations](#10-recommendations)

---

## 1. Overview

### Error Handling Summary

| SDK | TAPI Compliant? | 429 Handling | 5xx Handling | Retry-After | Exponential Backoff | Per-Batch Backoff |
|-----|-----------------|--------------|--------------|-------------|---------------------|-------------------|
| **React Native** | ⚠️ **Partial** | ✅ Infrastructure exists | ✅ Infrastructure exists | ✅ parseRetryAfter() | ✅ BackoffManager | ❌ Not integrated |
| **Kotlin** | ❌ **No** | ⚠️ Telemetry only | ❌ No retry | ⚠️ Telemetry only | ❌ No | N/A |
| **Swift** | ❌ **No** | ⚠️ Telemetry only | ❌ No backoff | ⚠️ Telemetry only | ❌ No | N/A |
| **JS Browser** | ✅ **Yes** | ✅ Full | ✅ Full | ✅ x-ratelimit-reset | ✅ Yes (jitter) | ❌ Global (per-event) |
| **JS Node.js** | ✅ **Yes** | ✅ Full | ✅ Full | ✅ x-ratelimit-reset | ✅ Yes (jitter) | ✅ Atomic batch |

### Critical Finding

**JavaScript SDKs are TAPI-compliant, others are not:**

- ✅ **JS Browser:** TAPI-compliant with global backoff (event-first architecture)
- ✅ **JS Node.js:** TAPI-compliant with atomic batch retry (batch-first architecture)
- ⚠️ **React Native:** Has infrastructure but **NOT INTEGRATED** into upload flow
- ❌ **Kotlin:** No TAPI implementation (only telemetry has rate limiting)
- ❌ **Swift:** No TAPI implementation (only telemetry has rate limiting)

---

## 2. Error Classification

### Error Types Comparison

| Error Type | React Native | Kotlin | Swift | JS Browser | JS Node.js |
|------------|--------------|--------|-------|------------|------------|
| **Rate Limit (429)** | `rate_limit` | Telemetry only | Telemetry only | `RateLimitError` | Retry with header |
| **Transient (5xx)** | `transient` | No classification | No classification | Generic Error | Retry with backoff |
| **Permanent (4xx)** | `permanent` | Delete batch | Delete batch | ContextCancelation | Terminal (400 only) |
| **Network** | `transient` | Retry | Retry | Generic Error | Retry with backoff |

### React Native: Error Classification

**Classification Function:**
```typescript
// errors.ts:133-173
export function classifyError(
  statusCode: number,
  config: HttpConfiguration
): ErrorClassification {
  // Check overrides first
  const override = config.statusCodeOverrides?.[statusCode.toString()]
  if (override) {
    return {
      isRetryable: override === 'retry',
      errorType: override === 'retry' ? 'transient' : 'permanent'
    }
  }

  // 429 - Rate Limited
  if (statusCode === 429) {
    return {
      isRetryable: true,
      errorType: 'rate_limit'
    }
  }

  // 5xx - Server Errors
  if (statusCode >= 500 && statusCode <= 599) {
    const behavior = config.default5xxBehavior || 'retry'
    return {
      isRetryable: behavior === 'retry',
      errorType: behavior === 'retry' ? 'transient' : 'permanent'
    }
  }

  // 4xx - Client Errors
  if (statusCode >= 400 && statusCode <= 499) {
    const behavior = config.default4xxBehavior || 'drop'
    return {
      isRetryable: behavior === 'retry',
      errorType: behavior === 'retry' ? 'transient' : 'permanent'
    }
  }

  // 2xx - Success
  return {
    isRetryable: false,
    errorType: 'permanent'
  }
}
```

**Configuration:**
```typescript
// constants.ts:15-40
export const defaultHttpConfig: HttpConfiguration = {
  rateLimitConfig: {
    enabled: true,
    maxRetryCount: 100,
    maxRetryInterval: 300,        // 5 minutes
    maxRateLimitDuration: 43200   // 12 hours
  },
  backoffConfig: {
    enabled: true,
    maxRetryCount: 100,
    baseBackoffInterval: 0.5,     // 500ms
    maxBackoffInterval: 300,      // 5 minutes
    maxTotalBackoffDuration: 43200, // 12 hours
    jitterPercent: 10,
    default4xxBehavior: 'drop',
    default5xxBehavior: 'retry',
    statusCodeOverrides: {
      '408': 'retry',  // Request Timeout
      '410': 'retry',  // Gone (temporary)
      '429': 'retry',  // Rate Limited
      '460': 'retry',  // Captcha
      '501': 'drop',   // Not Implemented
      '505': 'drop'    // HTTP Version Not Supported
    }
  }
}
```

**File References:**
- `/Users/abueide/code/analytics-react-native/packages/core/src/errors.ts:133-173`
- `/Users/abueide/code/analytics-react-native/packages/core/src/constants.ts:15-40`

---

### Kotlin: Minimal Error Classification

**Current Handling:**
```kotlin
// EventPipeline.kt:172-201
private suspend fun handleUploadException(
    file: String,
    exception: Exception
) {
    when (exception) {
        is AnalyticsNetworkError -> {
            // Network errors - keep batch file, retry later
            logger.warn("Network error uploading $file: ${exception.message}")
            // File remains, will retry on next flush
        }
        else -> {
            // Other errors - delete batch (assume permanent)
            logger.error("Upload failed for $file: ${exception.message}")
            storage.remove(file)
        }
    }
}
```

**Telemetry Has Rate Limiting:**
```kotlin
// Telemetry.kt:97, 234-283
private var rateLimitEndTime: Long = 0

private fun checkRateLimit(): Boolean {
    return System.currentTimeMillis() < rateLimitEndTime
}

// Parse Retry-After header (telemetry only)
val retryAfter = response.headers["Retry-After"]?.toLongOrNull()
if (retryAfter != null) {
    rateLimitEndTime = System.currentTimeMillis() + (retryAfter * 1000)
}
```

**Key Gap:**
- ❌ **Batch uploads don't use rate limiting**
- ❌ **No exponential backoff**
- ❌ **No Retry-After parsing for batches**

**File References:**
- `/Users/abueide/code/analytics-kotlin/core/src/main/java/com/segment/analytics/kotlin/core/platform/EventPipeline.kt:172-201`
- `/Users/abueide/code/analytics-kotlin/core/src/main/java/com/segment/analytics/kotlin/core/Telemetry.kt:97, 234-283`

---

### Swift: Minimal Error Classification

**Current Handling:**
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
            return .statusCode(code: httpStatusCode)  // ERROR (429, 5xx, etc.)
        }
    }

    return .badSession
}

// SegmentDestination.swift:180-192
case .failure(let error):
    reportInternalError(...)
    // Batch remains queued
    // NO BACKOFF, NO RETRY DELAY
```

**Telemetry Has Rate Limiting:**
```swift
// Telemetry.swift:90, 177-180, 213-216
@Atomic private var rateLimitEndTime: TimeInterval = 0

private func isRateLimited() -> Bool {
    let currentTime = Date().timeIntervalSince1970
    return currentTime < rateLimitEndTime
}

// Parse Retry-After header (telemetry only)
if let retryAfterHeader = httpResponse.value(forHTTPHeaderField: "Retry-After"),
   let retryAfterSeconds = TimeInterval(retryAfterHeader) {
    rateLimitEndTime = currentTime + retryAfterSeconds
}
```

**Key Gap:**
- ❌ **Batch uploads don't use rate limiting**
- ❌ **No exponential backoff**
- ❌ **Immediate retry on failure**

**File References:**
- `/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Networking/HTTPClient.swift:98-119`
- `/Users/abueide/code/analytics-swift/Sources/Segment/Plugins/SegmentDestination.swift:180-192`
- `/Users/abueide/code/analytics-swift/Sources/Segment/Utilities/Telemetry.swift:90, 177-180, 213-216`

---

### JavaScript Browser: Full Error Classification

**RateLimitError:**
```typescript
// ratelimit-error.ts:1-9
export class RateLimitError extends Error {
    retryTimeout: number

    constructor(message: string, retryTimeout: number) {
        super(message)
        this.retryTimeout = retryTimeout
        this.name = 'RateLimitError'
    }
}
```

**Response Handling:**
```typescript
// fetch-dispatcher.ts:18-31
if (res.status === 429) {
    const retryTimeoutStringSecs = res.headers?.get('x-ratelimit-reset')
    const retryTimeoutMS = retryTimeoutStringSecs
        ? parseInt(retryTimeoutStringSecs) * 1000
        : 5000  // Fallback: 5 seconds

    throw new RateLimitError(
        `Rate limit exceeded: ${res.status}`,
        retryTimeoutMS
    )
}

if (res.status >= 500) {
    throw new Error(`Bad response from server: ${res.status}`)
}
```

**ContextCancelation:**
```typescript
// context/index.ts:25-35
export class ContextCancelation {
    retry: boolean  // Control retry behavior
    type: string
    reason?: string

    constructor(options: CancelationOptions) {
        this.retry = options.retry ?? true
        this.type = options.type ?? 'plugin Error'
        this.reason = options.reason ?? ''
    }
}
```

**File References:**
- `/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/ratelimit-error.ts:1-9`
- `/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/fetch-dispatcher.ts:18-31`
- `/Users/abueide/code/analytics-next/packages/core/src/context/index.ts:25-35`

---

### JavaScript Node.js: Detailed Error Classification

**Response Handling:**
```typescript
// publisher.ts:259-302
// SUCCESS: 200-299
if (response.status >= 200 && response.status < 300) {
    batch.resolveEvents()
    return
}

// AUTH FAILURE (with OAuth): retry with new token
else if (
    this._tokenManager &&
    (response.status === 400 ||
     response.status === 401 ||
     response.status === 403)
) {
    this._tokenManager.clearToken()
    failureReason = new Error(`[${response.status}] ${response.statusText}`)
}

// REQUEST TOO LARGE: 400 (no OAuth) - terminal
else if (response.status === 400) {
    resolveFailedBatch(
        batch,
        new Error(`[${response.status}] ${response.statusText}`)
    )
    return  // Don't retry
}

// RATE LIMITED: 429 - parse retry-after
else if (response.status === 429) {
    if (response.headers && 'x-ratelimit-reset' in response.headers) {
        const rateLimitResetTimestamp = parseInt(
            response.headers['x-ratelimit-reset'],
            10
        )
        if (isFinite(rateLimitResetTimestamp)) {
            // Convert Unix timestamp (seconds) to delay from now (ms)
            requestedRetryTimeout = rateLimitResetTimestamp - Date.now()
        }
    }
    failureReason = new Error(`[${response.status}] ${response.statusText}`)
}

// OTHER FAILURES: 5xx, network errors
else {
    failureReason = new Error(`[${response.status}] ${response.statusText}`)
}
```

**File References:**
- `/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts:259-302`

---

## 3. HTTP Status Code Handling

### Status Code Behavior Comparison

| Status Code | React Native | Kotlin | Swift | JS Browser | JS Node.js |
|-------------|--------------|--------|-------|------------|------------|
| **2xx** | Success | Delete batch | Delete batch | Remove from queue | Resolve batch |
| **400** | Drop (configurable) | Delete batch | Delete batch | Terminal | Terminal (unless OAuth) |
| **401/403** | Drop (configurable) | Delete batch | Delete batch | Terminal | Retry with token (OAuth) |
| **408** | Retry (override) | Delete batch | Delete batch | Terminal | Not specified |
| **410** | Retry (override) | Delete batch | Delete batch | Terminal | Not specified |
| **429** | Retry (not integrated) | Keep (telemetry only) | Keep (telemetry only) | Retry with header | Retry with header |
| **460** | Retry (override) | Delete batch | Delete batch | Terminal | Not specified |
| **5xx** | Retry (configurable) | Keep batch | Keep batch | Retry with backoff | Retry with backoff |
| **Network** | Retry | Keep batch | Keep batch | Retry with backoff | Retry with backoff |

### Configurable Status Code Overrides

**React Native Only:**
```typescript
// User can override default behavior
statusCodeOverrides: {
    '408': 'retry',  // Request Timeout - retry instead of drop
    '410': 'retry',  // Gone - retry (might come back)
    '429': 'retry',  // Rate Limited
    '460': 'retry',  // Captcha
    '501': 'drop',   // Not Implemented - don't retry
    '505': 'drop'    // HTTP Version Not Supported - don't retry
}
```

**Why Useful:**
- TAPI behavior can evolve
- Different endpoints might have different semantics
- User can adapt without SDK update

**Other SDKs:**
- ❌ No configuration - hardcoded behavior

---

## 4. Retry Strategies

### Retry Mechanisms Comparison

| SDK | Retry Strategy | Max Attempts | Retry Delay | Backoff Formula |
|-----|---------------|--------------|-------------|-----------------|
| **React Native** | Infrastructure exists | 100 (configurable) | Not integrated | `0.5s * 2^n` (with jitter) |
| **Kotlin** | Simple retry | Unbounded | Immediate | None |
| **Swift** | Simple retry | Unbounded | Immediate | None |
| **JS Browser** | Exponential backoff | 10 (configurable) | Calculated | `500ms * 2^n` (with jitter) |
| **JS Node.js** | Exponential backoff | 3 (configurable) | Calculated | `25ms * 2^n` (capped at 1s) |

### React Native: BackoffManager (Not Integrated)

**BackoffManager Implementation:**
```typescript
// BackoffManager.ts:1-149
export class BackoffManager {
    private config: BackoffConfiguration
    private state: BackoffStateData

    async canRetry(errorType: ErrorClassification['errorType']): Promise<boolean> {
        if (!this.config.enabled) return true
        if (errorType !== 'transient') return true

        const now = Date.now()
        if (now < this.state.backoffEndTime) {
            return false  // Still backing off
        }

        return true
    }

    async handleTransientError(): Promise<void> {
        const backoffSeconds = this.calculateBackoff(this.state.retryCount)
        this.state.backoffEndTime = Date.now() + (backoffSeconds * 1000)
        this.state.retryCount++
        await this.saveState()
    }

    private calculateBackoff(retryCount: number): number {
        const baseBackoff = this.config.baseBackoffInterval * Math.pow(2, retryCount)
        const cappedBackoff = Math.min(baseBackoff, this.config.maxBackoffInterval)

        // Add jitter
        const jitter = cappedBackoff * (this.config.jitterPercent / 100) * Math.random()
        return cappedBackoff + jitter
    }
}
```

**Backoff Progression:**
```
Retry 1: 0.5s * 2^0 = 0.5s + jitter (10%) = 0.5s - 0.55s
Retry 2: 0.5s * 2^1 = 1.0s + jitter        = 1.0s - 1.1s
Retry 3: 0.5s * 2^2 = 2.0s + jitter        = 2.0s - 2.2s
Retry 4: 0.5s * 2^3 = 4.0s + jitter        = 4.0s - 4.4s
...
Retry 10: 0.5s * 2^9 = 256s (capped at 300s) = 300s + jitter
```

**Critical Gap:**
```typescript
// SegmentDestination.ts - NOT CALLING BackoffManager
async sendEvents(): Promise<void> {
    const batches = chunk(events, ...)

    await Promise.all(
        batches.map(async (batch) => {
            try {
                await uploadEvents(batch)
                // ❌ No call to BackoffManager.handleTransientError()
            } catch (error) {
                // ❌ No call to BackoffManager.canRetry()
                // ❌ No error classification
                // Events remain in queue, retry immediately on next flush
            }
        })
    )
}
```

**File References:**
- `/Users/abueide/code/analytics-react-native/packages/core/src/backoff/BackoffManager.ts:1-149`
- `/Users/abueide/code/analytics-react-native/packages/core/src/plugins/SegmentDestination.ts:37-87`

---

### Kotlin: Immediate Retry (No Backoff)

**Current Implementation:**
```kotlin
// EventPipeline.kt
suspend fun uploadFiles() {
    val files = storage.listFiles()

    for (file in files) {
        try {
            val batch = storage.readBatch(file)
            httpClient.post(batch)
            storage.delete(file)  // Success
        } catch (e: Exception) {
            handleUploadException(file, e)
            // File remains, retry on next flush (no delay)
        }
    }
}

// Flush triggered by:
// 1. Count-based (20 events)
// 2. Time-based (30 seconds)
// 3. Manual flush
```

**Retry Behavior:**
```
Failed upload:
  → Batch file remains on disk
  → Next flush attempt (30s later or next event)
  → Immediate retry (no backoff delay)
  → If fails again, repeats forever
```

**Issues:**
- ❌ No exponential backoff
- ❌ No rate limit detection
- ❌ Can retry 429 immediately (makes problem worse)
- ❌ Unbounded retries

---

### Swift: Immediate Retry (No Backoff)

**Current Implementation:**
```swift
// SegmentDestination.swift
public func flush() {
    let urls = storage?.read(Storage.Constants.events, count: maxBatchSize)

    urls?.forEach { url in
        let uploadTask = httpClient.startBatchUpload(url: url) { result in
            switch result {
            case .success:
                storage?.remove(data: [url])  // Delete batch
            case .failure(let error):
                reportInternalError(...)
                // Batch remains, retry on next flush (no delay)
            }
        }
    }
}
```

**Similar issues as Kotlin:**
- ❌ No exponential backoff
- ❌ No rate limit detection
- ❌ Immediate retry on failure

---

### JavaScript Browser: Exponential Backoff (Implemented)

**Backoff Function:**
```typescript
// backoff.ts:15-24
export function backoff(params: BackoffParams): number {
    const random = Math.random() + 1  // 1.0 to 2.0 (jitter)
    const {
        minTimeout = 500,
        factor = 2,
        attempt,
        maxTimeout = Infinity,
    } = params
    return Math.min(random * minTimeout * Math.pow(factor, attempt), maxTimeout)
}

// Usage:
// Attempt 0: random(1-2) * 500 * 2^0 = 500ms - 1000ms
// Attempt 1: random(1-2) * 500 * 2^1 = 1000ms - 2000ms
// Attempt 2: random(1-2) * 500 * 2^2 = 2000ms - 4000ms
```

**PriorityQueue Integration:**
```typescript
// priority-queue/index.ts:49-76
pushWithBackoff(item: Item, minTimeout = 0): boolean {
    // One immediate retry
    if (minTimeout == 0 && this.getAttempts(item) === 0) {
        return this.push(item)[0]
    }

    const attempt = this.updateAttempts(item)

    if (attempt > this.maxAttempts || this.includes(item)) {
        return false  // Exhausted retries
    }

    let timeout = backoff({ attempt: attempt - 1 })
    if (minTimeout > 0 && timeout < minTimeout) {
        timeout = minTimeout  // Use rate limit timeout if greater
    }

    setTimeout(() => {
        this.queue.push(item)
        this.future = this.future.filter((f) => f.id !== item.id)
        this.emit(ON_REMOVE_FROM_FUTURE)
    }, timeout)

    this.future.push(item)
    return true
}
```

**File References:**
- `/Users/abueide/code/analytics-next/packages/core/src/priority-queue/backoff.ts:15-24`
- `/Users/abueide/code/analytics-next/packages/core/src/priority-queue/index.ts:49-76`

---

### JavaScript Node.js: Exponential Backoff (Implemented)

**Retry Loop:**
```typescript
// publisher.ts:207-325
async send(batch: ContextBatch) {
    const maxAttempts = this._maxRetries + 1
    let currentAttempt = 0

    while (currentAttempt < maxAttempts) {
        currentAttempt++

        let requestedRetryTimeout: number | undefined
        let failureReason: unknown

        try {
            const response = await this._httpClient.makeRequest(...)

            if (response.status >= 200 && response.status < 300) {
                batch.resolveEvents()
                return  // Success
            }

            // ... error handling (429, 5xx, etc.)

        } catch (err) {
            failureReason = err
        }

        // TERMINAL FAILURE - exhausted retries
        if (currentAttempt === maxAttempts) {
            resolveFailedBatch(batch, failureReason)
            return
        }

        // RETRY WITH BACKOFF
        await sleep(
            requestedRetryTimeout
                ? requestedRetryTimeout  // TAPI header takes precedence
                : backoff({
                    attempt: currentAttempt,
                    minTimeout: 25,
                    maxTimeout: 1000,
                })
        )
    }
}
```

**Backoff Progression:**
```
Attempt 1: random(1-2) * 25 * 2^1 = 50ms - 100ms
Attempt 2: random(1-2) * 25 * 2^2 = 100ms - 200ms
Attempt 3: random(1-2) * 25 * 2^3 = 200ms - 400ms
... capped at 1000ms
```

**File References:**
- `/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts:207-325`

---

## 5. Exponential Backoff

### Backoff Formula Comparison

| SDK | Base | Factor | Max | Jitter | Formula |
|-----|------|--------|-----|--------|---------|
| **React Native** | 0.5s | 2 | 300s | 10% | `0.5 * 2^n + jitter` |
| **Kotlin** | N/A | N/A | N/A | N/A | None |
| **Swift** | N/A | N/A | N/A | N/A | None |
| **JS Browser** | 500ms | 2 | ∞ | 100% | `random(1-2) * 500 * 2^n` |
| **JS Node.js** | 25ms | 2 | 1000ms | 100% | `random(1-2) * 25 * 2^n` |

### Jitter Implementation

**React Native (Additive Jitter):**
```typescript
const jitter = cappedBackoff * (jitterPercent / 100) * Math.random()
return cappedBackoff + jitter

// Example: 10s backoff, 10% jitter
// = 10s + random(0, 1s)
// = 10s - 11s
```

**JavaScript (Multiplicative Jitter):**
```typescript
const random = Math.random() + 1  // 1.0 to 2.0
return random * minTimeout * Math.pow(factor, attempt)

// Example: 500ms base, attempt 3
// = random(1-2) * 500 * 2^3
// = random(1-2) * 4000
// = 4000ms - 8000ms (100% jitter range)
```

**Why Jitter:**
- Prevents thundering herd
- Spreads retry load over time
- Reduces server spike on recovery

**Recommendation:**
- Additive jitter (RN) is more predictable
- Multiplicative jitter (JS) has wider spread
- Both prevent thundering herd

---

## 6. Rate Limiting (429 Handling)

### 429 Handling Comparison

| SDK | Detects 429? | Parses Retry-After? | Backoff Window? | Applies To |
|-----|--------------|---------------------|-----------------|------------|
| **React Native** | ✅ Yes | ✅ Yes | ✅ UploadStateMachine | ❌ Not integrated |
| **Kotlin** | ⚠️ Telemetry only | ⚠️ Telemetry only | ⚠️ Telemetry only | Telemetry |
| **Swift** | ⚠️ Telemetry only | ⚠️ Telemetry only | ⚠️ Telemetry only | Telemetry |
| **JS Browser** | ✅ Yes | ✅ Yes | ✅ Via RateLimitError | Batch uploads |
| **JS Node.js** | ✅ Yes | ✅ Yes | ✅ Via retry loop | Batch uploads |

### React Native: UploadStateMachine (Not Integrated)

**UploadStateMachine Implementation:**
```typescript
// UploadStateMachine.ts:1-136
export class UploadStateMachine {
    private config: RateLimitConfiguration
    private state: UploadStateData

    async canUpload(): Promise<boolean> {
        if (!this.config.enabled) return true

        const now = Date.now()
        if (now < this.state.waitUntilTime) {
            return false  // Rate limited
        }

        return true
    }

    async handle429(retryAfterSeconds: number): Promise<void> {
        // Validate input
        if (retryAfterSeconds < 0) {
            this.logger?.warn(`Invalid retryAfterSeconds ${retryAfterSeconds}, using 0`)
            retryAfterSeconds = 0
        }
        if (retryAfterSeconds > this.config.maxRetryInterval) {
            this.logger?.warn(`retryAfterSeconds ${retryAfterSeconds}s exceeds maxRetryInterval, clamping to ${this.config.maxRetryInterval}s`)
            retryAfterSeconds = this.config.maxRetryInterval
        }

        this.state.waitUntilTime = Date.now() + (retryAfterSeconds * 1000)
        this.state.retryCount++
        await this.saveState()
    }
}
```

**Critical Gap:**
```typescript
// SegmentDestination.ts - NOT CALLING UploadStateMachine
async sendEvents(): Promise<void> {
    // ❌ No call to uploadStateMachine.canUpload()
    // ❌ No call to uploadStateMachine.handle429()

    await uploadEvents(batch)
        .catch(error => {
            // ❌ No status code inspection
            // ❌ No Retry-After parsing
        })
}
```

**File References:**
- `/Users/abueide/code/analytics-react-native/packages/core/src/backoff/UploadStateMachine.ts:1-136`
- `/Users/abueide/code/analytics-react-native/packages/core/src/plugins/SegmentDestination.ts:37-87`

---

### JavaScript Browser: Rate Limiting (Implemented)

**RateLimitError Handling:**
```typescript
// batched-dispatcher.ts:92-151
let rateLimitTimeout = 0

async function flush(attempt = 1): Promise<unknown> {
    if (buffer.length) {
        const batch = buffer
        buffer = []

        return sendBatch(batch)?.catch((error) => {
            ctx.log('error', 'Error sending batch', error)

            if (attempt <= (config?.maxRetries ?? 10)) {
                // Classify error
                if (error.name === 'RateLimitError') {
                    rateLimitTimeout = error.retryTimeout  // Store header value
                }

                // Re-queue batch
                buffer.push(...batch)

                // Track retry attempts
                buffer.map((event) => {
                    if ('_metadata' in event) {
                        const segmentEvent = event as ReturnType<SegmentFacade['json']>
                        segmentEvent._metadata = {
                            ...segmentEvent._metadata,
                            retryCount: attempt,
                        }
                    }
                })

                scheduleFlush(attempt + 1)
            }
        })
    }
}

function scheduleFlush(attempt = 1): void {
    if (schedule) return

    schedule = setTimeout(
        () => {
            schedule = undefined
            flush(attempt).catch(console.error)
        },
        rateLimitTimeout ? rateLimitTimeout : timeout  // Use stored header
    )
    rateLimitTimeout = 0  // Clear after use
}
```

**Behavior:**
- ✅ Detects 429 via RateLimitError
- ✅ Parses x-ratelimit-reset header
- ✅ Delays next flush by header value
- ✅ Blocks all uploads during rate limit

**File References:**
- `/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/batched-dispatcher.ts:92-151`

---

### JavaScript Node.js: Rate Limiting (Implemented)

**429 Handling in Retry Loop:**
```typescript
// publisher.ts:283-324
else if (response.status === 429) {
    // Parse x-ratelimit-reset header (Unix timestamp in seconds)
    if (response.headers && 'x-ratelimit-reset' in response.headers) {
        const rateLimitResetTimestamp = parseInt(
            response.headers['x-ratelimit-reset'],
            10
        )
        if (isFinite(rateLimitResetTimestamp)) {
            // Convert to ms and calculate delay from now
            requestedRetryTimeout = rateLimitResetTimestamp - Date.now()
        }
    }
    failureReason = new Error(`[${response.status}] ${response.statusText}`)
}

// RETRY WITH BACKOFF
await sleep(
    requestedRetryTimeout
        ? requestedRetryTimeout  // TAPI header takes precedence
        : backoff({
            attempt: currentAttempt,
            minTimeout: 25,
            maxTimeout: 1000,
        })
)
```

**Behavior:**
- ✅ Detects 429 in response
- ✅ Parses x-ratelimit-reset header (Unix timestamp)
- ✅ Calculates precise delay from timestamp
- ✅ Uses header value over exponential backoff
- ✅ Per-batch (atomic retry)

**File References:**
- `/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts:283-324`

---

## 7. Retry-After Header Parsing

### Header Format Support

| SDK | Seconds Format | HTTP-Date Format | Unix Timestamp | Header Name |
|-----|----------------|------------------|----------------|-------------|
| **React Native** | ✅ Yes | ✅ Yes | ❌ No | `Retry-After` |
| **Kotlin** | ⚠️ Telemetry only | ❌ No | ❌ No | `Retry-After` |
| **Swift** | ⚠️ Telemetry only | ❌ No | ❌ No | `Retry-After` |
| **JS Browser** | ✅ Yes | ❌ No | ❌ No | `x-ratelimit-reset` |
| **JS Node.js** | ❌ No | ❌ No | ✅ Yes | `x-ratelimit-reset` |

### React Native: parseRetryAfter() (Not Integrated)

**Implementation:**
```typescript
// errors.ts:183-203
export function parseRetryAfter(
  retryAfterHeader: string,
  maxRetryInterval: number
): number | undefined {
  // Try parsing as seconds
  const seconds = parseInt(retryAfterHeader, 10)
  if (!isNaN(seconds) && seconds >= 0) {
    return Math.min(seconds, maxRetryInterval)
  }

  // Try parsing as HTTP-date
  const date = new Date(retryAfterHeader)
  if (!isNaN(date.getTime())) {
    const delaySeconds = Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000))
    return Math.min(delaySeconds, maxRetryInterval)
  }

  return undefined
}
```

**Supported Formats:**
```
Seconds:   "60"
HTTP-Date: "Fri, 31 Dec 2026 23:59:59 GMT"
```

**Critical Gap:**
```typescript
// SegmentDestination.ts - NOT CALLING parseRetryAfter()
// ❌ No header parsing
// ❌ No call to UploadStateMachine.handle429()
```

**File References:**
- `/Users/abueide/code/analytics-react-native/packages/core/src/errors.ts:183-203`

---

### JavaScript Browser: x-ratelimit-reset (Seconds)

**Implementation:**
```typescript
// fetch-dispatcher.ts:22-31
if (res.status === 429) {
    const retryTimeoutStringSecs = res.headers?.get('x-ratelimit-reset')
    const retryTimeoutMS = retryTimeoutStringSecs
        ? parseInt(retryTimeoutStringSecs) * 1000
        : 5000  // Fallback: 5 seconds

    throw new RateLimitError(
        `Rate limit exceeded: ${res.status}`,
        retryTimeoutMS
    )
}
```

**Header Format:**
```
x-ratelimit-reset: 60  (seconds from now)
```

**File References:**
- `/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/fetch-dispatcher.ts:22-31`

---

### JavaScript Node.js: x-ratelimit-reset (Unix Timestamp)

**Implementation:**
```typescript
// publisher.ts:283-296
else if (response.status === 429) {
    if (response.headers && 'x-ratelimit-reset' in response.headers) {
        const rateLimitResetTimestamp = parseInt(
            response.headers['x-ratelimit-reset'],
            10
        )
        if (isFinite(rateLimitResetTimestamp)) {
            // Convert Unix timestamp (seconds) to delay from now (ms)
            requestedRetryTimeout = rateLimitResetTimestamp - Date.now()
        }
    }
    failureReason = new Error(`[${response.status}] ${response.statusText}`)
}
```

**Header Format:**
```
x-ratelimit-reset: 1709745600  (Unix timestamp in seconds)
```

**File References:**
- `/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts:283-296`

---

## 8. TAPI Compliance Status

### TAPI Requirements Checklist

| Requirement | React Native | Kotlin | Swift | JS Browser | JS Node.js |
|-------------|--------------|--------|-------|------------|------------|
| **Detect 429** | ✅ Infrastructure | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Parse Retry-After** | ✅ parseRetryAfter() | ❌ No | ❌ No | ✅ x-ratelimit-reset | ✅ x-ratelimit-reset |
| **Rate Limit Window** | ✅ UploadStateMachine | ❌ No | ❌ No | ✅ rateLimitTimeout | ✅ requestedRetryTimeout |
| **Exponential Backoff** | ✅ BackoffManager | ❌ No | ❌ No | ✅ backoff() | ✅ backoff() |
| **Jitter** | ✅ 10% additive | ❌ No | ❌ No | ✅ 100% multiplicative | ✅ 100% multiplicative |
| **Max Retry Count** | ✅ 100 (configurable) | ❌ Unbounded | ❌ Unbounded | ✅ 10 (configurable) | ✅ 3 (configurable) |
| **Transient Error Retry** | ✅ classifyError() | ⚠️ Network only | ⚠️ Network only | ✅ 5xx retry | ✅ 5xx retry |
| **Permanent Error Drop** | ✅ 4xx drop | ✅ 400 drop | ✅ 400 drop | ✅ Terminal | ✅ 400 terminal |
| **Integrated** | ❌ **NO** | ❌ **NO** | ❌ **NO** | ✅ **YES** | ✅ **YES** |

### Compliance Assessment

**✅ TAPI Compliant:**
- **JS Browser:** Full implementation with global backoff
- **JS Node.js:** Full implementation with atomic batch retry

**⚠️ Partial Compliance (Infrastructure Exists):**
- **React Native:** Has all pieces but NOT INTEGRATED into upload flow

**❌ Not TAPI Compliant:**
- **Kotlin:** No TAPI implementation (telemetry only has basic rate limiting)
- **Swift:** No TAPI implementation (telemetry only has basic rate limiting)

---

### React Native: Integration Gap Analysis

**What Exists:**
```typescript
✅ BackoffManager (exponential backoff with jitter)
✅ UploadStateMachine (rate limit window tracking)
✅ classifyError() (error classification)
✅ parseRetryAfter() (header parsing)
✅ Configurable status code overrides
✅ Persistent state (survives app restart)
```

**What's Missing:**
```typescript
❌ SegmentDestination doesn't call BackoffManager.canRetry()
❌ SegmentDestination doesn't call BackoffManager.handleTransientError()
❌ SegmentDestination doesn't call UploadStateMachine.canUpload()
❌ SegmentDestination doesn't call UploadStateMachine.handle429()
❌ SegmentDestination doesn't call classifyError()
❌ SegmentDestination doesn't call parseRetryAfter()
❌ HTTP response status code not inspected
❌ Retry-After header not extracted
```

**Integration Points Needed:**
```typescript
// SegmentDestination.ts (lines to add)

async sendEvents(): Promise<void> {
    // CHECK BACKOFF STATE
    if (!await this.backoffManager.canRetry('transient')) {
        this.logger.info('Skipping upload due to backoff')
        return
    }

    // CHECK RATE LIMIT STATE
    if (!await this.uploadStateMachine.canUpload()) {
        this.logger.info('Skipping upload due to rate limit')
        return
    }

    const batches = chunk(events, ...)

    await Promise.all(
        batches.map(async (batch) => {
            try {
                const response = await uploadEvents(batch)

                // CLASSIFY ERROR
                if (response.status !== 200) {
                    const classification = classifyError(response.status, this.config)

                    if (classification.errorType === 'rate_limit') {
                        // PARSE RETRY-AFTER
                        const retryAfter = parseRetryAfter(
                            response.headers['Retry-After'],
                            this.config.maxRetryInterval
                        )
                        // HANDLE 429
                        await this.uploadStateMachine.handle429(retryAfter || 60)
                    } else if (classification.errorType === 'transient') {
                        // HANDLE TRANSIENT ERROR
                        await this.backoffManager.handleTransientError()
                    } else if (classification.errorType === 'permanent') {
                        // DROP EVENTS
                        this.dequeue(batch)
                    }

                    throw new Error(`Upload failed: ${response.status}`)
                }

                // SUCCESS: dequeue events
                this.dequeue(batch)
            } catch (error) {
                this.logger.error('Upload error:', error)
            }
        })
    )
}
```

**Estimated Integration Effort:**
- ~50-100 lines of code
- Mostly plumbing existing infrastructure
- Comprehensive tests already exist

---

## 9. Key Differences Analysis

### Why JavaScript SDKs Are TAPI-Compliant

**Browser SDK:**
1. **Mature Implementation:** analytics.js has been around for years
2. **Production-Tested:** Millions of websites use it
3. **Segment-Owned:** Direct control over implementation
4. **Community Feedback:** Battle-tested at scale

**Node.js SDK:**
1. **Server-Side Priority:** Server SDKs need robust retry logic
2. **High Throughput:** Server apps send more events
3. **Production-Critical:** Server failures more impactful

### Why Mobile SDKs Lack TAPI

**Historical Context:**
1. **Later Development:** Mobile SDKs developed after web
2. **Resource Constraints:** Mobile teams smaller
3. **Priority Shifts:** Feature development prioritized over retry logic
4. **"Good Enough":** Basic retry worked for most cases

**React Native Specific:**
1. **Recent TAPI Work:** PRs #1150-1153 added infrastructure
2. **Not Integrated:** Work incomplete (missing SegmentDestination integration)
3. **User Feedback:** Awaiting real-world testing

**Kotlin & Swift:**
1. **Telemetry Only:** Rate limiting exists for metrics, not events
2. **Copy-Paste Incomplete:** Telemetry code not copied to event pipeline
3. **Lower Priority:** No user complaints about retry behavior

---

### Global vs Per-Batch Backoff

**Global Backoff (React Native, JS Browser):**
- Blocks all uploads during backoff
- Simpler to implement
- Proven TAPI-compliant (JS Browser)
- Event-first architecture natural fit

**Per-Batch Backoff (JS Node.js, Kotlin possible):**
- Each batch retried independently
- More complex state management
- Better isolation
- Batch-first architecture natural fit

**Architectural Implications:**
```
Event-First (RN, Swift, JS Browser)
  → Batches ephemeral
  → No stable batch IDs
  → Global backoff natural choice
  → JS Browser proves this works ✅

Batch-First (Kotlin, JS Node.js)
  → Batches stable
  → Unique batch IDs
  → Per-batch backoff possible
  → JS Node.js uses atomic batch retry ✅
```

---

## 10. Recommendations

### For React Native: **HIGH PRIORITY**

**Current State:**
- ⚠️ Infrastructure exists but NOT INTEGRATED
- ⚠️ PRs #1150-1153 added BackoffManager, UploadStateMachine, classifyError, parseRetryAfter
- ❌ SegmentDestination doesn't use them

**Immediate Action Required:**

1. **Integrate TAPI Infrastructure (~50-100 LOC):**
   ```typescript
   // SegmentDestination.ts modifications needed:

   async sendEvents(): Promise<void> {
       // 1. Check backoff state
       if (!await this.backoffManager.canRetry('transient')) {
           return
       }

       // 2. Check rate limit state
       if (!await this.uploadStateMachine.canUpload()) {
           return
       }

       // 3. Send batches
       await Promise.all(batches.map(async (batch) => {
           const response = await uploadEvents(batch)

           // 4. Classify error
           const classification = classifyError(response.status, config)

           // 5. Handle based on classification
           if (classification.errorType === 'rate_limit') {
               const retryAfter = parseRetryAfter(response.headers['Retry-After'], ...)
               await this.uploadStateMachine.handle429(retryAfter || 60)
           } else if (classification.errorType === 'transient') {
               await this.backoffManager.handleTransientError()
           } else if (classification.errorType === 'permanent') {
               this.dequeue(batch)  // Drop permanently failed batch
           }

           // 6. Dequeue on success
           if (response.status === 200) {
               this.dequeue(batch)
           }
       }))
   }
   ```

2. **Test Integration:**
   - Add integration tests for 429 handling
   - Add integration tests for 5xx retry
   - Add integration tests for backoff progression
   - Test persistent state across app restarts

3. **Document Configuration:**
   ```typescript
   // Example user configuration
   const config: Configuration = {
       httpConfiguration: {
           rateLimitConfig: {
               enabled: true,
               maxRetryCount: 100,
               maxRetryInterval: 300,
               maxRateLimitDuration: 43200
           },
           backoffConfig: {
               enabled: true,
               baseBackoffInterval: 0.5,
               maxBackoffInterval: 300,
               jitterPercent: 10,
               statusCodeOverrides: {
                   '408': 'retry',
                   '410': 'retry'
               }
           }
       }
   }
   ```

**Priority:** **CRITICAL** - Infrastructure exists, just needs integration

**Estimated Effort:** 1-2 days of development + testing

---

### For Kotlin: **HIGH PRIORITY**

**Current State:**
- ❌ No TAPI implementation
- ⚠️ Telemetry has basic rate limiting (not used for events)
- ❌ No exponential backoff
- ❌ Unbounded retries

**Recommended Approach:**

1. **Copy Telemetry Rate Limiting to EventPipeline:**
   ```kotlin
   class EventPipeline {
       private var rateLimitEndTime: Long = 0

       private fun isRateLimited(): Boolean {
           return System.currentTimeMillis() < rateLimitEndTime
       }

       suspend fun uploadFiles() {
           if (isRateLimited()) {
               logger.info("Skipping upload due to rate limit")
               return
           }

           // ... existing upload logic
       }

       private fun handleRateLimitResponse(response: HttpResponse) {
           val retryAfter = response.headers["Retry-After"]?.toLongOrNull() ?: 60
           rateLimitEndTime = System.currentTimeMillis() + (retryAfter * 1000)
       }
   }
   ```

2. **Add Exponential Backoff:**
   ```kotlin
   class BackoffManager {
       private var retryCount = 0
       private var backoffEndTime: Long = 0

       fun canRetry(): Boolean {
           return System.currentTimeMillis() >= backoffEndTime
       }

       fun calculateBackoff(retryCount: Int): Long {
           val baseBackoff = 500L * (1 shl retryCount)  // 0.5s * 2^n
           val capped = min(baseBackoff, 300000L)  // Cap at 5 minutes
           val jitter = (capped * 0.1 * Math.random()).toLong()
           return capped + jitter
       }

       fun handleTransientError() {
           val delay = calculateBackoff(retryCount)
           backoffEndTime = System.currentTimeMillis() + delay
           retryCount++
       }
   }
   ```

3. **Add Max Retry Count:**
   ```kotlin
   private var retryCount = 0
   private val maxRetries = 100

   suspend fun uploadFiles() {
       if (retryCount >= maxRetries) {
           logger.error("Max retries exceeded, clearing queue")
           storage.clearBatches()
           retryCount = 0
           return
       }
       // ... upload logic
   }
   ```

**Priority:** **HIGH** - No TAPI compliance currently

**Estimated Effort:** 2-3 days of development + testing

---

### For Swift: **HIGH PRIORITY**

**Current State:**
- Same as Kotlin (no TAPI, telemetry only)

**Recommended Approach:**

1. **Follow React Native Pattern:**
   - Swift SDK architecture mirrors React Native
   - Can copy-paste BackoffManager logic (adapted to Swift)
   - Can copy-paste UploadStateMachine logic

2. **Implementation:**
   ```swift
   class BackoffManager {
       private var retryCount = 0
       @Atomic private var backoffEndTime: TimeInterval = 0

       func canRetry() -> Bool {
           return Date().timeIntervalSince1970 >= backoffEndTime
       }

       func handleTransientError() {
           let baseBackoff = 0.5 * pow(2.0, Double(retryCount))
           let capped = min(baseBackoff, 300.0)
           let jitter = capped * 0.1 * Double.random(in: 0...1)
           backoffEndTime = Date().timeIntervalSince1970 + capped + jitter
           retryCount += 1
       }
   }

   class UploadStateMachine {
       @Atomic private var waitUntilTime: TimeInterval = 0

       func canUpload() -> Bool {
           return Date().timeIntervalSince1970 >= waitUntilTime
       }

       func handle429(retryAfterSeconds: TimeInterval) {
           waitUntilTime = Date().timeIntervalSince1970 + retryAfterSeconds
       }
   }
   ```

**Priority:** **HIGH** - No TAPI compliance currently

**Estimated Effort:** 2-3 days of development + testing

---

### For JavaScript: **LOW PRIORITY**

**Current State:**
- ✅ Browser SDK TAPI-compliant
- ✅ Node.js SDK TAPI-compliant

**Optional Improvements:**

1. **Standardize Header Name:**
   - Browser uses `x-ratelimit-reset` (seconds)
   - Node.js uses `x-ratelimit-reset` (Unix timestamp)
   - Inconsistent formats

2. **Add Retry Count Metadata (Node.js):**
   - Browser sends `retryCount` in `_metadata`
   - Node.js doesn't
   - Would help with observability

**Priority:** **LOW** - Already compliant

---

### Cross-SDK Consistency

**Standardize Configuration:**
```
All SDKs should have:
- rateLimitConfig.enabled
- rateLimitConfig.maxRetryCount
- rateLimitConfig.maxRetryInterval
- backoffConfig.enabled
- backoffConfig.baseBackoffInterval
- backoffConfig.maxBackoffInterval
- backoffConfig.jitterPercent
- statusCodeOverrides (configurable behavior)
```

**Standardize Behavior:**
- All SDKs use exponential backoff with jitter
- All SDKs parse Retry-After header
- All SDKs block uploads during rate limit window
- All SDKs have configurable max retry count

**Priority:** **MEDIUM** - After individual SDK TAPI compliance

---

## Summary

### Critical Findings

1. **JavaScript SDKs TAPI-Compliant:**
   - ✅ Browser SDK proves event-first + global backoff works
   - ✅ Node.js SDK proves batch-first + atomic retry works
   - Both patterns valid for TAPI compliance

2. **React Native Has Infrastructure But Not Integrated:**
   - ⚠️ BackoffManager exists but not called
   - ⚠️ UploadStateMachine exists but not called
   - ⚠️ classifyError() exists but not called
   - ⚠️ parseRetryAfter() exists but not called
   - **~50-100 LOC to integrate**

3. **Kotlin & Swift Lack TAPI:**
   - ❌ No exponential backoff
   - ❌ No rate limit detection (except telemetry)
   - ❌ Unbounded retries
   - ⚠️ Telemetry has basic rate limiting (not copied to events)

4. **Global vs Per-Batch Validated:**
   - ✅ JS Browser: Event-first + global backoff = TAPI-compliant
   - ✅ JS Node.js: Batch-first + atomic batch retry = TAPI-compliant
   - Both architectures can achieve TAPI compliance

5. **React Native Should Follow JS Browser:**
   - Same event-first architecture
   - Global backoff proven pattern
   - Infrastructure already exists
   - Just needs integration

### Action Items

**Immediate (React Native):**
1. Integrate TAPI infrastructure into SegmentDestination
2. Test 429 and 5xx handling
3. Document configuration options

**High Priority (Kotlin, Swift):**
1. Implement exponential backoff
2. Implement rate limit detection
3. Add max retry count
4. Copy telemetry patterns to event uploads

**Medium Priority (All SDKs):**
1. Standardize configuration across SDKs
2. Add observability (retry count metrics)
3. Document TAPI compliance in READMEs

### Architectural Validation

**Key Insight:** JavaScript browser SDK proves that **event-first architecture + global backoff = TAPI-compliant**. This validates the approach for React Native and Swift.

**Recommendation:** React Native should prioritize integrating existing infrastructure over refactoring to per-batch backoff.
