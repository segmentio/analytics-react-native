# TAPI Backoff Testing Guide

Complete guide for testing the TAPI backoff and rate limiting implementation.

## Testing Layers

This implementation has three layers of testing:

```
┌─────────────────────────────────────────────────┐
│  1. Unit Tests (Automated)                      │
│     ✅ Error classification                     │
│     ✅ State machine logic                      │
│     ✅ Exponential backoff calculations         │
│     ✅ Header generation                        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  2. E2E Tests with Mock Server (Automated)      │
│     ✅ 429 rate limiting flow                   │
│     ✅ Sequential batch processing              │
│     ✅ State persistence across restarts        │
│     ✅ Header verification                      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  3. Manual Production Tests (Manual)            │
│     ✅ Real TAPI 429 responses                  │
│     ✅ Production network conditions            │
│     ✅ Real device testing                      │
│     ✅ Settings CDN integration                 │
└─────────────────────────────────────────────────┘
```

---

## 1. Unit Tests (Automated)

**Location:** `/packages/core/src/__tests__/` and `/packages/core/src/backoff/__tests__/`

**Run:**

```bash
cd packages/core
npm test
```

**Coverage:**

- ✅ 35 error classification tests
- ✅ 12 state machine tests
- ✅ 23 batch manager tests
- ✅ 13 integration tests

**What It Tests:**

- All HTTP status code classifications (429, 5xx, 4xx)
- Retry-After header parsing (seconds and HTTP dates)
- State transitions (READY ↔ WAITING)
- Exponential backoff calculations with jitter
- Max retry count and duration enforcement
- Authorization and X-Retry-Count headers

**Run Specific Test Suites:**

```bash
# Error classification
npm test -- errors.test

# State machine
npm test -- UploadStateMachine.test

# Batch manager
npm test -- BatchUploadManager.test

# Integration
npm test -- SegmentDestination.test
```

---

## 2. E2E Tests with Mock Server (Automated)

**Location:** `/examples/E2E/e2e/backoff.e2e.js`

**Note:** This project maintains two E2E environments:

- `/examples/E2E` - Primary E2E testing environment (React Native 0.72.9)
- `/examples/E2E-73` - RN 0.73 compatibility testing

Use `E2E` for primary development and CI/CD testing. Use `E2E-73` for validating React Native 0.73 compatibility before major releases.

**Run:**

```bash
cd examples/E2E

# iOS
npm run test:e2e:ios

# Android
npm run test:e2e:android
```

**What It Tests:**

- 429 halts upload loop immediately
- Future uploads blocked until retry time passes
- State resets after successful upload
- Transient errors (500) don't halt upload loop
- Permanent errors (400) drop batches
- Sequential batch processing (not parallel)
- Authorization and X-Retry-Count headers
- State persistence across app restarts

**Mock Server Behaviors:**

The mock server can simulate various TAPI responses:

```javascript
setMockBehavior('success'); // 200 OK
setMockBehavior('rate-limit', { retryAfter: 10 }); // 429
setMockBehavior('timeout'); // 408
setMockBehavior('bad-request'); // 400
setMockBehavior('server-error'); // 500
setMockBehavior('custom', customHandler); // Custom logic
```

**Key Test Cases:**

1. **429 Upload Halt:**

   - Sends multiple batches
   - Mock returns 429 on first batch
   - Verifies only 1 network call made

2. **Upload Gate Blocking:**

   - Triggers 429
   - Attempts immediate flush
   - Verifies no network call (blocked)

3. **State Persistence:**

   - Triggers 429 with 30s retry
   - Restarts app
   - Attempts flush
   - Verifies still blocked

4. **Sequential Processing:**
   - Tracks time between batch requests
   - Verifies no parallel execution

---

## 3. Manual Production Tests (Manual)

**Location:** `/examples/ManualBackoffTest/`

**Purpose:** Validate against real TAPI with your Segment account.

### Quick Start

```bash
cd examples/ManualBackoffTest

# 1. Install dependencies
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android

# 2. Edit App.tsx and add your writeKey
# 3. Run the app
# 4. Follow test procedures in ProductionValidation.md
```

### Test Scenarios

The manual test app includes buttons to:

- **Track Event** - Track single events
- **Spam Events (100)** - Create 100 events to trigger rate limiting
- **Flush Multiple Times (5x)** - Rapid flush attempts
- **Test Sequential Batches** - Create multiple batches to verify sequential processing
- **Reset Client** - Clear all state

### Documentation

- **[README.md](../examples/ManualBackoffTest/README.md)** - Setup and test scenarios
- **[ProductionValidation.md](../examples/ManualBackoffTest/ProductionValidation.md)** - Detailed test plan with checklist

### When to Use Manual Tests

Use manual tests to validate:

