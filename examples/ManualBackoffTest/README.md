# Manual TAPI Backoff Testing Guide

This guide helps you manually test the TAPI backoff and rate limiting implementation against the real Segment API.

## Overview

This test project allows you to validate:

- Real 429 responses from TAPI with Retry-After headers
- Exponential backoff behavior under production conditions
- State persistence across app restarts
- Authorization and X-Retry-Count headers
- Sequential batch processing

## Prerequisites

- A Segment writeKey for testing
- React Native environment set up (iOS or Android)
- Access to view events in your Segment source debugger

## Setup

### 1. Install Dependencies

```bash
cd examples/ManualBackoffTest
npm install
# iOS
cd ios && pod install && cd ..
# Android
# No additional steps needed
```

### 2. Configure Your WriteKey

Edit `App.tsx` and replace `YOUR_WRITE_KEY_HERE` with your actual Segment writeKey:

```typescript
const segment = createClient({
  writeKey: 'YOUR_WRITE_KEY_HERE',
  trackAppLifecycleEvents: true,
  debug: true, // Enable debug logging
});
```

### 3. Run the App

```bash
# iOS
npm run ios

# Android
npm run android
```

## Test Scenarios

### Test 1: Normal Upload (Baseline)

**Purpose:** Verify events upload successfully under normal conditions.

**Steps:**

1. Launch the app
2. Tap "Track Event" 5 times
3. Tap "Flush"
4. Check Segment debugger - should see 5 events + lifecycle events

**Expected Result:**

- ✅ Events appear in Segment debugger
- ✅ Console shows "Batch uploaded successfully"
- ✅ No errors

---

### Test 2: Trigger Rate Limiting (429)

**Purpose:** Trigger a 429 response from TAPI and verify rate limiting behavior.

**Steps:**

1. Tap "Spam Events" button (sends 100 events rapidly)
2. Tap "Flush Multiple Times" (attempts multiple flushes)
3. Watch console logs

**Expected Result:**

- ✅ Console shows "Rate limited (429): retry after Xs"
- ✅ Console shows "Upload blocked: rate limited, retry in Xs"
- ✅ Subsequent flush attempts are blocked
- ✅ After wait time, uploads resume

**Console Output to Look For:**

```
[INFO] Rate limited (429): waiting 60s before retry 1/100
[INFO] Upload blocked: rate limited, retry in 45s (retry 1/100)
[INFO] Upload state transitioned to READY
[INFO] Batch uploaded successfully (20 events)
```

---

### Test 3: State Persistence Across Restarts

**Purpose:** Verify rate limit state persists when app restarts.

**Steps:**

