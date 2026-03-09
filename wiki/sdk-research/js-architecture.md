# Analytics-Next (JavaScript) SDK Architecture Analysis

**Repository:** https://github.com/segmentio/analytics-next
**Local Path:** /Users/abueide/code/analytics-next
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
  → EventFactory.create()
  → Context created with unique ID
  → EventQueue.register()
  → PriorityQueue.push()
  → Plugin chain (enrichment → destination)
  → SegmentDestination.send()
  → BatchingDispatcher.enqueue()
  → [On flush trigger]
  → fetch POST to api.segment.io/v1/batch
  → Response Handler
    → 2xx: Remove from queue
    → 429: Retry with x-ratelimit-reset
    → 5xx: Retry with exponential backoff
```

### Key Files

- **Event Creation:**
  `/Users/abueide/code/analytics-next/packages/core/src/events/index.ts:50-61`

- **Context Creation:**
  `/Users/abueide/code/analytics-next/packages/core/src/context/index.ts:37-104`

- **Queue Registration:**
  `/Users/abueide/code/analytics-next/packages/core/src/queue/event-queue.ts:96-178`

- **Plugin Chain Execution:**
  `/Users/abueide/code/analytics-next/packages/core/src/queue/event-queue.ts:180-239`

- **Browser Batching:**
  `/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/batched-dispatcher.ts`

- **Node.js Publishing:**
  `/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts`

### Event Processing Details

1. **Event Creation:**
   ```typescript
   // EventFactory.create()
   const ctx = new Context({
     id: id(),  // Unique UUID
     type: 'track',
     event: 'Button Clicked',
     properties: { button: 'submit' }
   })
   ```

2. **Context Lifecycle:**
   - Attempt tracking: `ctx.attempts = 0`
   - State tracking: `ctx.isCancelled()`, `ctx.isDelivered()`
   - Failure tracking: `ctx.setFailedDelivery({ reason })`

3. **Queue Priority:**
   - Browser: `PriorityQueue<Context>` with attempt-based ordering
   - Node.js: `ContextBatch` groups events for atomic delivery

4. **Flush Triggers:**
   - Manual: `analytics.flush()`
   - Count-based: When event count reaches `flushAt` (browser: 10, node: 15)
   - Interval-based: Every `flushInterval` ms (browser: 5000ms, node: 10000ms)
   - Page unload (browser only): `pagehide` event

---

## 2. Queue & Batch Architecture

### Browser Queue Implementation

**PriorityQueue Architecture:**

```typescript
// packages/browser/src/lib/priority-queue/index.ts
class PriorityQueue<Item> {
  private queue: Item[] = []               // Active items
  private seen = new Map<string, number>() // id → attempts
  private future: Item[] = []              // Items scheduled for retry

