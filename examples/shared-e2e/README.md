# Shared E2E Tests

This package contains shared E2E tests for analytics-react-native example apps. It allows both `E2E-compat` and `E2E-latest` to run the same test suite without code duplication.

## Structure

```
shared-e2e/
├── src/
│   ├── analyticsTests.js  # Main test suite
│   ├── matchers.js        # Custom Jest matchers
│   ├── mockServer.js      # Mock Segment API server
│   └── index.js           # Exports
├── package.json
└── README.md
```

## Usage in Example Apps

### E2E-compat

```javascript
// examples/E2E-compat/e2e/main.e2e.js
import {runAnalyticsTests} from '../../shared-e2e/src';

runAnalyticsTests('AnalyticsReactNativeE2ECompat');
```

### E2E-latest

```javascript
// examples/E2E-latest/e2e/main.e2e.js
import {runAnalyticsTests} from '../../shared-e2e/src';

runAnalyticsTests('AnalyticsReactNativeE2ELatest');
```

## Test Coverage

The shared test suite covers:

- ✅ SDK initialization and lifecycle events
- ✅ Track events
- ✅ Screen events
- ✅ Identify calls
- ✅ Group calls
- ✅ Alias calls
- ✅ Reset functionality
- ✅ Context data validation
- ✅ Data persistence across app restarts
- ✅ Network flush behavior

## Mock Server

The test suite includes a mock Segment API server (`mockServer.js`) that:

- Listens on port 9091
- Handles batch event uploads (`POST /v1/b`)
- Handles settings requests (`GET /v1/projects/yup/settings`)
- Captures all requests for test assertions

## Custom Matchers

Provides custom Jest matchers for cleaner test assertions:

### `toHaveEvent(eventType)`
Checks if events array contains an event of a specific type.

```javascript
expect(events).toHaveEvent('track');
```

### `toHaveEventWith(attributes)`
Checks if events array contains an event with specific attributes.

```javascript
expect(events).toHaveEventWith({
  type: 'track',
  event: 'Button Clicked'
});
```

## Requirements

- Detox 20.17.0+
- Express 4.20.0+
- Body-parser 1.20.0+

## Development

When adding new tests:

1. Add test to `analyticsTests.js`
2. Export any new utilities from `index.js`
3. Update this README with test coverage

## Cross-Version Compatibility

These tests are designed to work across different React Native versions:

- React Native 0.72.x (E2E-compat)
- React Native 0.84.x (E2E-latest)
- React 18.x and React 19.x
