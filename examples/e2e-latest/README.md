# e2e-latest

End-to-end test app running **React Native 0.84.1** with the **New Architecture** (Fabric, TurboModules, bridgeless mode).

| Stack              | Version                     |
| ------------------ | --------------------------- |
| React Native       | 0.84.1                      |
| React              | 19.2.3                      |
| Hermes             | enabled                     |
| New Architecture   | enabled (bridgeless)        |
| Gradle             | 9.3.1 (wrapper)             |
| Kotlin             | 2.1.20                      |
| Min iOS            | `min_ios_version_supported` |
| Min Android SDK    | 24                          |
| Target Android SDK | 36                          |

## Prerequisites

- [Devbox](https://www.jetify.com/devbox/docs/installing_devbox/) installed
- Xcode 26+ (for iOS)
- Android SDK with API 36 (managed by devbox plugin)

## Quick Start

```bash
cd examples/e2e-latest

# Install dependencies
devbox run install
devbox run install:pods   # iOS only

# Build
devbox run build:android
devbox run build:ios

# Deploy to emulator/simulator
devbox run start:android
devbox run start:ios
```

## Build Scripts (devbox)

| Script          | Description                              |
| --------------- | ---------------------------------------- |
| `install`       | Yarn install (no-immutable for monorepo) |
| `install:pods`  | CocoaPods install                        |
| `build:android` | Codegen + release APK via gradle wrapper |
| `build:ios`     | xcodebuild release + JS bundle into .app |
| `start:android` | Start emulator + deploy APK              |
| `start:ios`     | Start simulator + deploy .app            |
| `test:android`  | Start emulator + run Detox tests         |
| `test:ios`      | Start simulator + run Detox tests        |

## Architecture Notes

### Android

- Uses `pluginManagement` + `com.facebook.react.settings` in `settings.gradle` (RN 0.84 autolinking)
- `MainApplication.kt` (Kotlin) with `ReactNativeApplicationEntryPoint`
- `newArchEnabled=true` in `gradle.properties`
- Builds only `arm64-v8a` architecture

### iOS

- Standard RN 0.84 Podfile with `use_react_native!`
- `FOLLY_CFG_NO_COROUTINES=1` preprocessor define required for Xcode 26 compatibility
- Builds arm64 only (`-arch arm64` in xcodebuild)
- JS bundle created separately via `react-native bundle` (SKIP_BUNDLING=1 during xcodebuild)

### Navigation

Uses `@react-navigation/native-stack` v7 (native stack navigator, no gesture-handler dependency).