  maxAttempts: number = 1  // Standard: no retries
  // With retry queue: maxAttempts = 10
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/lib/priority-queue/index.ts:1-103`

**PersistedPriorityQueue (Browser Persistence):**

```typescript
// packages/browser/src/lib/priority-queue/persisted.ts
class PersistedPriorityQueue<Item> extends PriorityQueue<Item> {
  // localStorage keys:
  // - persisted-queue:v1:{writeKey}:items
  // - persisted-queue:v1:{writeKey}:seen
  // - persisted-queue:v1:{writeKey}:lock (mutex, 50ms TTL)
}
```

**Persistence Triggers:**
- On push/pop: Debounced write (configurable delay)
- On page hide: Immediate flush to localStorage
- On window unload: Final save via `pagehide` listener

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/lib/priority-queue/persisted.ts:1-155`

### Node.js Queue Implementation

**ContextBatch Architecture:**

```typescript
// packages/node/src/plugins/segmentio/context-batch.ts
class ContextBatch {
  private contexts: Context[] = []
  private id: string = id()  // Unique batch UUID

  MAX_EVENT_SIZE_IN_KB = 32
  MAX_BATCH_SIZE_IN_KB = 480  // 500KB server max with padding
}
```

**Key Characteristics:**
- **Stable Batch ID:** Each batch gets unique UUID
- **Atomic Retry:** Entire batch retried together on failure
- **Size Constraints:** Events checked before addition
- **No Persistence:** Lost on process restart

**Location:**
`/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/context-batch.ts:1-92`

### Batch Creation Strategy

**Browser Batching:**

```typescript
// packages/browser/src/plugins/segmentio/batched-dispatcher.ts:9-23
MAX_PAYLOAD_SIZE = 500  // KB
MAX_KEEPALIVE_SIZE = 64 // KB (for page unload)

let buffer: Context[] = []

function enqueue(ctx: Context): void {
  buffer.push(ctx)

  if (buffer.length >= (config?.size || 10)) {
    flush()  // Count-based flush
  }

  if (approachingTrackingAPILimit(buffer)) {
    flush()  // Size-based flush (450KB threshold)
  }
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/batched-dispatcher.ts:9-23, 36-70`

**Node.js Batching:**

```typescript
// packages/node/src/plugins/segmentio/publisher.ts:87-133
private _batch?: ContextBatch

enqueue(ctx: Context): void {
  if (!this._batch) {
    this._batch = new ContextBatch(
      this._maxEventsInBatch,
      this._maxEventSizeInKB
    )
  }

  const overflow = this._batch.tryAddContext(ctx)

  if (overflow) {
    // Current batch full, send it
    send(this._batch)

    // Start new batch with overflow event
    this._batch = new ContextBatch(...)
    this._batch.tryAddContext(ctx)
  }

  if (this._batch.getContexts().length >= this._flushAt) {
    send(this._batch)
    this._batch = undefined
  }
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts:87-133`

### Batching Rules Comparison

| Aspect | Browser | Node.js |
|--------|---------|---------|
| **Default Size** | 10 events | 15 events |
| **Max Payload** | 500 KB | 480 KB |
| **Flush Interval** | 5000ms | 10000ms |
| **Batch Identity** | Ephemeral | Stable UUID |
| **Overflow Handling** | Split into multiple batches | Atomic batch + new batch |
| **Page Unload** | 64KB chunks (keepalive limit) | N/A |

---

## 3. Storage Layer

### Browser Storage

**localStorage Architecture:**

```typescript
// packages/browser/src/core/storage/localStorage.ts
interface StoreType {
  get(key: string): any | null
  set<T>(key: string, value: T): T
  remove(key: string): void
}

// Typical browser limits: 5-10MB per domain
```

**Storage Keys:**
```
User/Settings:
- ajs_user_id:{writeKey}
- ajs_user_traits:{writeKey}
- ajs_anonymous_id:{writeKey}
- ajs_group_id:{writeKey}
- ajs_group_traits:{writeKey}

Queue Persistence:
- persisted-queue:v1:{writeKey}:items          → Context[] serialized
- persisted-queue:v1:{writeKey}:seen           → Map<id, attempts>
- persisted-queue:v1:{writeKey}:lock           → timestamp (mutex)

Per-Destination Queues:
- persisted-queue:v1:{writeKey}:dest-{name}:items
- persisted-queue:v1:{writeKey}:dest-{name}:seen
- persisted-queue:v1:{writeKey}:dest-{name}:lock
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/core/storage/localStorage.ts:1-50`

**Cookie Fallback:**
```typescript
// packages/browser/src/core/storage/universalStorage.ts
// Falls back to cookies if localStorage unavailable
// Format: {key}={value}; max-age={ttl}; path=/; SameSite=Lax
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/core/storage/universalStorage.ts:1-123`

### Persistence Mechanism

**Mutex-Protected Writes:**

```typescript
// packages/browser/src/lib/priority-queue/persisted.ts:41-59
function mutex(key: string, fn: () => void): void {
  const lockKey = `${key}:lock`
  const LOCK_TTL = 50  // 50ms lock timeout

  const lock = localStorage.getItem(lockKey)
  const lockTimestamp = lock ? parseInt(lock) : 0

  if (Date.now() - lockTimestamp > LOCK_TTL) {
    localStorage.setItem(lockKey, Date.now().toString())
    fn()
    localStorage.removeItem(lockKey)
  }
}
```

**Debounced Persistence:**

```typescript
// packages/browser/src/lib/priority-queue/persisted.ts:112-125
private scheduleFlush(): void {
  if (this.flushTimeout) {
    clearTimeout(this.flushTimeout)
  }

  this.flushTimeout = setTimeout(() => {
    mutex(key, () => {
      persistItems(itemsKey, this.queue)
      persistSeen(seenKey, this.seen)
    })
  }, 100)  // 100ms debounce
}
```

**Page Hide Handler:**

```typescript
// packages/browser/src/lib/priority-queue/persisted.ts:130-137
window.addEventListener('pagehide', () => {
  if (this.todo > 0) {
    mutex(key, () => {
      persistItems(itemsKey, this.queue)
      persistSeen(seenKey, this.seen)
    })
  }
})
```

### Node.js Storage

**No Persistence:**
- All state in-memory
- Lost on process restart
- Application responsible for graceful shutdown

**Batch In-Flight Tracking:**
```typescript
private _batch?: ContextBatch  // Single batch reference
```

---

## 4. Concurrency Model

### Browser Event Loop

**Single-Threaded Execution:**
- All operations on main thread
- Async/await for I/O operations
- No worker threads for event processing

**Promise Handling:**

```typescript
// packages/core/src/queue/event-queue.ts:180-239
private async deliverLoop(): Promise<unknown> {
  const ctx = await this.queue.pop('nextAttempt')

  if (!ctx) return  // Queue empty

  try {
    await this.flushOne(ctx, this.plugins)
  } catch (err) {
    this.enqueuRetry(err, ctx)
  }

  return this.deliverLoop()  // Recursive loop
}
```

**Concurrent Flushing Guard:**

```typescript
// packages/browser/src/plugins/segmentio/batched-dispatcher.ts:34-36
let flushing = false

function scheduleFlush(attempt = 1): void {
  if (schedule || flushing) return  // Prevent concurrent flushes

  schedule = setTimeout(() => {
    schedule = undefined
    flush(attempt).catch(console.error)
  }, timeout)
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/batched-dispatcher.ts:34-70`

### Node.js Concurrency

**Async Publisher:**

```typescript
// packages/node/src/plugins/segmentio/publisher.ts:87-133
private _flushing = false

public async enqueue(ctx: Context): Promise<void> {
  // Add to batch
  this._batch.tryAddContext(ctx)

  // Check if should send
  if (this._batch.getContexts().length >= this._flushAt) {
    await this.send(this._batch)
    this._batch = undefined
  }
}
```

**Sequential Batch Sends:**
- Single batch in flight
- Await send completion before starting next
- No parallel request handling

**Location:**
`/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts:87-133`

### Backoff Scheduling

**Browser:**

```typescript
// packages/core/src/priority-queue/index.ts:49-76
pushWithBackoff(item: Item, minTimeout = 0): boolean {
  const attempt = this.updateAttempts(item)

  if (attempt > this.maxAttempts) {
    return false  // Exhausted retries
  }

  let timeout = backoff({ attempt: attempt - 1 })
  if (minTimeout > 0 && timeout < minTimeout) {
    timeout = minTimeout  // Respect rate limit header
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

**Node.js:**

```typescript
// packages/node/src/plugins/segmentio/publisher.ts:314-324
await sleep(
  requestedRetryTimeout
    ? requestedRetryTimeout  // Use x-ratelimit-reset header
    : backoff({
        attempt: currentAttempt,
        minTimeout: 25,
        maxTimeout: 1000,
      })
)
```

**Backoff Formula:**

```typescript
// packages/core/src/priority-queue/backoff.ts:15-24
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

// Browser: minTimeout=500, factor=2, maxTimeout=Infinity
// Attempt 0: 500ms - 1000ms
// Attempt 1: 1000ms - 2000ms
// Attempt 2: 2000ms - 4000ms
// ...

// Node.js: minTimeout=25, factor=2, maxTimeout=1000
// Attempt 0: 25ms - 50ms
// Attempt 1: 50ms - 100ms
// Attempt 2: 100ms - 200ms
// ... capped at 1000ms
```

**Location:**
`/Users/abueide/code/analytics-next/packages/core/src/priority-queue/backoff.ts:15-24`

---

## 5. Plugin Architecture

### Plugin Hierarchy

```typescript
// packages/core/src/plugin/index.ts

interface Plugin {
  name: string
  type: 'before' | 'after' | 'destination' | 'enrichment' | 'utility'
  version: string
  isLoaded(): boolean
  load(ctx: Context, instance: Analytics): Promise<void>
  track?(ctx: Context): Promise<Context> | Context
  page?(ctx: Context): Promise<Context> | Context
  identify?(ctx: Context): Promise<Context> | Context
  group?(ctx: Context): Promise<Context> | Context
  alias?(ctx: Context): Promise<Context> | Context
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/core/src/plugin/index.ts:1-87`

### Plugin Execution Order

```
User Event
  ↓
Before Plugins (can cancel event)
  ↓
Enrichment Plugins (add data)
  ↓
Destination Plugins (send to services)
  ↓ (parallel execution)
After Plugins (cleanup)
```

**Location:**
`/Users/abueide/code/analytics-next/packages/core/src/queue/event-queue.ts:180-239`

### Built-in Plugins

**Browser:**
- **SegmentDestination:** Sends events to Segment API
- **UserPlugin:** Manages user ID and traits
- **GroupPlugin:** Manages group ID and traits
- **PagePlugin:** Tracks page views
- **ValidationPlugin:** Validates event structure

**Node.js:**
- **SegmentDestination:** Batches and sends events to Segment API
- **SourceMiddleware:** Adds source metadata
- **NormalizePlugin:** Normalizes event structure

### SegmentDestination (Browser)

```typescript
// packages/browser/src/plugins/segmentio/index.ts:13-131
export class SegmentDestination implements DestinationPlugin {
  name = 'Segment.io'
  type = 'destination' as const
  version = '1.0.0'

