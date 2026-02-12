# E2E Test Logging - Findings & Action Plan

## Current Status

### ✅ **What's Working:**
- Metro bundler runs successfully on port 8081
- Release builds work perfectly
- Tests run to completion (11/21 tests passing)
- App launches and connects to Detox properly

### ❌ **Logging Issues:**

**Release Builds (Currently Used):**
- ✅ Tests work correctly
- ❌ console.log statements are stripped at compile time
- ❌ Cannot see [UPLOAD_GATE] or [UploadStateMachine] debug logs
- Result: **No app-side logs available**

**Debug Builds (Tested):**
- ✅ console.log statements preserved
- ❌ App launches but Detox can't connect ("can't seem to connect to the test app(s)")
- ❌ All tests fail (27/27 failed vs 11/21 passing in release)
- ❌ Device logs are empty (0 bytes)
- Result: **Debug builds don't work with Detox**

## Root Cause

**Debug Build Connection Issue:**
The app launches successfully but Detox client fails to establish connection. This could be:
1. Timing issue - debug builds are slower, connection times out
2. Detox client compatibility issue with debug builds
3. React Native debugging interfering with Detox protocol

## Diagnostic Evidence

From the failing test:
```
Mock server logs show:
1. First flush  → Returns 429 ✅
2. Second flush → Returns 429 ❌ (should be blocked!)
```

We KNOW the rate limiting isn't working, but without logs we can't see WHY.

## Options Forward

### Option 1: Fix Debug Build + Detox Connection (Best for Debugging)
**Pros:** Get full console.log output for debugging
**Cons:** Need to diagnose Detox connection issue
**Actions:**
- Increase Detox timeouts for debug builds
- Check if React Native debugger conflicts
- Test with simple `yarn test:ios` (no filter) in debug mode

### Option 2: Use Mock Server Logs Only (Current Approach)
**Pros:** Already working, simple
**Cons:** Limited visibility, can only see HTTP requests/responses
**Status:** **CURRENTLY VIABLE** - We can diagnose the rate limit issue from mock server logs alone

### Option 3: Add Test-Specific Logging
**Pros:** Works in release builds
**Cons:** Need to modify code, adds test-specific code to production
**Actions:**
- Add logging that survives release builds (native logs, file logs)
- Use React Native's console.warn (less likely to be stripped)

### Option 4: Analyze Code Without Logs
**Pros:** No infrastructure changes needed
**Cons:** Harder to debug, more guessing
**Status:** **VIABLE** - We have good evidence from mock server logs + can review code

## Recommendation

**Proceed with Option 2 + Option 4:**
1. Use mock server logs to diagnose (we can see the HTTP pattern clearly)
2. Review code logic for Sovran store dispatch/state persistence
3. Add targeted fixes based on code review
4. Verify fixes work via mock server logs

The mock server logs clearly show the second upload isn't being blocked. We can:
- Review UploadStateMachine.handle429() and canUpload() code
- Check if store.dispatch() completes before next call
- Verify AsyncStorage persistence is working
- Test fixes and confirm via mock server request pattern

**Debug builds can be fixed later** for future debugging needs.

## Next Actions

1. ✅ Document findings (this file)
2. Review Sovran store dispatch implementation
3. Identify async/timing issue in rate limiting
4. Implement fix
5. Verify via mock server logs (no app logs needed)
