# E2E Testing Guide

## Running Tests

### Release Builds (Fast, Production-Like) - Default
```bash
# iOS
yarn build:ios && yarn test:ios

# Android
yarn build:android && yarn test:android
```

### Debug Builds with Verbose Logging
Use `E2E_DEBUG=1` to enable debug builds and trace-level logging:

```bash
# iOS - enables debug build + trace logging
E2E_DEBUG=1 yarn build:ios && E2E_DEBUG=1 yarn test:ios

# Android - enables debug build + trace logging
E2E_DEBUG=1 yarn build:android && E2E_DEBUG=1 yarn test:android

# Or set it once for multiple commands
export E2E_DEBUG=1
yarn build:ios && yarn test:ios
```

## Viewing Logs

### 1. Test Artifacts (Automatic)
After tests run, logs are automatically saved in `./artifacts/`:

```bash
# Find the latest test artifacts
ls -lt artifacts/ | head -5

# View device logs for a specific test
cat "artifacts/<timestamp>/<test-name>/device.log"

# View Detox framework logs
cat "artifacts/<timestamp>/detox.log"
```

### 2. Real-Time Simulator Logs (iOS)

**Stream all app logs:**
```bash
# Get the booted simulator ID
xcrun simctl list devices | grep Booted

# Stream logs for the app
xcrun simctl spawn booted log stream --level debug --style compact \
  --predicate 'process == "AnalyticsReactNativeE2E"'
```

**JavaScript logs only:**
```bash
xcrun simctl spawn booted log stream --level debug --style compact \
  --predicate 'subsystem == "com.facebook.react.log"'
```

**Detox synchronization logs:**
```bash
xcrun simctl spawn booted log stream --level debug --style compact \
  --predicate "category=='SyncManager'"
```

### 3. Real-Time Android Logs

```bash
# View all JavaScript logs
adb logcat | grep "ReactNativeJS"

# View specific tags
adb logcat -s "AnalyticsReactNativeE2E:*" "ReactNativeJS:*"
```

### 4. Detox Log Levels

`E2E_DEBUG=1` automatically sets Detox to `trace` level for maximum verbosity:
- Synchronization details
- Network activity
- Detailed test execution flow

Manual control:
```bash
yarn test:ios --loglevel trace
# Levels: fatal, error, warn, info (default), debug, trace
```

## Debugging Specific Tests

**Recommended setup for debugging:**

```bash
# Terminal 1: Start Metro bundler
yarn start

# Terminal 2: Run test with debug mode
E2E_DEBUG=1 yarn test:ios --testNamePattern="your test name"

# Terminal 3: Stream simulator logs
xcrun simctl spawn booted log stream --level debug --style compact \
  --predicate 'process == "AnalyticsReactNativeE2E"'
```

## Understanding Console.log Output

**In Test Code (Jest):**
- `console.log()` in test files appears in Jest terminal output
- Set `verbose: true` in `jest.config.js` for real-time output

**In App Code (React Native):**
- **Release builds:** `console.log()` is stripped for performance
- **Debug builds:** `console.log()` preserved and visible in logs
- **Alternative:** Use `console.warn()` or `console.error()` (less likely to be stripped)

## Debugging Synchronization Issues

Enable verbose sync logging in your test:

```javascript
await device.launchApp({
  newInstance: true,
  launchArgs: {
    'DTXEnableVerboseSyncSystem': 'YES',
    'DTXEnableVerboseSyncResources': 'YES'
  }
});
```

Then view sync logs:
```bash
xcrun simctl spawn booted log stream --level debug --style compact \
  --predicate "category=='SyncManager'"
```

## Integration with Devbox

```bash
E2E_DEBUG=1 devbox run test-e2e-ios
```

## Best Practices

1. **Use Release Builds for CI/CD** - Faster and more stable
2. **Use Debug Builds for Development** - Full logging for debugging
3. **Always run Metro bundler first** - Required for both debug and release
4. **Stream logs in separate terminal** - Real-time visibility
5. **Check artifacts after tests** - Comprehensive log history
6. **Use --loglevel trace** - Maximum Detox visibility when debugging
