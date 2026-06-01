# Shared E2E Package

This package contains shared E2E tests and the common app source code for analytics-react-native example apps. Both `e2e-compat` and `e2e-latest` consume this to avoid code duplication.

## Structure

```
e2e-shared/
├── src/
│   ├── app/                   # Shared app source
│   │   ├── Home.tsx           # Main screen with settings, actions, stats
│   │   ├── SecondPage.tsx     # Navigation test page
│   │   ├── Modal.tsx          # Modal navigation test
│   │   ├── client.ts          # Analytics client management
│   │   ├── plugins/Logger.ts  # Event tracking plugin
│   │   └── index.ts           # Re-exports
│   ├── analyticsTests.js      # Main test suite
│   ├── matchers.js            # Custom Jest matchers
│   ├── mockServer.js          # Mock Segment API server
│   └── index.js               # Test exports
└── package.json
```

## Usage

### App Source

Both example apps import the shared UI components and client:

```typescript
// examples/e2e-latest/App.tsx (or e2e-compat)
import {
  Home,
  SecondPage,
  Modal,
  segmentClient,
  onClientChange,
} from '../e2e-shared/src/app';
```

### E2E Tests

```javascript
// examples/e2e-latest/e2e/main.e2e.js
import { runAnalyticsTests } from '../../e2e-shared/src';

runAnalyticsTests('AnalyticsReactNativeE2ELatest');
```

## Mock Server

- Port: 9091
- Batch endpoint: `POST /v1/b`
- Settings endpoint: `GET /v1/projects/yup/settings`

## Cross-Version Compatibility

- React Native 0.72.x (e2e-compat)
- React Native 0.84.x (e2e-latest)
- React 18.x and React 19.x