1. Trigger rate limiting (see Test 2)
2. **Immediately** close the app (don't wait for retry time)
3. Reopen the app
4. Tap "Flush"
5. Watch console

**Expected Result:**

- ✅ Upload is still blocked (state persisted)
- ✅ Console shows "Upload blocked: rate limited"
- ✅ After original wait time expires, uploads work again

---

### Test 4: Sequential Batch Processing

**Purpose:** Verify batches are processed sequentially when rate limited.

**Steps:**

1. Configure small batch size (tap "Set Small Batch Size")
2. Track 50 events
3. Trigger rate limiting
4. Watch network logs

**Expected Result:**

- ✅ Only 1 network request is made before halting
- ✅ Remaining batches are not sent
- ✅ Console shows halt after first 429

---

### Test 5: Exponential Backoff on Transient Errors

**Purpose:** Test per-batch exponential backoff (harder to test in production).

**Note:** This is difficult to trigger with real TAPI unless there's an outage. Best tested with E2E tests.

**Steps:**

1. If you encounter 5xx errors during testing, watch the console
2. Look for retry scheduling with increasing delays

**Expected Result:**

- ✅ Console shows "Batch X: retry 1/100 scheduled in 0.5s"
- ✅ Console shows "Batch X: retry 2/100 scheduled in 1.Xs" (exponentially increasing)
- ✅ Other batches continue processing (not halted)

---

### Test 6: Headers Verification

**Purpose:** Verify Authorization and X-Retry-Count headers are sent.

**Steps:**

1. Enable network debugging (Charles Proxy, Proxyman, or similar)
2. Track an event and flush
3. Inspect the network request to `api.segment.io/v1/b`

**Expected Result:**

- ✅ Header: `Authorization: Basic <base64 encoded writeKey>`
- ✅ Header: `X-Retry-Count: 0` (for first attempt)
- ✅ Header: `X-Retry-Count: 1` (for retries)

**How to Decode Authorization Header:**

```bash
# Should equal your writeKey followed by colon
echo "<base64_string>" | base64 -d
# Output: your_write_key:
```

---

### Test 7: Legacy Behavior (Disabled Config)

**Purpose:** Test that disabling httpConfig reverts to legacy behavior.

**Steps:**

1. In Segment workspace settings, configure httpConfig:

```json
{
  "httpConfig": {
    "rateLimitConfig": { "enabled": false },
    "backoffConfig": { "enabled": false }
  }
}
```

2. Restart app to fetch new settings
3. Trigger rate limiting
4. Attempt another flush immediately

**Expected Result:**

- ✅ No upload blocking occurs
- ✅ All batches are attempted on every flush
- ✅ No backoff delays

---

## Monitoring & Debugging

### Console Logs to Watch

**Rate Limiting:**

```
[INFO] Rate limited (429): waiting 60s before retry 1/100
[INFO] Upload blocked: rate limited, retry in 45s (retry 1/100)
[INFO] Upload state reset to READY
```

**Batch Retries:**

```
[INFO] Batch abc-123: retry 1/100 scheduled in 0.5s (status 500)
[WARN] Batch abc-123: max retry count exceeded (100), dropping batch
```

**Success:**

```
[INFO] Batch uploaded successfully (20 events)
```

**Permanent Errors:**

```
[WARN] Permanent error (400): dropping batch (20 events)
```

### Segment Debugger

Check your Segment debugger to verify:

- Events are being received
- No unexpected gaps in event delivery
- Event ordering is preserved

### AsyncStorage Inspection

**iOS:**

```bash
# Using Xcode
# Debug > Open System Log
# Filter for: uploadState, batchMetadata
```

**Android:**

```bash
adb shell
run-as com.your.package.name
cd files
ls | grep uploadState
cat <store-id>-uploadState
```

---

## Test Results Checklist

Use this checklist to track your testing progress:

- [ ] **Test 1:** Normal upload works ✅
- [ ] **Test 2:** 429 triggers rate limiting ✅
- [ ] **Test 3:** Rate limit state persists across restart ✅
- [ ] **Test 4:** Sequential batch processing verified ✅
- [ ] **Test 5:** Exponential backoff observed (if applicable) ✅
- [ ] **Test 6:** Headers verified (Authorization, X-Retry-Count) ✅
- [ ] **Test 7:** Legacy behavior works when disabled ✅

---

## Troubleshooting

### Issue: Can't Trigger 429

**Cause:** Not sending enough events or sending too slowly.

**Solution:** Use the "Spam Events" button which sends 100 events in rapid succession, then flush multiple times quickly.

### Issue: State Not Persisting

**Cause:** App not fully closing or persistor not configured.

**Solution:**

- Ensure you're force-closing the app (not just backgrounding)
- Check that `storePersistor` is configured in client setup
- Verify AsyncStorage is working

### Issue: No Logs Appearing

**Cause:** Debug mode not enabled.

**Solution:** Set `debug: true` in client config and enable React Native logs:

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

### Issue: Headers Not Visible in Network Inspector

**Cause:** HTTPS encryption.

**Solution:**

- Use a proxy tool (Charles, Proxyman) with SSL certificate installed
- Or add console.log in the uploadEvents function temporarily

---

## Advanced Testing

### Testing Max Retry Count

1. Modify `defaultHttpConfig` in your test app:

```typescript
httpConfig: {
  rateLimitConfig: {
    enabled: true,
    maxRetryCount: 3, // Lower for easier testing
    maxRetryInterval: 300,
    maxTotalBackoffDuration: 43200,
  }
}
```

2. Trigger 429 multiple times
3. Watch for "Max retry count exceeded" warning

### Testing Max Total Backoff Duration

1. Modify config to use short duration:

```typescript
httpConfig: {
  rateLimitConfig: {
    enabled: true,
    maxRetryCount: 100,
    maxRetryInterval: 300,
    maxTotalBackoffDuration: 10, // 10 seconds for testing
  }
}
```

2. Trigger 429
3. Wait 11 seconds
4. Attempt upload again
5. Should see "Max backoff duration exceeded" warning

---

## Reporting Issues

If you encounter unexpected behavior, please report with:

1. **Console logs** (full output from launch to issue)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Platform** (iOS/Android version)
5. **SDK version**
6. **Segment debugger screenshots**

Include logs like:

```
[INFO] Upload blocked: rate limited, retry in 45s (retry 1/100)
[WARN] Max retry count exceeded (3), resetting rate limiter
[ERROR] Failed to send 20 events.
```

---

## Next Steps

After manual validation:

1. Document any issues found
2. Verify metrics in production (429 rate, retry count, drop rate)
3. Tune configuration parameters based on real-world data
4. Monitor for 1-2 weeks during high-traffic periods
5. Adjust `maxRetryCount`, `maxBackoffInterval`, etc. as needed

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
