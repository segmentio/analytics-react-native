# Cross-SDK Architecture Research: Executive Summary

**Research Period:** 2026-03-06
**Purpose:** Comprehensive architectural analysis of all Segment SDKs to inform TAPI backoff implementation strategy for React Native

---

## Table of Contents

1. [Research Overview](#1-research-overview)
2. [Critical Findings](#2-critical-findings)
3. [Architectural Patterns Discovered](#3-architectural-patterns-discovered)
4. [TAPI Compliance Status](#4-tapi-compliance-status)
5. [React Native TAPI Recommendation](#5-react-native-tapi-recommendation)
6. [Implementation Roadmap](#6-implementation-roadmap)
7. [Cross-SDK Opportunities](#7-cross-sdk-opportunities)

---

## 1. Research Overview

### Scope

**SDKs Analyzed:**
1. analytics-react-native (TypeScript)
2. analytics-kotlin (Kotlin)
3. analytics-swift (Swift)
4. analytics-next (JavaScript - Browser & Node.js)

**Areas Examined:**
- Event lifecycle and processing
- Storage and persistence
- Batch identity and tracking
- Concurrency models
- Plugin architecture
- Error handling and retry logic
- TAPI compliance

### Research Deliverables

**Individual SDK Analyses:**
- `react-native-architecture.md` (15 sections, ~600 lines)
- `kotlin-architecture.md` (13 sections, ~650 lines)
- `swift-architecture.md` (13 sections, ~550 lines)
- `js-architecture.md` (13 sections for both Browser & Node.js, ~700 lines)

**Cross-SDK Comparisons:**
- `storage-comparison.md` - Persistence mechanisms and batch identity
- `concurrency-comparison.md` - Threading and parallel execution
- `plugin-comparison.md` - Plugin systems and extensibility
- `error-handling-comparison.md` - Retry logic and TAPI compliance

**Total Documentation:** ~3,500 lines of detailed architectural analysis

---

## 2. Critical Findings

### Finding #1: JavaScript SDKs Prove Global Backoff Is TAPI-Compliant

**Discovery:**
- ✅ **JS Browser SDK:** Event-first architecture + global backoff = **TAPI-compliant**
- ✅ **JS Node.js SDK:** Batch-first architecture + atomic batch retry = **TAPI-compliant**

**Implication:**
Both architectural patterns (event-first and batch-first) can achieve TAPI compliance. Per-batch backoff is NOT required.

**Validation:**
```
JS Browser:
  - Event-first (events stored, batches ephemeral)
  - Global backoff (blocks all uploads during rate limit)
  - Exponential backoff with jitter
  - Retry-After header parsing
  - Production-tested at scale (millions of websites)
  - ✅ FULLY TAPI-COMPLIANT
```

**This invalidates the assumption that per-batch backoff is necessary for TAPI compliance.**

---

### Finding #2: React Native Has Complete TAPI Infrastructure (But Not Integrated)

**What Exists:**
```typescript
✅ BackoffManager           // Exponential backoff with jitter
✅ UploadStateMachine       // Rate limit window tracking
✅ classifyError()          // Error classification
✅ parseRetryAfter()        // Header parsing
✅ Configurable overrides   // Status code behavior
✅ Persistent state         // Survives app restart
```

**What's Missing:**
```typescript
❌ Integration into SegmentDestination.sendEvents()
❌ Calls to BackoffManager.canRetry()
❌ Calls to UploadStateMachine.canUpload()
❌ HTTP status code inspection
❌ Retry-After header extraction
```

**Implication:**
React Native is ~50-100 lines of code away from TAPI compliance. The hard work is done; only integration is needed.

---

### Finding #3: Plugin Architecture Is Highly Consistent (Best Practice Model)

**Consistency Across All SDKs:**
- ✅ Same 5 plugin types (before, enrichment, destination, after, utility)
- ✅ Same execution order
- ✅ Same destination plugin isolation
- ✅ Same error handling patterns
- ✅ Cross-platform documentation works

**Why This Matters:**
Plugin architecture proves that cross-SDK consistency is achievable. Other areas (storage, concurrency, error handling) could benefit from similar standardization.

---

### Finding #4: Mobile SDKs Lack TAPI, But Telemetry Has It

**Kotlin & Swift:**
```
Event Uploads:
  ❌ No Retry-After parsing
  ❌ No exponential backoff
  ❌ No rate limit detection
  ❌ Immediate retry on failure

Telemetry:
  ✅ Retry-After parsing
  ✅ Rate limit window tracking
  ✅ Skip sends during rate limit
```

**Implication:**
The code exists but wasn't copied to the main event pipeline. TAPI implementation would involve copy-pasting telemetry logic to event uploads.

---

### Finding #5: Storage Architecture Drives Backoff Strategy

**Event-First SDKs (React Native, Swift, JS Browser):**
- Events stored individually
- Batches formed on-demand
- No stable batch IDs
- **Natural fit for global backoff**

**Batch-First SDKs (Kotlin, JS Node.js):**
- Events grouped into batches immediately
- Batch files/objects persist
- Stable batch IDs
- **Natural fit for per-batch backoff**

**Key Insight:**
Architecture pattern dictates optimal backoff strategy, NOT platform constraints.

---

## 3. Architectural Patterns Discovered

### Pattern #1: Event-First vs Batch-First

| Pattern | SDKs | Storage Unit | Batch Identity | Backoff Natural Fit |
|---------|------|--------------|----------------|---------------------|
| **Event-First** | React Native, Swift, JS Browser | Individual events | None (ephemeral) | Global |
| **Batch-First** | Kotlin, JS Node.js | Batch files/objects | Stable IDs | Per-batch |

**Event-First Flow:**
```
track() → Store event → [Later] Flush
  → Read events from storage
  → Chunk into batches
  → Upload batches (ephemeral)
  → Delete events on success
```

**Batch-First Flow:**
```
track() → Add to current batch → Batch full?
  → Finalize batch file (stable ID)
  → Upload batch
  → Delete batch file on success
```

### Pattern #2: Parallel vs Sequential Uploads

| Strategy | SDKs | Concurrency | Throughput | Complexity |
|----------|------|-------------|------------|------------|
| **Parallel** | React Native, JS Browser | Unbounded | High | Medium |
| **Sequential** | Kotlin, Swift, JS Node.js | 1 at a time | Low | Simple |

**Recommendation:**
Parallel uploads should have configurable limits (e.g., max 3-5 concurrent). React Native currently has unbounded parallelism, which could overwhelm servers during retry storms.

### Pattern #3: Modern vs Legacy Concurrency

| Model | SDKs | Async Pattern | Benefits | Drawbacks |
|-------|------|---------------|----------|-----------|
| **Modern** | React Native, Kotlin, JavaScript | async/await, coroutines | Clean code, easy error handling | None |
| **Legacy** | Swift | GCD callbacks | Fine-grained control | Callback complexity |

**Recommendation:**
Swift should migrate to Swift Concurrency (async/await) when iOS 15+ is minimum target. Until then, GCD is acceptable.

---

## 4. TAPI Compliance Status

### Compliance Matrix

| SDK | Status | 429 Detection | Retry-After | Exponential Backoff | Jitter | Max Retries |
|-----|--------|---------------|-------------|---------------------|--------|-------------|
| **React Native** | ⚠️ **Partial** | ✅ Infrastructure | ✅ parseRetryAfter() | ✅ BackoffManager | ✅ 10% | ✅ 100 |
| **Kotlin** | ❌ **No** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ Unbounded |
| **Swift** | ❌ **No** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ Unbounded |
| **JS Browser** | ✅ **Yes** | ✅ RateLimitError | ✅ x-ratelimit-reset | ✅ backoff() | ✅ 100% | ✅ 10 |
| **JS Node.js** | ✅ **Yes** | ✅ Status check | ✅ x-ratelimit-reset | ✅ backoff() | ✅ 100% | ✅ 3 |

### React Native Gap Analysis

**Infrastructure Complete (PRs #1150-1153):**
```typescript
// errors.ts
✅ classifyError(statusCode, config): ErrorClassification
✅ parseRetryAfter(header, maxInterval): number

// BackoffManager.ts
✅ canRetry(errorType): Promise<boolean>
✅ handleTransientError(): Promise<void>
✅ calculateBackoff(retryCount): number

// UploadStateMachine.ts
✅ canUpload(): Promise<boolean>
✅ handle429(retryAfterSeconds): Promise<void>

// constants.ts
✅ defaultHttpConfig with all settings
```

**Integration Needed (SegmentDestination.ts):**
```typescript
❌ Check backoff state before sending
❌ Check rate limit state before sending
❌ Classify HTTP errors after response
❌ Parse Retry-After header from response
❌ Call handle429() or handleTransientError()
❌ Dequeue events on permanent errors
```

**Lines of Code Required:** ~50-100

---

## 5. React Native TAPI Recommendation

### **Recommendation: Implement Global Backoff (Follow JS Browser Pattern)**

**Rationale:**

1. **Proven Pattern:**
   - JS Browser SDK is TAPI-compliant with global backoff
   - Production-tested at scale (millions of deployments)
   - Event-first architecture matches React Native

2. **Infrastructure Ready:**
   - BackoffManager and UploadStateMachine already exist
   - Just need integration into SegmentDestination
   - ~50-100 LOC to complete

3. **Architectural Fit:**
   - React Native is event-first (like JS Browser)
   - No stable batch IDs (like JS Browser)
   - Global backoff natural choice

4. **Per-Batch Backoff Would Require:**
   - Major refactoring (~300-400 LOC)
   - Batch metadata tracking
   - File-based batch persistence
   - Complex state management
   - **Not justified given JS Browser validation**

### Implementation Plan

**Phase 1: Integration (1-2 days)**

```typescript
// SegmentDestination.ts modifications

async sendEvents(): Promise<void> {
    // STEP 1: Check backoff state
    if (!await this.backoffManager.canRetry('transient')) {
        this.logger.info('Skipping upload due to backoff')
        return
    }

    // STEP 2: Check rate limit state
    if (!await this.uploadStateMachine.canUpload()) {
        this.logger.info('Skipping upload due to rate limit')
        return
    }

    // STEP 3: Send batches (existing logic)
    const batches = chunk(events, ...)
    await Promise.all(batches.map(async (batch) => {
        try {
            const response = await uploadEvents(batch)

            // STEP 4: Classify error
            if (response.status !== 200) {
                const classification = classifyError(response.status, this.config)

                // STEP 5: Handle based on classification
                if (classification.errorType === 'rate_limit') {
                    const retryAfter = parseRetryAfter(
                        response.headers['Retry-After'],
                        this.config.maxRetryInterval
                    )
                    await this.uploadStateMachine.handle429(retryAfter || 60)
                } else if (classification.errorType === 'transient') {
                    await this.backoffManager.handleTransientError()
                } else if (classification.errorType === 'permanent') {
                    this.dequeue(batch)  // Drop permanently
                }

                throw new Error(`Upload failed: ${response.status}`)
            }

            // STEP 6: Success - dequeue events
            this.dequeue(batch)

        } catch (error) {
            this.logger.error('Upload error:', error)
            // Events remain in queue for retry
        }
    }))
}
```

**Phase 2: Testing (1-2 days)**
- Unit tests for 429 handling
- Unit tests for 5xx backoff
- Integration tests for retry progression
- Test persistent state across app restarts

**Phase 3: Documentation (1 day)**
- Document configuration options
- Add examples to README
- Document TAPI compliance

**Total Effort: 3-5 days**

---

## 6. Implementation Roadmap

### Immediate Priority: React Native TAPI Integration

**Week 1:**
- ✅ Research complete (this document)
- [ ] Integrate TAPI infrastructure into SegmentDestination
- [ ] Write integration tests

**Week 2:**
- [ ] Test 429 and 5xx scenarios
- [ ] Test persistent state
- [ ] Document configuration

**Week 3:**
- [ ] Code review
- [ ] Merge PR
- [ ] Release

### Medium Priority: Kotlin & Swift TAPI Implementation

**Kotlin (Weeks 4-6):**
1. Copy telemetry rate limiting to EventPipeline
2. Implement BackoffManager (similar to React Native)
3. Add max retry count
4. Test and document

**Swift (Weeks 4-6):**
1. Copy telemetry rate limiting to SegmentDestination
2. Implement BackoffManager (similar to React Native)
3. Add max retry count
4. Test and document

**Estimated Effort per SDK:** 2-3 days development + 1-2 days testing

### Long-Term: Cross-SDK Standardization

**Goals:**
1. Standardize configuration across all SDKs
2. Standardize retry behavior
3. Standardize error classification
4. Document cross-SDK consistency

**Timeline:** 6-12 months

---

## 7. Cross-SDK Opportunities

### Opportunity #1: Standardized Configuration

**Current State:**
- Each SDK has different config options
- Inconsistent naming
- Inconsistent defaults

**Recommendation:**
```typescript
// Standardize across all SDKs
interface HttpConfiguration {
    rateLimitConfig: {
        enabled: boolean              // Default: true
        maxRetryCount: number         // Default: 100
        maxRetryInterval: number      // Default: 300s
        maxRateLimitDuration: number  // Default: 43200s (12h)
    }
    backoffConfig: {
        enabled: boolean              // Default: true
        maxRetryCount: number         // Default: 100
        baseBackoffInterval: number   // Default: 0.5s
        maxBackoffInterval: number    // Default: 300s
        maxTotalBackoffDuration: number // Default: 43200s (12h)
        jitterPercent: number         // Default: 10
        default4xxBehavior: 'retry' | 'drop'  // Default: drop
        default5xxBehavior: 'retry' | 'drop'  // Default: retry
        statusCodeOverrides: Record<string, 'retry' | 'drop'>
    }
}
```

### Opportunity #2: Queue Cleanup Strategy

**Current State:**
- Most SDKs lack automatic cleanup
- Failed events/batches accumulate unbounded
- Risk of storage exhaustion

**Recommendation:**
```typescript
// Add to all SDKs
interface QueueConfig {
    maxQueueSize: number        // Default: 10000 events
    maxEventAge: number         // Default: 7 days
    cleanupInterval: number     // Default: 1 hour
}

// Automatic cleanup logic:
function cleanupQueue() {
    const now = Date.now()

    // Remove old events
    const recentEvents = events.filter(e =>
        now - e._queuedAt < maxEventAge
    )

    // FIFO if over limit
    if (recentEvents.length > maxQueueSize) {
        const dropped = recentEvents.length - maxQueueSize
        logger.warn(`Dropped ${dropped} events due to queue overflow`)
        return recentEvents.slice(-maxQueueSize)
    }

    return recentEvents
}
```

### Opportunity #3: Upload Concurrency Limits

**Current State:**
- React Native: Unbounded parallel uploads
- Others: Sequential (1 at a time)

**Recommendation:**
```typescript
// Add to all parallel upload SDKs
interface UploadConfig {
    maxConcurrentUploads: number  // Default: 3-5
    uploadTimeout: number          // Default: 10s
}

// Implementation:
async function uploadBatchesWithLimit(batches: Batch[]) {
    const results = []
    for (let i = 0; i < batches.length; i += maxConcurrentUploads) {
        const chunk = batches.slice(i, i + maxConcurrentUploads)
        const chunkResults = await Promise.all(chunk.map(uploadBatch))
        results.push(...chunkResults)
    }
    return results
}
```

### Opportunity #4: Observability & Metrics

**Current State:**
- Limited visibility into retry behavior
- No metrics for backoff state
- Hard to debug production issues

**Recommendation:**
```typescript
// Add metrics to all SDKs
interface RetryMetrics {
    totalRetries: number
    retriesByStatusCode: Record<number, number>
    currentBackoffEndTime: number
    currentRateLimitEndTime: number
    droppedEventCount: number
    queueSize: number
}

// Expose via analytics instance:
analytics.getRetryMetrics(): RetryMetrics
```

---

## Final Recommendations

### For React Native Team

**Immediate Action (This Sprint):**
1. ✅ Review this research
2. [ ] Integrate TAPI infrastructure (~50-100 LOC)
3. [ ] Test 429 and 5xx scenarios
4. [ ] Document configuration
5. [ ] Merge and release

**Why Now:**
- Infrastructure already exists (PRs #1150-1153)
- JS Browser validates the approach
- Only integration needed
- Users need TAPI compliance

**Don't Do:**
- ❌ Refactor to per-batch backoff (not needed)
- ❌ Refactor storage layer (not needed)
- ❌ Wait for "perfect solution" (good enough exists)

### For Kotlin Team

**High Priority (Next Quarter):**
1. Copy telemetry rate limiting to event uploads
2. Implement exponential backoff
3. Add max retry count
4. Test and release

### For Swift Team

**High Priority (Next Quarter):**
1. Copy telemetry rate limiting to event uploads
2. Implement exponential backoff
3. Add max retry count
4. Test and release

### For All Teams

**Long-Term (6-12 months):**
1. Standardize configuration across SDKs
2. Add queue cleanup logic
3. Add upload concurrency limits
4. Add observability/metrics
5. Document cross-SDK consistency

---

## Conclusion

### Key Takeaways

1. **JavaScript Browser SDK validates global backoff approach** ✅
   - Event-first + global backoff = TAPI-compliant
   - Production-proven at scale
   - React Native should follow this pattern

2. **React Native is 50-100 LOC from TAPI compliance** ⚠️
   - Infrastructure exists (PRs #1150-1153)
   - Just needs integration
   - Highest priority action item

3. **Per-batch backoff NOT required** ✅
   - Both global and per-batch work
   - Choose based on architecture
   - React Native: event-first → global backoff

4. **Plugin architecture is exemplary** ✅
   - Most consistent pattern across SDKs
   - Model for other features
   - Proves cross-SDK consistency possible

5. **Mobile SDKs need TAPI implementation** ❌
   - Kotlin and Swift lack compliance
   - Telemetry code can be reused
   - Medium priority (after React Native)

### Research Impact

**Confidence in Recommendation:**
- **High** - Based on comprehensive analysis of 4 SDKs, 8 architectural areas, ~3,500 lines of documentation
- **Validated** - JavaScript browser SDK proves the approach works
- **Practical** - Implementation effort is minimal (~50-100 LOC)

**Decision Made:**
React Native should implement **global backoff** following the JavaScript browser SDK pattern. Per-batch backoff refactoring is NOT justified.

**Next Steps:**
1. Review this research with team
2. Approve global backoff approach
3. Integrate TAPI infrastructure
4. Ship TAPI-compliant React Native SDK

---

**Research Complete: 2026-03-06**
**Recommendation: Global Backoff (Follow JS Browser Pattern)**
**Implementation Effort: ~50-100 LOC + testing**
**Timeline: 3-5 days**