1. **Pre-production:** Before enabling in Settings CDN
2. **Staging:** With staging environment
3. **Production validation:** With 1% canary rollout
4. **Post-incident:** After any TAPI outages to verify behavior
5. **Configuration tuning:** When adjusting retry parameters

---

## Test Execution Workflow

### Phase 1: Development (Before PR Merge)

```bash
# Run unit tests
cd packages/core
npm test

# Fix any failures
# Achieve 95%+ passing rate
```

**Exit Criteria:** All unit tests passing.

---

### Phase 2: E2E Validation (Before PR Merge)

```bash
# Run E2E tests
cd examples/E2E
npm run test:e2e:ios
npm run test:e2e:android

# Fix any failures
```

**Exit Criteria:** All E2E tests passing on both platforms.

---

### Phase 3: Manual Testing (After PR Merge, Before Settings CDN)

```bash
# Build and run manual test app
cd examples/ManualBackoffTest
npm install
npm run ios

# Execute all test scenarios from ProductionValidation.md
# Document results in test execution log
```

**Exit Criteria:**

- All critical tests (T1-T5, T8-T9) pass
- Test execution log completed
- No blockers identified

---

### Phase 4: Staging Validation (Before Production)

1. Deploy to staging environment
2. Run full manual test suite
3. Monitor logs for 24 hours
4. Review metrics

**Exit Criteria:**

- No errors in staging
- Metrics look healthy
- Team approval

---

### Phase 5: Production Canary (1% of users)

1. Enable in Settings CDN for 1% of users
2. Monitor metrics for 48 hours
3. Watch for:
   - Event delivery success rate
   - 429 response rate
   - Client errors
   - Drop rates

**Exit Criteria:**

- No increase in event loss
- No increase in client errors
- 429 rate same or better

---

### Phase 6: Full Production Rollout

1. Increase to 10% → 50% → 100% over 1 week
2. Monitor at each stage
3. Watch for first high-traffic event

**Success Metrics:**

- 50%+ reduction in 429 during high-traffic
- No increase in event loss
- Positive operations feedback

---

## Test Coverage Summary

| Layer          | Test Type                  | Count   | Status             |
| -------------- | -------------------------- | ------- | ------------------ |
| Unit           | Error classification       | 31      | ✅ Passing         |
| Unit           | API headers                | 4       | ✅ Passing         |
| Unit           | State machine              | 12      | ✅ Passing         |
| Unit           | Batch manager              | 23      | ✅ Passing         |
| Unit           | Integration                | 13      | ✅ Passing         |
| **Unit Total** |                            | **83**  | **✅ All Passing** |
| E2E            | Core backoff tests         | 20      | ✅ Implemented     |
| E2E            | Status code coverage       | 17      | ✅ New             |
| E2E            | Real persistence tests     | 11      | ✅ New             |
| E2E            | Retry-After parsing        | 3       | ✅ New             |
| E2E            | X-Retry-Count edge cases   | 2       | ✅ New             |
| E2E            | Exponential backoff verify | 1       | ✅ New             |
| E2E            | Concurrent processing      | 1       | ✅ New             |
| **E2E Total**  |                            | **55**  | **✅ Complete**    |
| Manual         | Production validation      | 11      | 🟡 Ready           |
| **Total**      |                            | **149** | **✅**             |

### E2E Test Files

- `examples/E2E/e2e/backoff.e2e.js` - Core backoff tests (325 → 550 lines, +8 new tests)
- `examples/E2E/e2e/backoff-status-codes.e2e.js` - HTTP status code tests (291 lines, 17 tests)
- `examples/E2E/e2e/backoff-persistence.e2e.js` - Persistence tests (355 lines, 11 tests)
- `examples/E2E/e2e/main.e2e.js` - General SDK tests (existing)

---

## CI/CD Integration

### Automated Test Gates

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: cd packages/core && npm test

- name: Run E2E Tests
  run: cd examples/E2E && npm run test:e2e:ios

- name: Check Test Coverage
  run: npm test -- --coverage --coverageThreshold='{"global":{"statements":80}}'
```

### Pre-Merge Requirements

- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] TypeScript compilation successful
- [ ] Linting passes
- [ ] Code review approved

### Pre-Production Requirements

- [ ] All automated tests passing
- [ ] Manual test execution log completed
- [ ] Staging validation completed
- [ ] Monitoring dashboards configured
- [ ] Rollback plan documented

---

## References

- [TAPI Backoff SDD](./tapi-backoff-sdd.md) - Original specification
- [Implementation Plan](./tapi-backoff-plan.md) - Step-by-step implementation
- [Developer Summary](./tapi-summary.md) - Quick reference
- [Manual Test README](../examples/ManualBackoffTest/README.md) - Setup guide
- [Production Validation](../examples/ManualBackoffTest/ProductionValidation.md) - Test plan

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
