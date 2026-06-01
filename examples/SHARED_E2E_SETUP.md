# Shared E2E Test Setup

This document explains the shared E2E test infrastructure for analytics-react-native.

## Architecture

```
examples/
├── e2e-shared/                    # Shared test library + app source
│   ├── src/
│   │   ├── app/                   # Shared app components & client
│   │   │   ├── Home.tsx
│   │   │   ├── SecondPage.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── client.ts
│   │   │   ├── plugins/Logger.ts
│   │   │   └── index.ts
│   │   ├── analyticsTests.js      # Main test suite
│   │   ├── matchers.js            # Custom Jest matchers
│   │   ├── mockServer.js          # Mock Segment API
│   │   └── index.js               # Exports
│   └── package.json
│
├── e2e-compat/                    # RN 0.72.9 + React 18.2
│   ├── App.tsx                    # Imports from e2e-shared
│   ├── e2e/main.e2e.js
│   └── ...
│
└── e2e-latest/                    # RN 0.84.1 + React 19.2.3
    ├── App.tsx                    # Imports from e2e-shared
    ├── e2e/main.e2e.js
    └── ...
```

## Running Tests

```bash
cd examples/e2e-compat  # or e2e-latest

# iOS
yarn build:ios
yarn test:ios

# Android
yarn build:android
yarn test:android
```

## Adding New Tests

Edit `examples/e2e-shared/src/analyticsTests.js` and both apps will pick up the changes automatically.

## Mock Server

- Port: 9091
- Batch: `POST /v1/b`
- Settings: `GET /v1/projects/yup/settings`
