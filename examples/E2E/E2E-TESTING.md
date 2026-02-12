# E2E Testing Guide

## Running Tests

### Release Builds (Fast, No Logs) - Default
```bash
# iOS
yarn build:ios && yarn test:ios

# Android
yarn build:android && yarn test:android
```

### Debug Builds (Slower, Console.log Works)
Use `E2E_DEBUG=1` to enable debug builds:

```bash
# iOS - use this for debugging
E2E_DEBUG=1 yarn build:ios && E2E_DEBUG=1 yarn test:ios

# Android - use this for debugging
E2E_DEBUG=1 yarn build:android && E2E_DEBUG=1 yarn test:android

# Or set it once for multiple commands
export E2E_DEBUG=1
yarn build:ios && yarn test:ios
```

## Why Use Debug Builds?

**Release builds:**
- ✅ Faster execution
- ✅ Production-like performance
- ❌ console.log is stripped out (can't see app logs)

**Debug builds:**
- ✅ console.log works (see all app logs in artifacts)
- ✅ Better for debugging test failures
- ❌ Slower to build and run

## Viewing Logs

After tests run, logs are saved in `./artifacts/`:

```bash
# Find the latest test artifacts
ls -lt artifacts/ | head -5

# View device logs for a specific test
cat "artifacts/<timestamp>/✗ <test-name>/device.log"
```

## Debugging Specific Tests

Run a single test with debug build:
```bash
export E2E_DEBUG=1
yarn build:ios
yarn test:ios --testNamePattern="your test name"
```

The device.log in artifacts will contain all console.log output from the app.

## Integration with Devbox

When running via devbox, set the environment variable:
```bash
E2E_DEBUG=1 devbox run test-e2e-ios
```
