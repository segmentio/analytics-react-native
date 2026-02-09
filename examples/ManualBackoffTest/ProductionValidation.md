# Production Validation Test Plan

This document provides a systematic approach to validating TAPI backoff behavior in production.

## Test Environment Setup

### Required Tools

1. **Network Inspector** (choose one):
   - [Proxyman](https://proxyman.io/) (Mac)
   - [Charles Proxy](https://www.charlesproxy.com/)
   - React Native Debugger with Network tab

2. **Console Access**:
   ```bash
   # iOS
   npx react-native log-ios

   # Android
   npx react-native log-android
   ```

3. **Segment Debugger**: https://app.segment.com/[your-workspace]/sources/[your-source]/debugger

---

## Test Plan Matrix

| Test ID | Scenario | Expected Behavior | Status | Notes |
|---------|----------|-------------------|--------|-------|
| T1 | Normal upload | 200 OK, events appear in debugger | ☐ | Baseline |
| T2 | Trigger 429 | Upload halts, rate limiting active | ☐ | |
| T3 | 429 retry after wait | Upload resumes after Retry-After | ☐ | |
| T4 | State persistence | Rate limit persists across restart | ☐ | |
| T5 | Sequential batches | Only 1 batch sent on 429 | ☐ | |
| T6 | Transient error (5xx) | Per-batch retry, others continue | ☐ | Hard to trigger |
| T7 | Permanent error (400) | Batch dropped, no retry | ☐ | Hard to trigger |
| T8 | Authorization header | Header present and valid | ☐ | |
| T9 | X-Retry-Count header | Starts at 0, increments on retry | ☐ | |
| T10 | Max retry count | Drops after limit | ☐ | Requires config change |
| T11 | Legacy disabled | No rate limiting when disabled | ☐ | Requires Settings CDN |

---

## Detailed Test Procedures

### T1: Baseline Normal Upload ✅

**Objective:** Verify basic functionality works before testing edge cases.

**Steps:**
1. Clean install the app
2. Track 5 events via "Track Event" button
3. Tap "Flush"
4. Check Segment debugger

**Validation:**
- [ ] Events appear in Segment debugger within 1 minute
- [ ] Console shows: `Batch uploaded successfully (X events)`
- [ ] No errors in console
- [ ] Events have correct properties and context

**Network Validation:**
```
Request: POST https://api.segment.io/v1/b
Status: 200 OK
Headers:
  - Authorization: Basic <base64>
  - X-Retry-Count: 0
  - Content-Type: application/json
Body:
  - batch: [array of events]
  - writeKey: <your-key>
  - sentAt: <timestamp>
```

---

### T2: Trigger 429 Rate Limiting ⚠️

**Objective:** Trigger a real 429 response from TAPI.

**Steps:**
1. Tap "Spam Events (100)" to create 100 events
2. Tap "Flush Multiple Times (5x)" rapidly
3. Watch console for rate limiting messages

**Validation:**
- [ ] Console shows: `Rate limited (429): retry after Xs`
- [ ] Console shows: `Upload blocked: rate limited, retry in Xs`
- [ ] Network inspector shows 429 response with Retry-After header
- [ ] Subsequent flush attempts show "Upload blocked" (no network call)

**Expected Console Output:**
```
🔄 Manual Flush #1
[INFO] Batch uploaded successfully (10 events)
🔄 Manual Flush #2
[INFO] Batch uploaded successfully (10 events)
🔄 Manual Flush #3
[WARN] Rate limited (429): retry after 60s
[INFO] Upload blocked: rate limited, retry in 59s (retry 1/100)
🔄 Manual Flush #4
[INFO] Upload blocked: rate limited, retry in 58s (retry 1/100)
```

**Note:** If you can't trigger 429, the API is not currently under load. This is normal and indicates healthy API performance.

---

### T3: Retry After Wait Period ⏱️

**Objective:** Verify uploads resume after Retry-After period.

**Prerequisites:** Complete T2 (in rate limited state).

**Steps:**
1. Note the "retry in Xs" value from console
2. Wait for X seconds to pass
3. Tap "Flush"
4. Watch console and network

**Validation:**
- [ ] After wait time: Console shows `Upload state transitioned to READY`
- [ ] Flush succeeds with 200 OK
- [ ] Console shows: `Batch uploaded successfully`
- [ ] Events appear in Segment debugger

---

### T4: State Persistence Across Restart 💾

**Objective:** Verify rate limit state persists when app restarts.

**Prerequisites:** Complete T2 (in rate limited state with significant wait time remaining).

**Steps:**
1. After triggering 429 with 60s Retry-After
2. **Immediately** force-close the app (don't wait)
3. Reopen the app
4. Tap "Flush"
5. Watch console

**Validation:**
- [ ] Console still shows: `Upload blocked: rate limited, retry in ~Xs`
- [ ] No network request made
- [ ] Wait time continues from where it left off
- [ ] After wait expires, uploads work

**AsyncStorage Verification (Advanced):**

iOS:
```bash
# View persisted state
xcrun simctl get_app_container booted com.manualbackofftest data
cd Documents/RCTAsyncLocalStorage*
cat manifest.json | jq 'keys'
# Look for keys like: writeKey-uploadState, writeKey-batchMetadata
```

Android:
```bash
adb shell
run-as com.manualbackofftest
cd files
ls | grep -E "uploadState|batchMetadata"
cat <filename>
```

---

### T5: Sequential Batch Processing 🔢

**Objective:** Verify batches are processed sequentially, and 429 halts immediately.

**Steps:**
1. Tap "Test Sequential Batches (50 events)"
2. Immediately tap "Flush Multiple Times (5x)" to try to trigger 429
3. Watch network inspector during flush

**Validation:**
- [ ] Network requests appear one at a time (not parallel)
- [ ] If 429 occurs, only 1 request is made before halting
- [ ] Console shows batch numbers being processed sequentially
- [ ] Time gap between requests indicates sequential processing

**Network Inspector Timeline:**
```
Time    Request
0ms     POST /v1/b (batch 1) - 200 OK
150ms   POST /v1/b (batch 2) - 200 OK
300ms   POST /v1/b (batch 3) - 429
        (no more requests - halted)
```

---

### T6: Transient Error Recovery 🔄

**Objective:** Test exponential backoff on 5xx errors.

**Note:** This is difficult to trigger in production without a TAPI outage.

**Alternative Testing:**
- Use E2E tests with mock server
- Monitor during known TAPI incidents
- Use staging environment with simulated failures

**If You Encounter 5xx Errors:**

**Validation:**
- [ ] Console shows: `Batch X: retry 1/100 scheduled in 0.5s (status 500)`
- [ ] Retry delays increase: 0.5s, 1s, 2s, 4s, 8s...
- [ ] Other batches continue processing (not halted)
- [ ] After max retries, batch is dropped

---

### T8: Authorization Header Verification 🔐

**Objective:** Verify Authorization header is sent correctly.

**Steps:**
1. Enable network inspector with SSL decryption
2. Track an event and flush
3. Inspect the request to `api.segment.io/v1/b`

**Validation:**
- [ ] Header present: `Authorization: Basic <base64>`
- [ ] Decode base64: `echo "<base64>" | base64 -d`
- [ ] Result should be: `your_write_key:`
- [ ] Request body still contains `writeKey` field (backwards compatibility)

**Example:**
```
Authorization: Basic bXlfd3JpdGVfa2V5Og==
Decoded: my_write_key:
```

---

### T9: X-Retry-Count Header Tracking 🔢

**Objective:** Verify retry count is tracked and sent correctly.

**Steps:**
1. Enable network inspector
2. Track event and flush (should see X-Retry-Count: 0)
3. Trigger 429
4. Wait for retry period
5. Flush again (should see X-Retry-Count: 1)

**Validation:**
- [ ] First request: `X-Retry-Count: 0`
- [ ] After 429 retry: `X-Retry-Count: 1`
- [ ] After another 429 retry: `X-Retry-Count: 2`
- [ ] After success: Next request resets to `X-Retry-Count: 0`

---

### T10: Max Retry Count Enforcement 🛑

**Objective:** Verify batches are dropped after max retry count.

**Setup:** Modify your local build to use lower maxRetryCount:

```typescript
// In your test app setup
const segment = createClient({
  writeKey: 'YOUR_KEY',
  // ... other config
});

// After initialization, you can test by triggering many 429s
// The SDK will log warnings when max retry is reached
```

**Steps:**
1. Configure max retry count = 3 (see README for config)
2. Trigger 429 repeatedly (4+ times)
3. Watch console

**Validation:**
- [ ] After 3 retries: Console shows `Max retry count exceeded (3), resetting rate limiter`
- [ ] State resets to READY
- [ ] New uploads work immediately

---

### T11: Legacy Behavior (Disabled Config) 🔄

**Objective:** Verify disabling httpConfig reverts to legacy behavior.

**Prerequisites:** Access to Settings CDN configuration.

**Steps:**
1. Update Settings CDN to disable httpConfig:
```json
{
  "httpConfig": {
    "rateLimitConfig": { "enabled": false },
    "backoffConfig": { "enabled": false }
  }
}
```
2. Restart app (fetch new settings)
3. Trigger 429
4. Immediately try to flush again

**Validation:**
- [ ] 429 does not block future uploads
- [ ] No "Upload blocked" messages in console
- [ ] No exponential backoff delays
- [ ] No batches dropped due to retry limits
- [ ] Behaves like pre-backoff SDK version

---

## Production Monitoring

### Metrics to Track

After deploying to production, monitor these metrics:

1. **429 Response Rate**
   - Baseline before feature
   - After feature enabled
   - Goal: Significant reduction during high-traffic events

2. **Event Delivery Success Rate**
   - Should remain stable or improve
   - No increase in dropped events

3. **Average Retry Count**
   - Most events: 0 retries
   - During incidents: < 10 retries on average
   - Very few reaching max retry limit

4. **Upload Latency**
   - P50, P95, P99 latency metrics
   - Should not degrade significantly
   - Sequential processing adds minimal overhead

### Log Analysis Queries

**Rate Limiting Events:**
```
"Rate limited (429)" | count by retry_count
"Upload blocked" | count over time
"Max retry count exceeded" | count
```

**Success Metrics:**
```
"Batch uploaded successfully" | count over time
"Upload state reset to READY" | count
```

**Error Patterns:**
```
"Permanent error" | count by status_code
"dropping batch" | count
"Failed to send" | count
```

---

## Test Execution Log Template

Use this template to document your testing:

```
## Test Execution: [Date]

**Tester:** [Your Name]
**SDK Version:** 2.22.0
**Platform:** iOS 17.0 / Android 13
**Segment WriteKey:** [workspace/source]

### Test Results

#### T1: Normal Upload
- Status: ✅ PASS / ❌ FAIL
- Notes:

#### T2: Trigger 429
- Status: ✅ PASS / ❌ FAIL
- Retry-After value: 60s
- Notes:

#### T3: 429 Retry After Wait
- Status: ✅ PASS / ❌ FAIL
- Wait time: 60s
- Notes:

#### T4: State Persistence
- Status: ✅ PASS / ❌ FAIL
- Notes:

#### T5: Sequential Batches
- Status: ✅ PASS / ❌ FAIL
- Notes:

#### T8: Authorization Header
- Status: ✅ PASS / ❌ FAIL
- Base64 decoded correctly: Yes/No
- Notes:

#### T9: X-Retry-Count
- Status: ✅ PASS / ❌ FAIL
- Values observed: 0, 1, 2...
- Notes:

### Issues Encountered

1. [Issue description]
   - Steps to reproduce
   - Expected vs actual
   - Console logs
   - Screenshots

### Screenshots

[Attach relevant screenshots]

### Console Logs

```
[Paste relevant console output]
```

### Network Logs

```
[Paste relevant network requests/responses]
```

### Summary

- Tests Passed: X/11
- Tests Failed: X/11
- Tests Skipped: X/11 (with reason)

**Overall Result:** ✅ READY FOR PRODUCTION / ⚠️ NEEDS FIXES / ❌ NOT READY

**Recommendations:**
- [Any configuration tuning needed]
- [Any fixes required]
- [Rollout strategy suggestions]
```

---

## Quick Reference Commands

### View AsyncStorage (iOS Simulator)

```bash
# Find the app's data directory
xcrun simctl get_app_container booted com.manualbackofftest data

# Navigate to AsyncStorage
cd <path-from-above>/Documents/RCTAsyncLocalStorage*

# List keys
cat manifest.json | jq 'keys'

# View specific key
cat <key-file-name>
```

### View AsyncStorage (Android Emulator)

```bash
# Enter app container
adb shell
run-as com.manualbackofftest

# List files
ls files/

# View upload state
cat files/RCTAsyncLocalStorage_V1/<writeKey>-uploadState

# View batch metadata
cat files/RCTAsyncLocalStorage_V1/<writeKey>-batchMetadata
```

### Decode Authorization Header

```bash
# From network inspector, copy the base64 part after "Basic "
echo "bXlfd3JpdGVfa2V5Og==" | base64 -d
# Should output: my_write_key:
```

### Monitor Logs in Real-Time

```bash
# iOS - filter for backoff logs
npx react-native log-ios | grep -E "(Rate limited|Upload blocked|Batch.*retry)"

# Android - filter for backoff logs
npx react-native log-android | grep -E "(Rate limited|Upload blocked|Batch.*retry)"
```

---

## Simulating High-Traffic Scenarios

### Scenario 1: Holiday Traffic Spike

**Goal:** Simulate Black Friday / Super Bowl traffic patterns.

**Approach:**
```typescript
// In your test app
const simulateTrafficSpike = async () => {
  for (let i = 0; i < 10; i++) {
    // Send 50 events
    for (let j = 0; j < 50; j++) {
      track('High Traffic Event', {spike: i, event: j});
    }

    // Flush
    await flush();

    // Short delay between flushes
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};
```

**Expected Behavior:**
- Eventually triggers 429 from TAPI
- Upload gate blocks subsequent attempts
- After Retry-After period, uploads resume
- No events are lost (may be delayed)

### Scenario 2: Poor Network Connection

**Goal:** Simulate slow client with intermittent connectivity.

**Approach:**
- Enable network throttling in iOS Simulator / Android Emulator
- Settings > Developer > Network > Slow 3G
- Track events and flush repeatedly

**Expected Behavior:**
- Timeouts may occur (408)
- Exponential backoff applied per-batch
- Other batches continue
- Eventually succeeds or drops after max duration

---

## Troubleshooting Production Issues

### Issue: No 429 Responses

**Possible Causes:**
- TAPI is healthy (good!)
- Not sending enough events
- Sending events too slowly

**Solution:**
- Use "Spam Events" + "Flush Multiple Times"
- Coordinate with team during known high-traffic period
- This is expected behavior during normal load

### Issue: Events Not Appearing in Debugger

**Possible Causes:**
- Rate limiting is blocking uploads
- Network connectivity issues
- writeKey is invalid

**Debug Steps:**
1. Check console for "Upload blocked" messages
2. Check for "Rate limited (429)" messages
3. Verify network connectivity
4. Check writeKey is correct in config

### Issue: Too Many Events Dropped

**Possible Causes:**
- maxRetryCount too low
- maxTotalBackoffDuration too short
- Many permanent errors (400s)

**Solution:**
1. Review console for "dropping batch" warnings
2. Check status codes causing drops
3. Increase maxRetryCount if needed
4. Investigate permanent errors (bad data?)

### Issue: State Not Persisting

**Possible Causes:**
- storePersistor not configured
- AsyncStorage not working
- App not fully closing

**Debug Steps:**
1. Check client config has storePersistor
2. Verify AsyncStorage is available
3. Use adb/xcrun to inspect storage (see commands above)
4. Force-close app (not just background)

---

## Production Rollout Checklist

Before enabling in production:

- [ ] All manual tests passed (T1-T11)
- [ ] Verified on both iOS and Android
- [ ] Tested on real device (not just simulator)
- [ ] Network inspector confirms headers are correct
- [ ] State persistence verified
- [ ] No performance degradation observed
- [ ] Team reviewed test results
- [ ] Monitoring dashboards configured
- [ ] Rollback plan documented

### Rollout Plan

**Week 1: Canary (1% of users)**
- Deploy with `enabled: true` in Settings CDN
- Monitor for issues
- Watch for increased drop rates
- Check 429 frequency

**Week 2: Gradual Rollout (10% → 50% → 100%)**
- Increase percentage if no issues
- Monitor metrics at each stage
- Roll back if problems detected

**Week 3: High-Traffic Event**
- Monitor during first major event (holiday, sports)
- Verify 429 reduction
- Check event delivery success rate

### Success Criteria

- ✅ 50%+ reduction in 429 responses during high-traffic
- ✅ No increase in event loss rate
- ✅ No increase in client-side errors
- ✅ Positive feedback from operations team
- ✅ No performance regressions

---

## Contact

For issues or questions during testing:
- File issue: https://github.com/segmentio/analytics-react-native/issues
- Reference PR: https://github.com/segmentio/analytics-react-native/pull/[PR_NUMBER]

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
