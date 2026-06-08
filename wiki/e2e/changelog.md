# E2E Examples Changelog

## 2026-06-08: E2E Infrastructure Overhaul (PRs #1-5)

### PR 1: Rename example directories

Renamed example app directories from verbose names to the `e2e-` prefix convention:

- `AnalyticsReactNativeExample` -> `e2e-compat`
- `AnalyticsReactNativeE2E` -> `e2e-latest`

### PR 2: Extract shared app source

Created `e2e-shared/` package containing app components, test suites, and mock server. Both example apps now import shared source via `@segment/analytics-react-native-e2e-tests` instead of duplicating code.

### PR 3: Devbox integration for e2e-compat

Added Devbox configuration for the compatibility app (RN 0.72):

- `devbox.json` with `mobile-devtools` plugin for emulator/simulator management
- Build scripts for reproducible release builds
- iOS pre-bundling fix: `SKIP_BUNDLING=1` during xcodebuild, then `react-native bundle` separately (avoids Metro monorepo resolution issues)
- Added `nodejs 22` to avoid Nix insecure node 20 error

### PR 4: Devbox integration for e2e-latest + New Architecture

Added Devbox configuration for the latest app (RN 0.84) and enabled New Architecture:

**Devbox:**

- Removed `gradle_9` package (uses gradle wrapper 9.3.1 instead)
- Same iOS pre-bundling strategy as e2e-compat
- Added `-arch arm64` for iOS simulator builds

**New Architecture migration:**

- Enabled `newArchEnabled=true` and `hermesEnabled=true` in `gradle.properties`
- Rewrote `settings.gradle` for RN 0.84 autolinking (`com.facebook.react.settings` plugin)
- Converted `MainApplication.java` to `MainApplication.kt` with `ReactNativeApplicationEntryPoint`
- Upgraded to Gradle 9.3.1 wrapper
- Switched `App.tsx` from `@react-navigation/stack` to `@react-navigation/native-stack` v7
- Removed `react-native-gesture-handler` dependency
- Upgraded `react-native-safe-area-context` to 5.x, `react-native-screens` to 4.25.x
- Added `FOLLY_CFG_NO_COROUTINES=1` for Xcode 26 compatibility

### PR 5: CI workflow

Added `.github/workflows/e2e-mobile.yml` GitHub Actions workflow:

- Android E2E for both e2e-compat (API 24) and e2e-latest (API 36)
- iOS E2E for both e2e-compat (iOS 18.5, macos-15) and e2e-latest (iOS 26.2, macos-26)
- Uses Devbox for reproducible builds in CI
- Gradle and CocoaPods caching
- Artifact upload for test results

### PR 6: Documentation

Added READMEs, changelog, and migration guide for the entire series.
