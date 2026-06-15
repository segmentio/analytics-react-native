# Devbox

This repo uses [Devbox](https://www.jetify.com/devbox/) for reproducible builds. Each example app has its own `devbox.json` that pins Node.js, JDK, and build tools via Nix, with the [`mobile-devtools`](https://github.com/segment-integrations/mobile-devtools) plugin providing emulator/simulator management.

The root `devbox.json` is for library development only (linting, building, testing, releasing). E2E builds and device management live in the per-app configs.

## Getting started

1. Install Devbox: https://www.jetify.com/devbox/docs/installing_devbox/
2. Navigate to an example app directory:
   ```bash
   cd examples/e2e-compat  # or e2e-latest
   ```
3. Run commands via `devbox run`:
   ```bash
   devbox run install
   devbox run install:pods   # iOS only
   devbox run build:android
   devbox run build:ios
   ```

## Per-app configuration

Each example app's `devbox.json` defines:

- **Packages**: Node.js, Yarn, JDK, and optional extras (watchman, etc.)
- **Plugin**: `mobile-devtools` from `github:segment-integrations/mobile-devtools?dir=plugins/react-native&ref=main`
- **Environment variables**: SDK versions, artifact paths, cmake version
- **Scripts**: `install`, `install:pods`, `build:android`, `build:ios`, `test:android`, `test:ios`

### Plugin-provided scripts

The `mobile-devtools` plugin adds device management commands:

| Script               | Description                 |
| -------------------- | --------------------------- |
| `start:emu [device]` | Start Android emulator      |
| `stop:emu`           | Stop Android emulator       |
| `start:sim [device]` | Start iOS simulator         |
| `stop:sim`           | Stop iOS simulator          |
| `start:android`      | Build + deploy to emulator  |
| `start:ios`          | Build + deploy to simulator |

## Root devbox.json

The root config is for library development and CI:

| Script          | Description                           |
| --------------- | ------------------------------------- |
| `build`         | Build all packages                    |
| `test`          | Run unit tests                        |
| `lint`          | Run ESLint                            |
| `typecheck`     | Run TypeScript type checking          |
| `format`        | Format with prettier                  |
| `release`       | Publish packages via semantic-release |
| `sync-versions` | Sync package.json versions with npm   |

## iOS build notes

Both example apps use a two-step iOS build to avoid Metro resolution issues in the monorepo:

1. `RCT_NO_LAUNCH_PACKAGER=1 SKIP_BUNDLING=1 xcodebuild ...` — builds native binary without bundling JS or spawning Metro
2. `react-native bundle ...` — creates the JS bundle directly into the .app

`RCT_NO_LAUNCH_PACKAGER=1` prevents the Xcode "Start Packager" build phase from opening a Metro terminal during release builds.

## Android build notes

- `e2e-compat` (RN 0.72): Standard `./gradlew assembleRelease`
- `e2e-latest` (RN 0.84): Runs `generateCodegenArtifactsFromSchema --rerun-tasks` before assembly (required for New Architecture)
