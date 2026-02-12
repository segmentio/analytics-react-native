# E2E Testing Guide

## Running Tests

### Release Builds (Fast, No Logs)
```bash
# iOS
yarn build:ios && yarn test:ios

# Android  
yarn build:android && yarn test:android
```

### Debug Builds (Slower, Console.log Works)
```bash
# iOS - use this for debugging
yarn build:ios:debug && yarn test:ios:debug

# Android - use this for debugging
yarn build:android:debug && yarn test:android:debug
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
yarn build:ios:debug
yarn test:ios:debug --testNamePattern="your test name"
```

The device.log will contain all console.log output from the app.