  private buffer: Context[] = []
  private batching: boolean

  async track(ctx: Context): Promise<Context> {
    if (this.batching) {
      this.buffer.push(ctx)
      scheduleFlush(...)
    } else {
      await send(ctx)
    }
    return ctx
  }
}
```

**Batching Mode:**
- Enabled via `integrations['Segment.io'].batching = true`
- Collects events in buffer
- Flushes based on size/time triggers

**Non-Batching Mode:**
- Sends events immediately
- No buffering
- Standard retry queue applies

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/index.ts:13-131`

### SegmentDestination (Node.js)

```typescript
// packages/node/src/plugins/segmentio/index.ts:25-112
export class SegmentDestination implements Plugin {
  name = 'Segment.io'
  type = 'destination' as const

  private publisher: Publisher

  async track(ctx: Context): Promise<Context> {
    await this.publisher.enqueue(ctx)
    return ctx
  }
}
```

**Publisher Pattern:**
- Delegates to `Publisher` class
- Publisher manages batching and sending
- Atomic batch retry on failure

**Location:**
`/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/index.ts:25-112`

---

## 6. Error Handling & Retry Logic

### Browser Error Classification

**RateLimitError (429):**

```typescript
// packages/browser/src/plugins/segmentio/ratelimit-error.ts
export class RateLimitError extends Error {
  retryTimeout: number

  constructor(message: string, retryTimeout: number) {
    super(message)
    this.retryTimeout = retryTimeout
    this.name = 'RateLimitError'
  }
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/ratelimit-error.ts:1-9`

**Response Handling:**

```typescript
// packages/browser/src/plugins/segmentio/fetch-dispatcher.ts:18-31
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

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/fetch-dispatcher.ts:18-31`

### Browser Retry Strategy

**Batching Retry Loop:**

```typescript
// packages/browser/src/plugins/segmentio/batched-dispatcher.ts:109-151
async function flush(attempt = 1): Promise<unknown> {
  if (buffer.length) {
    const batch = buffer
    buffer = []

    return sendBatch(batch)?.catch((error) => {
      ctx.log('error', 'Error sending batch', error)

      if (attempt <= (config?.maxRetries ?? 10)) {
        // Classify error
        if (error.name === 'RateLimitError') {
          rateLimitTimeout = error.retryTimeout  // Use header value
        }

        // Re-buffer for retry
        buffer.push(...batch)

        // Track retry attempts in metadata
        buffer.map((event) => {
          if ('_metadata' in event) {
            const segmentEvent = event as ReturnType<SegmentFacade['json']>
            segmentEvent._metadata = {
              ...segmentEvent._metadata,
              retryCount: attempt,  // Send to TAPI for observability
            }
          }
        })

        scheduleFlush(attempt + 1)
      }
    })
  }
}

function scheduleFlush(attempt = 1): void {
  if (schedule) return  // Prevent duplicate scheduling

  schedule = setTimeout(
    () => {
      schedule = undefined
      flush(attempt).catch(console.error)
    },
    rateLimitTimeout ? rateLimitTimeout : timeout  // Use rate limit or default
  )
  rateLimitTimeout = 0  // Clear after use
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/batched-dispatcher.ts:109-151`

**Standard Queue Retry:**

```typescript
// packages/core/src/queue/event-queue.ts:207-214
private enqueuRetry(err: Error, ctx: Ctx): boolean {
  const retriable = !(err instanceof ContextCancelation) || err.retry
  if (!retriable) {
    return false  // Terminal error
  }

  return this.queue.pushWithBackoff(ctx)  // Exponential backoff
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/core/src/queue/event-queue.ts:207-214`

### Node.js Error Classification

**Detailed Retry Loop:**

```typescript
// packages/node/src/plugins/segmentio/publisher.ts:207-325
async send(batch: ContextBatch) {
  const maxAttempts = this._maxRetries + 1
  let currentAttempt = 0

  while (currentAttempt < maxAttempts) {
    currentAttempt++

    let requestedRetryTimeout: number | undefined
    let failureReason: unknown

    try {
      // OAuth token handling
      let authString = undefined
      if (this._tokenManager) {
        const token = await this._tokenManager.getAccessToken()
        if (token?.access_token) {
          authString = `Bearer ${token.access_token}`
        }
      }

      const response = await this._httpClient.makeRequest({
        url: this._url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'analytics-node-next/latest',
          ...(authString && { Authorization: authString }),
        },
        body: JSON.stringify({
          batch: batch.getContexts().map((ctx) => ctx.event),
          writeKey: this._writeKey,
          sentAt: new Date(),
        }),
        httpRequestTimeout: this._httpRequestTimeout,
      })

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
    } catch (err) {
      // Network errors - retry
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

function resolveFailedBatch(batch: ContextBatch, reason: unknown) {
  batch.getContexts().forEach((ctx) => ctx.setFailedDelivery({ reason }))
  batch.resolveEvents()
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts:207-325`

### Retry Behavior Comparison

| Error Code | Browser Behavior | Node.js Behavior |
|------------|------------------|------------------|
| **2xx** | Success, remove from queue | Success, resolve batch |
| **400** | Terminal (no retry) | Terminal (unless OAuth) |
| **401/403** | Terminal | Retry with new token (OAuth only) |
| **429** | Retry with x-ratelimit-reset | Retry with x-ratelimit-reset |
| **5xx** | Retry with exponential backoff | Retry with exponential backoff |
| **Network** | Retry with exponential backoff | Retry with exponential backoff |

---

## 7. Platform Capabilities

### Browser Constraints

**localStorage Limits:**
- Typical: 5-10MB per domain (browser-dependent)
- Quota exceeded: Silent fail with warning
- Storage keys namespaced by writeKey

**Batch Size Limits:**
```typescript
MAX_PAYLOAD_SIZE = 500      // KB per batch
MAX_KEEPALIVE_SIZE = 64     // KB (page unload with keepalive)
```

**Offline Detection:**
```typescript
// packages/browser/src/core/connection/index.ts
isOffline() = !window.navigator.onLine

// Used throughout:
// - EventQueue.flush() checks isOffline() before flushing
// - SegmentDestination.send() checks isOffline() before sending
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/core/connection/index.ts:1-13`

**Page Unload Handling:**

```typescript
// packages/browser/src/plugins/segmentio/batched-dispatcher.ts:153-160
onPageChange((unloaded) => {
  pageUnloaded = unloaded

  if (pageUnloaded && buffer.length) {
    // Split into 64KB chunks to respect keepalive limit
    const reqs = chunks(buffer).map(sendBatch)
    Promise.all(reqs).catch(console.error)  // Parallel sends on unload
  }
})
```

**CORS Handling:**
```typescript
// Using Segment's owned domain (api.segment.io) - CORS-enabled
const SEGMENT_API_HOST = 'api.segment.io'

// Content-Type: text/plain to avoid preflight requests
createHeaders() = {
  'Content-Type': 'text/plain'
}

// Keepalive for page unload
keepalive: config?.keepalive || pageUnloaded
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/shared-dispatcher.ts`

### Node.js Constraints

**HTTP Timeout:**
```typescript
// packages/node/src/lib/http-client.ts:88-103
httpRequestTimeout: 10000  // 10 seconds default

// Implemented via AbortSignal
const [signal, timeoutId] = abortSignalAfterTimeout(
  options.httpRequestTimeout
)
return fetch(url, { ...config, signal })
  .finally(() => clearTimeout(timeoutId))
```

**Batch Size Limits:**
```typescript
MAX_EVENT_SIZE_IN_KB = 32   // Per event
MAX_BATCH_SIZE_IN_KB = 480  // Per batch (500KB limit with padding)
```

**Memory Constraints:**
- Single batch in flight (`_batch?: ContextBatch`)
- No persistence between process runs
- Application responsible for graceful shutdown

**Location:**
`/Users/abueide/code/analytics-next/packages/node/src/lib/http-client.ts:88-103`
`/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/context-batch.ts:5-6`

---

## 8. Batch Identity & Tracking

### Browser: Event-Level Identity

**Context ID:**

```typescript
// packages/core/src/context/index.ts:37-104
export class Context {
  private _id: string  // Unique UUID per event

  id(): string {
    return this._id
  }

  attempts: number = 0  // Retry counter
}
```

**Key Characteristics:**
- Each event (Context) has unique UUID
- No batch-level identifier
- Batches are ephemeral collections of events
- Retry tracking per-event via `attempts`

**Location:**
`/Users/abueide/code/analytics-next/packages/core/src/context/index.ts:37-104`

### Node.js: Stable Batch Identity

**ContextBatch ID:**

```typescript
// packages/node/src/plugins/segmentio/context-batch.ts:10-19
export class ContextBatch {
  private id: string = id()  // Unique UUID per batch
  private contexts: Context[] = []

  getId(): string {
    return this.id
  }
}
```

**Key Characteristics:**
- Each batch has stable UUID
- Persists across retry attempts
- Atomic batch retry (all events together)
- No per-event retry tracking within batch

**Location:**
`/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/context-batch.ts:10-19`

### Retry Metadata

**Browser - Sent to TAPI:**

```typescript
// packages/browser/src/plugins/segmentio/normalize.ts:30-38
if (ctx != null) {
  if (ctx.attempts > 1) {
    json._metadata = {
      ...json._metadata,
      retryCount: ctx.attempts,  // Observable by TAPI
    }
  }
  ctx.attempts++
}
```

**Node.js - Atomic Batch:**
```typescript
// All events in batch have same attempt count
// No per-event retry metadata sent to TAPI
```

### Identity Comparison

| Aspect | Browser | Node.js |
|--------|---------|---------|
| **Event ID** | Unique UUID per Context | Unique UUID per Context |
| **Batch ID** | None (ephemeral collection) | Stable UUID per ContextBatch |
| **Retry Tracking** | Per-event (ctx.attempts) | Per-batch (currentAttempt) |
| **TAPI Metadata** | retryCount in _metadata | None |
| **Idempotency** | Event messageId | Batch id + event messageId |

---

## 9. Existing TAPI Implementation

### Browser Rate Limiting

**429 Handling:**

```typescript
// packages/browser/src/plugins/segmentio/fetch-dispatcher.ts:22-31
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

**Retry Timeout Application:**

```typescript
// packages/browser/src/plugins/segmentio/batched-dispatcher.ts:109-151
.catch((error) => {
  if (error.name === 'RateLimitError') {
    rateLimitTimeout = error.retryTimeout  // Store header value
  }

  buffer.push(...batch)  // Re-queue batch
  scheduleFlush(attempt + 1)  // Schedule with delay
})

function scheduleFlush(attempt = 1): void {
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

**5xx Handling:**

```typescript
if (res.status >= 500) {
  throw new Error(`Bad response from server: ${res.status}`)
}

// Retried via standard queue with exponential backoff
```

**Location:**
`/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/fetch-dispatcher.ts:18-31`
`/Users/abueide/code/analytics-next/packages/browser/src/plugins/segmentio/batched-dispatcher.ts:92-151`

### Node.js Rate Limiting

**429 Handling:**

```typescript
// packages/node/src/plugins/segmentio/publisher.ts:283-296
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
```

**Retry with Header-Guided Delay:**

```typescript
// packages/node/src/plugins/segmentio/publisher.ts:314-324
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

**Location:**
`/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/publisher.ts:283-324`

### Exponential Backoff

**Browser Backoff:**
```typescript
// packages/core/src/priority-queue/backoff.ts:15-24
backoff({ attempt: n, minTimeout: 500, factor: 2 })
= random(1-2) * 500 * 2^n

Attempt 0: 500ms - 1000ms
Attempt 1: 1000ms - 2000ms
Attempt 2: 2000ms - 4000ms
...
```

**Node.js Backoff:**
```typescript
backoff({ attempt: n, minTimeout: 25, maxTimeout: 1000 })
= min(random(1-2) * 25 * 2^n, 1000)

Attempt 0: 25ms - 50ms
Attempt 1: 50ms - 100ms
Attempt 2: 100ms - 200ms
... capped at 1000ms
```

**Jitter:** `random(1-2)` multiplier prevents thundering herd

**Location:**
`/Users/abueide/code/analytics-next/packages/core/src/priority-queue/backoff.ts:15-24`

### TAPI Compliance Status

**✅ Browser:**
- Parses `x-ratelimit-reset` header
- Respects TAPI-specified retry delay
- Sends `retryCount` in `_metadata`
- Exponential backoff with jitter
- Configurable max retries (default 10)

**✅ Node.js:**
- Parses `x-ratelimit-reset` header
- Respects TAPI-specified retry delay
- Exponential backoff with jitter
- Configurable max retries (default 3)
- Atomic batch retry

**Key Difference:**
- **Browser:** Per-event retry, batch reformed on each attempt
- **Node.js:** Per-batch retry, batch identity stable across attempts

---

## 10. Memory Management

### Browser Queue Limits

**Default Configuration:**
```typescript
maxAttempts: 1  // Standard queue (no retries)
maxAttempts: 10 // Retry queue enabled
```

**Storage Cleanup:**
- Failed events dropped after `maxAttempts`
- Successfully sent events removed from queue
- localStorage persists failed events across sessions

**Buffer Limits:**
```typescript
// No explicit event count limit in buffer
// Limited by browser localStorage quota (5-10MB)
```

### Node.js Memory Management

**Single Batch in Flight:**
```typescript
private _batch?: ContextBatch
```

**Event Size Validation:**
```typescript
MAX_EVENT_SIZE_IN_KB = 32   // Per event

tryAddContext(ctx: Context): Context | undefined {
  const eventSizeInKB = getSize(ctx.event)

  if (eventSizeInKB > MAX_EVENT_SIZE_IN_KB) {
    return ctx  // Overflow, rejected
  }

  this.contexts.push(ctx)
  return undefined
}
```

**Batch Size Validation:**
```typescript
MAX_BATCH_SIZE_IN_KB = 480  // Per batch

tryAddContext(ctx: Context): Context | undefined {
  const newSize = this.getSizeInKB() + eventSizeInKB

  if (newSize > MAX_BATCH_SIZE_IN_KB) {
    return ctx  // Overflow, send current batch first
  }

  this.contexts.push(ctx)
  return undefined
}
```

**Location:**
`/Users/abueide/code/analytics-next/packages/node/src/plugins/segmentio/context-batch.ts:37-71`

---

## 11. Key Architectural Decisions

### Design Principles

1. **Browser: Event-First Architecture**
   - Events (Contexts) are primary unit
   - Batches are ephemeral collections
   - Retry tracking per-event
   - Similar to React Native and Swift

2. **Node.js: Batch-First Architecture**
   - Batches are primary unit with stable IDs
   - Atomic batch retry
   - Similar to Kotlin

3. **Platform-Specific Concurrency:**
   - Browser: Single-threaded event loop
   - Node.js: Async/await with sequential batches

4. **Persistence Strategy:**
   - Browser: localStorage with mutex-protected writes
   - Node.js: No persistence (in-memory only)

5. **TAPI Compliance:**
   - Both platforms parse `x-ratelimit-reset`
   - Both use exponential backoff with jitter
   - Browser has more aggressive retries (10 vs 3)

### Trade-offs

**Browser Pros:**
✅ Persistent queue survives page refresh
✅ Per-event retry granularity
✅ Retry metadata sent to TAPI
✅ Offline support

**Browser Cons:**
❌ localStorage quota limitations
❌ No stable batch IDs
❌ Batch reformed on each retry
❌ Higher retry overhead

**Node.js Pros:**
✅ Stable batch IDs
✅ Atomic batch retry (simpler)
✅ Lower retry overhead
✅ No storage constraints

**Node.js Cons:**
❌ No persistence across restarts
❌ Single batch in flight (sequential)
❌ Application manages graceful shutdown

---

## 12. TAPI Implementation Feasibility

### Browser: Already TAPI-Compliant

**Current State:**
✅ Parses `x-ratelimit-reset` header
✅ Exponential backoff with jitter
✅ Max retry attempts configurable
✅ Retry metadata in payload
✅ 429 and 5xx handling

**Missing:**
❌ No stable batch IDs (not required by TAPI)
❌ No per-batch backoff state

**Implementation Effort:**
- **Global backoff:** Already implemented
- **Per-batch backoff:** N/A (no stable batch IDs)

**Recommendation:**
- Browser SDK is TAPI-compliant as-is
- No changes needed for TAPI alignment

### Node.js: Already TAPI-Compliant

**Current State:**
✅ Parses `x-ratelimit-reset` header
✅ Exponential backoff with jitter
✅ Max retry attempts configurable
✅ Stable batch IDs
✅ Atomic batch retry
✅ 429 and 5xx handling

**Missing:**
❌ No batch retry metadata in payload

**Implementation Effort:**
- **Global backoff:** Already implemented
- **Per-batch backoff:** Effectively implemented (atomic batch retry)

**Recommendation:**
- Node.js SDK is TAPI-compliant as-is
- Consider adding batch retry count to payload for observability

---

## 13. Critical Findings

### Architectural Patterns

**Browser (Event-First):**
- Mirrors React Native and Swift
- Events are persistence unit
- Batches ephemeral
- Per-event retry tracking

**Node.js (Batch-First):**
- Mirrors Kotlin
- Batches are primary unit
- Stable batch IDs
- Atomic batch retry

### TAPI Compliance

**Both platforms are TAPI-compliant:**
- ✅ Parse `x-ratelimit-reset` header
- ✅ Exponential backoff with jitter
- ✅ Max retry attempts
- ✅ 429 and 5xx handling

**Key Differences:**
- **Browser:** 10 max retries, per-event retry metadata
- **Node.js:** 3 max retries, atomic batch retry

### Cross-SDK Implications

1. **Browser + React Native + Swift:** Share event-first architecture
2. **Node.js + Kotlin:** Share batch-first architecture
3. **Platform vs Design:** Event-first not a platform constraint (Node.js proves batch-first viable in JS)
4. **TAPI Agnostic:** Both architectures can be TAPI-compliant

### Recommendations for React Native

**Based on JavaScript SDK findings:**

1. **TAPI implementation already exists in analytics-next** (both browser and Node.js)
2. **Browser SDK (event-first) has TAPI compliance** without stable batch IDs
3. **Node.js SDK (batch-first) has TAPI compliance** with stable batch IDs
4. **React Native can follow browser pattern:**
   - Keep event-first architecture
   - Implement global backoff (simpler)
   - Parse Retry-After headers
   - Add exponential backoff with jitter
   - ~50-100 LOC like Swift recommendation

**Key Insight:**
The JavaScript browser SDK proves that **event-first architecture CAN be TAPI-compliant** without per-batch backoff. This validates the global backoff approach for React Native.

---

## Summary

The analytics-next JavaScript SDK provides **two architectural patterns** in one repository:

**Browser (Event-First):**
- ✅ TAPI-compliant with global backoff
- ✅ Persistent queue (localStorage)
- ✅ Per-event retry metadata
- ✅ Offline support
- ❌ No stable batch IDs

**Node.js (Batch-First):**
- ✅ TAPI-compliant with atomic batch retry
- ✅ Stable batch IDs
- ✅ Simple retry logic
- ❌ No persistence
- ❌ No per-event retry metadata

**Key Takeaway:** Both architectures achieve TAPI compliance through **global backoff** (browser: per-event, Node.js: per-batch). This validates that **React Native can implement TAPI without refactoring to per-batch backoff**.
