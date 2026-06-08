# e2e-compat

End-to-end test app running **React Native 0.72.9** with the **Old Architecture** (Bridge mode).

| Stack              | Version                     |
| ------------------ | --------------------------- |
| React Native       | 0.72.9                      |
| React              | 18.2.0                      |
| Hermes             | enabled                     |
| New Architecture   | disabled                    |
| Gradle             | 8.x (wrapper)               |
| Min iOS            | 12.4                        |
| Min Android SDK    | 24 (env: `ANDROID_MIN_SDK`) |
| Target Android SDK | 33                          |

## Prerequisites

- [Devbox](https://www.jetify.com/devbox/docs/installing_devbox/) installed
- Xcode 16+ (for iOS)
- Android SDK with API 33 (managed by devbox plugin)

## Quick Start

```bash
cd examples/e2e-compat

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
| `build:android` | Release APK via gradle wrapper           |
| `build:ios`     | xcodebuild release + JS bundle into .app |
| `start:android` | Start emulator + deploy APK              |
| `start:ios`     | Start simulator + deploy .app            |
| `test:android`  | Start emulator + run Detox tests         |
| `test:ios`      | Start simulator + run Detox tests        |

## Architecture Notes

### Android

- Uses `native_modules.gradle` for autolinking (RN 0.72 style)
- `MainApplication.java` (Java)
- `newArchEnabled=false` in `gradle.properties`
- Builds all architectures: `armeabi-v7a,arm64-v8a,x86,x86_64`

### iOS

- Standard RN 0.72 Podfile with `use_react_native!`
- JS bundle created separately via `react-native bundle` (SKIP_BUNDLING=1 during xcodebuild)

### Navigation

Uses `@react-navigation/stack` v6 (JS-based stack navigator, requires gesture-handler).
