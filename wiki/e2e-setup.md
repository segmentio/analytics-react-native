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
├── e2e-compat/                    # RN 0.72.9 + Old Arch
│   ├── App.tsx                    # Imports from e2e-shared
│   ├── devbox.json                # Devbox config
│   ├── e2e/main.e2e.js
│   └── ...
│
└── e2e-latest/                    # RN 0.84.1 + New Arch
    ├── App.tsx                    # Imports from e2e-shared
    ├── devbox.json                # Devbox config
    ├── e2e/main.e2e.js
    └── ...
```

## Running Tests

### With Devbox (recommended)

```bash
cd examples/e2e-compat  # or e2e-latest

# One-time setup
devbox run install
devbox run install:pods   # iOS only

# Build and test
devbox run build:ios
devbox run test:ios

devbox run build:android
devbox run test:android
```

### Without Devbox

```bash
cd examples/e2e-compat  # or e2e-latest

yarn install
cd ios && pod install && cd ..

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

## iOS Build Strategy

Both apps use a two-step iOS build process to avoid Metro resolution issues in the monorepo:

1. `SKIP_BUNDLING=1 xcodebuild ...` — builds the native binary without bundling JS
2. `react-native bundle ...` — creates the JS bundle and writes it directly into the .app

This avoids issues where `react-native-xcode.sh` fails to resolve the entry file from the monorepo root.

## Differences Between Apps

| Feature             | e2e-compat                 | e2e-latest                         |
| ------------------- | -------------------------- | ---------------------------------- |
| React Native        | 0.72.9                     | 0.84.1                             |
| Architecture        | Old (Bridge)               | New (Bridgeless)                   |
| Navigation          | @react-navigation/stack v6 | @react-navigation/native-stack v7  |
| Android autolinking | native_modules.gradle      | com.facebook.react.settings plugin |
| MainApplication     | Java                       | Kotlin                             |
| iOS arch            | universal                  | arm64 only                         |
| Xcode compat        | Xcode 16+                  | Xcode 26+ (with folly fix)         |
