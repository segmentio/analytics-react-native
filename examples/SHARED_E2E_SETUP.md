# Shared E2E Test Setup

This document explains the shared E2E test infrastructure for analytics-react-native.

## Overview

We use a shared test library (`examples/shared-e2e`) that both `E2E-compat` and `E2E-latest` apps consume. This eliminates test duplication and ensures both React Native versions are tested with identical logic.

## Architecture

```
examples/
├── shared-e2e/                    # Shared test library
│   ├── src/
│   │   ├── analyticsTests.js      # Main test suite
│   │   ├── matchers.js            # Custom Jest matchers
│   │   ├── mockServer.js          # Mock Segment API
│   │   └── index.js               # Exports
│   ├── package.json
│   └── README.md
│
├── E2E-compat/                    # RN 0.72.9 + React 18.3.1
│   ├── e2e/
│   │   ├── main.e2e.js            # Imports from shared-e2e
│   │   └── jest.config.js
│   ├── .detoxrc.js
│   └── package.json               # References shared-e2e
│
└── E2E-latest/                    # RN 0.84.1 + React 19.2.3
    ├── e2e/
    │   ├── main.e2e.js            # Imports from shared-e2e
    │   └── jest.config.js
    ├── .detoxrc.js
    └── package.json               # References shared-e2e
```

## Usage

### Running Tests

**E2E-compat (RN 0.72.9):**
```bash
cd examples/E2E-compat

# iOS
yarn build:ios
yarn test:ios

# Android
yarn build:android
yarn test:android
```

**E2E-latest (RN 0.84.1):**
```bash
cd examples/E2E-latest

# iOS
yarn build:ios
yarn test:ios

# Android
yarn build:android
yarn test:android
```

### How It Works

Both apps import the shared test suite:

```javascript
// examples/E2E-compat/e2e/main.e2e.js
import {runAnalyticsTests} from '../../shared-e2e/src';

runAnalyticsTests('AnalyticsReactNativeE2E');
```

```javascript
// examples/E2E-latest/e2e/main.e2e.js
import {runAnalyticsTests} from '../../shared-e2e/src';

runAnalyticsTests('AnalyticsReactNativeE2ELatest');
```

The `runAnalyticsTests()` function:
- Starts a mock Segment API server
- Runs all E2E test scenarios
- Validates analytics events
- Works across different RN versions

## Test Coverage

The shared test suite covers:

✅ **Lifecycle Events**
- Application Opened
- Application Installed

✅ **Core Methods**
- `track()` - Track custom events
- `screen()` - Screen views
- `identify()` - User identification
- `group()` - Group association
- `alias()` - User aliasing
- `reset()` - Reset user state

✅ **Advanced Features**
- Context data validation
- Data persistence across app restarts
- Network flush behavior
- Background/foreground transitions

## Adding New Tests

To add new tests that run on both RN versions:

1. **Edit shared test file:**
   ```bash
   vi examples/shared-e2e/src/analyticsTests.js
   ```

2. **Add your test:**
   ```javascript
   it('checks my new feature', async () => {
     // Test implementation
   });
   ```

3. **Run on both apps:**
   ```bash
   # Test on RN 0.72.9
   cd examples/E2E-compat && yarn test:ios

   # Test on RN 0.84.1
   cd examples/E2E-latest && yarn test:ios
   ```

## Custom Matchers

The shared library provides custom Jest matchers:

### `toHaveEvent(eventType)`
```javascript
expect(events).toHaveEvent('track');
```

### `toHaveEventWith(attributes)`
```javascript
expect(events).toHaveEventWith({
  type: 'track',
  event: 'Button Clicked',
  userId: 'user_123'
});
```

## Mock Server

The test suite includes a mock Segment API server:

- **Port:** 9091
- **Batch endpoint:** `POST /v1/b`
- **Settings endpoint:** `GET /v1/projects/yup/settings`

Configure apps to use the mock server:
```javascript
const client = createClient({
  writeKey: 'test-write-key',
  trackAppLifecycleEvents: true,
  proxy: 'http://localhost:9091',
});
```

## Troubleshooting

### Tests not finding shared-e2e

Run yarn install in the example app:
```bash
cd examples/E2E-compat  # or E2E-latest
yarn install
```

### Detox build fails

Clean and rebuild:
```bash
cd examples/E2E-compat
yarn clean
yarn install
yarn build:ios
```

### Mock server port conflict

The mock server uses port 9091. If blocked:
```bash
lsof -ti:9091 | xargs kill -9
```

## Benefits

✅ **No code duplication** - Write tests once, run on all RN versions
✅ **Consistent testing** - Same test logic across versions
✅ **Easy maintenance** - Update tests in one place
✅ **Version validation** - Proves SDK works on multiple RN versions
✅ **Clear separation** - Test logic separate from app code

## CI/CD Integration

GitHub Actions workflow:
```yaml
test-e2e:
  strategy:
    matrix:
      example: ['E2E-compat', 'E2E-latest']
  steps:
    - name: Run E2E tests
      run: |
        cd examples/${{ matrix.example }}
        yarn install
        yarn build:ios
        yarn test:ios
```

## Next Steps

1. ✅ Shared test library created
2. ✅ E2E-compat configured
3. ✅ E2E-latest configured
4. ⏳ Verify both apps run tests successfully
5. ⏳ Add to CI/CD pipeline
