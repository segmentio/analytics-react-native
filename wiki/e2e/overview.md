# Example Apps

This directory contains end-to-end test applications for `@segment/analytics-react-native`.

## Apps

| Directory                     | RN Version | Architecture     | Purpose                                                       |
| ----------------------------- | ---------- | ---------------- | ------------------------------------------------------------- |
| [`e2e-compat`](./e2e-compat/) | 0.72.9     | Old (Bridge)     | Compatibility testing against the oldest supported RN version |
| [`e2e-latest`](./e2e-latest/) | 0.84.1     | New (Bridgeless) | Testing against the latest RN with New Architecture           |
| [`e2e-shared`](./e2e-shared/) | -          | -                | Shared app source, test suites, and mock server               |

## Devbox

Both apps use [Devbox](https://www.jetify.com/devbox/) for reproducible builds. Devbox manages Node.js, JDK, Android SDK, and build tools via Nix, with the [`mobile-devtools`](https://github.com/segment-integrations/mobile-devtools) plugin providing emulator/simulator management.

### First-time setup

```bash
# Install devbox (if not already installed)
curl -fsSL https://get.jetify.com/devbox | bash

# From either example directory:
cd examples/e2e-compat  # or e2e-latest

devbox run install
devbox run install:pods   # iOS only
```

### Building and running

```bash
# Build release artifacts
devbox run build:android
devbox run build:ios

# Deploy to emulator/simulator (starts device if needed)
devbox run start:android
devbox run start:ios

# Run E2E tests
devbox run test:android
devbox run test:ios
```

### Plugin-provided scripts

The `mobile-devtools` plugin provides additional commands:

| Script               | Description            |
| -------------------- | ---------------------- |
| `start:emu [device]` | Start Android emulator |
| `stop:emu`           | Stop Android emulator  |
| `start:sim [device]` | Start iOS simulator    |
| `stop:sim`           | Stop iOS simulator     |

### Environment variables

Both apps configure the build environment via `devbox.json` `env` section:

| Variable                      | e2e-compat | e2e-latest |
| ----------------------------- | ---------- | ---------- |
| `ANDROID_COMPILE_SDK`         | 33         | 36         |
| `ANDROID_TARGET_SDK`          | 33         | 36         |
| `ANDROID_BUILD_TOOLS_VERSION` | 36.1.0     | 36.1.0     |
| `CMAKE_VERSION`               | -          | 4.1.2      |

## Shared App Source

The [`e2e-shared`](./e2e-shared/) package contains:

- **App components** (`src/app/`): `Home`, `SecondPage`, `Modal` screens and the Segment client configuration
- **Test suites** (`src/analyticsTests.js`): Detox E2E tests shared between both apps
- **Mock server** (`src/mockServer.js`): Local mock of the Segment API for offline testing
- **Custom matchers** (`src/matchers.js`): Jest matchers for analytics assertions

Both example apps import from `e2e-shared` via the `@segment/analytics-react-native-e2e-tests` package reference.

## CI

The GitHub Actions workflow (`.github/workflows/e2e-mobile.yml`) runs E2E tests for both apps on push. See the workflow file for runner and device configuration details.
