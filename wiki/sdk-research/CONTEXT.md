# Research Context & Current State

## Problem Statement

We're implementing TAPI (Tracking API) backoff handling in analytics-react-native. The SDD specifies **per-batch backoff** for transient errors (5xx), but our current implementation uses **global backoff**.

The user has raised valid concerns that global backoff is problematic:

1. **Bad event isolation:** One malformed event causing 400 shouldn't block all valid events
2. **Partial TAPI failures:** During flaky/slow conditions, some batches succeed while others fail with 503
3. **Resilience:** Per-batch tracking maximizes successful uploads during instability

However, before making TAPI-specific decisions, we need to understand the broader SDK landscape.

## Current Implementation Status (analytics-react-native)

### PR #1153: UploadStateMachine (Rate Limiting - 429)
- **Status:** Reviewed, improved, pushed ✅
- **Implementation:** Global (correct per SDD)
- **SDD Compliance:** 100%
- **Improvements:** Input validation, JSDoc, edge case tests

### PR #1152: BackoffManager (Transient Errors - 5xx)
- **Status:** Reviewed, CRITICAL BUG FIXED, pushed ✅
- **Implementation:** Global (DEVIATES from SDD)
- **SDD Compliance:** 100% (formula now correct)
- **Critical Fix:** Off-by-one in backoff formula (retry 1 was 1s, should be 0.5s)
- **Architectural Issue:** Global backoff instead of per-batch

### PR #1150: Error Classification & Defaults
- **Status:** Reviewed, improved, pushed ✅
- **SDD Compliance:** 100%
- **Improvements:** Negative validation, comprehensive tests (33 passing)

### PR #1151: Integration PR
- **Status:** CLOSED (keeping PRs separate for easier review)

## Research Scope Expansion

**Original scope:** Just TAPI backoff decision
**Expanded scope:** Full SDK architecture comparison

**Why?**
- Understanding overall design philosophies gives context for TAPI decisions
- May discover other inconsistencies or best practices
- Better cross-SDK alignment recommendations
- Informed by actual architectural constraints, not assumptions

## Research Questions

### General Architecture
1. How do different SDKs handle event queueing and batching?
2. What are platform-specific constraints vs design choices?
3. Where do SDKs align? Where do they diverge? Why?
4. What can each SDK learn from the others?

### TAPI-Specific
5. Do any SDKs already implement TAPI backoff?
6. How do SDK architectures enable/constrain per-batch backoff?
7. Should React Native match other SDKs or optimize for its platform?
8. What's the cost-benefit of different approaches?

## SDKs to Research

1. **React Native** - We know this well already, but document systematically
2. **Kotlin** - Android/JVM, coroutines, powerful background processing
3. **Swift** - iOS/macOS, GCD, app lifecycle constraints
4. **JavaScript** - Browser/Node, event loop, storage limitations

## Repositories

- React Native: https://github.com/segmentio/analytics-react-native (current working directory)
- Kotlin: https://github.com/segmentio/analytics-kotlin
- Swift: https://github.com/segmentio/analytics-swift (need to find correct repo)
- JavaScript: https://github.com/segmentio/analytics.js or analytics-next

## Research Workspace

All findings saved to: `~/code/sdk-research/`

**Structure:**
```
~/code/sdk-research/
├── RESEARCH_PLAN.md          (this execution plan)
├── CONTEXT.md                 (this file - problem context)
├── react-native-architecture.md
├── kotlin-architecture.md
├── swift-architecture.md
├── js-architecture.md
├── storage-comparison.md
├── concurrency-comparison.md
├── plugin-comparison.md
├── error-handling-comparison.md
├── architecture-differences-categorized.md
├── best-practices-synthesis.md
├── design-philosophy-analysis.md
├── tapi-backoff-architecture-analysis.md
├── react-native-tapi-recommendation.md
├── cross-sdk-tapi-strategy.md
└── EXECUTIVE_SUMMARY.md
```

## Next Steps

1. Execute Phase 1: Deep dive each SDK architecture (general, not TAPI-focused)
2. Execute Phase 2: Analyze patterns, differences, best practices
3. Execute Phase 3: Apply findings to TAPI decision
4. Present recommendations with full justification

## Session Management

Due to large scope, will save progress frequently. Can resume from any checkpoint by reading saved markdown files.
