# React Native 0.84 Upgrade Guide

This document tracks all changes required to support React Native 0.84 with New Architecture, categorized by impact.

## 1. Non-Breaking Library Changes (Internal / CI)

Changes to our build infrastructure and CI that don't affect end users.

| Change                                                                                            | Reason                                                                                                     |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Add `jdk: "17"` to devbox.json packages                                                           | Gradle needs JDK to compile; was missing from E2E-latest devbox config                                     |
| Add `gradle_9: "9.3.1"` to devbox.json packages                                                   | RN 0.84's `@react-native/gradle-plugin` uses Gradle 9 `layout` API                                         |
| Use `gradle` (devbox-provided) instead of `./gradlew`                                             | Reproducible builds via Nix instead of wrapper downloading its own Gradle                                  |
| Set `CMAKE_VERSION=4.1.2` in devbox.json env                                                      | Nix SDK provides cmake 4.1.2; AGP defaults to 3.22.1 which isn't in Nix store                              |
| Set `android.builder.sdkDownload=false` in gradle.properties                                      | Nix store is read-only; AGP can't download SDK components into it                                          |
| Add `subprojects.afterEvaluate` to force `buildToolsVersion` and cmake version on all subprojects | Detox hardcodes build-tools 35.0.0; screens uses cmake 3.22.1 default. Our Nix SDK only has 36.1.0 / 4.1.2 |
| Run `android.sh devices sync` to generate `android.lock` with NDK                                 | Flake needs lock file to include NDK in the Nix SDK                                                        |
| Update `gradle-wrapper.properties` to 9.3.1                                                       | Fallback for environments not using devbox                                                                 |
| Add `-Wno-error=deprecated-declarations` to cmake cppFlags                                        | `react-native-screens` uses deprecated `ShadowNode::Shared` typedef                                        |
| Add `-fno-lto` and `-DCMAKE_INTERPROCEDURAL_OPTIMIZATION=OFF`                                     | Prevents LTO from stripping vtable symbols across shared library boundaries                                |
| Upgrade `react-native-screens` from 4.10.0 to 4.25.2                                              | 4.10.0 had missing codegen EventEmitters.h include paths for RN 0.84                                       |
| Add `generateCodegenArtifactsFromSchema --rerun-tasks` before assembleRelease                     | Codegen output must exist before cmake configure step; Gradle cache can get stale after clean              |

## 2. Breaking Library Changes (Analytics SDK)

Changes to `@segment/analytics-react-native` and `@segment/sovran-react-native` that affect compatibility.

### Current Assessment: No Breaking Changes Needed

The Segment SDK packages (`analytics-react-native`, `sovran-react-native`) do **not** use native C++ code (no Turbo Modules, no Fabric components). They are pure JS/TS packages with a thin Java/ObjC native module bridge.

**Key findings:**

- Codegen runs on our packages but finds "No modules to process" — this is expected and harmless
- The `autolinkLibrariesWithApp()` call wires them up correctly
- No native C++ compilation is triggered for our code

**Recommendation: Single branch supports both RN 0.72 and 0.84.** Our library code doesn't need forking. The breaking changes are all in the _example apps_ and _build configuration_, not the published packages.

### What to Watch

- If we ever add Turbo Module or Fabric component support, we'd need to provide codegen specs compatible with both old and new arch
- The `android/build.gradle` in our packages uses `safeExtGet` pattern which already handles both architectures

## 3. End-User Migration Guide (RN 0.72 → 0.84)

Changes users will need to make in their own React Native projects when upgrading to 0.84.

### Android

#### Gradle Version (Required)

Upgrade to Gradle 9.x. In `android/gradle/wrapper/gradle-wrapper.properties`:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-9.3.1-all.zip
```

#### Remove `jcenter()` (Required)

`jcenter()` is removed in Gradle 9. In `android/build.gradle`, remove all `jcenter()` references:

```diff
 allprojects {
     repositories {
         mavenCentral()
         google()
-        jcenter()
     }
 }
```

If a dependency still requires jcenter, replace it with its maintained fork (e.g., `@react-native-community/masked-view` → `@react-native-masked-view/masked-view`).

#### settings.gradle (Required)

RN 0.84 uses a new autolinking system:

```groovy
pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings") }
extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand() }
rootProject.name = 'YourApp'
include ':app'
includeBuild('../node_modules/@react-native/gradle-plugin')
```

#### app/build.gradle — autolinkLibrariesWithApp (Required)

Add after the react plugin application:

```groovy
apply plugin: "com.facebook.react"

react {
    autolinkLibrariesWithApp()
}
```

Without this, autolinked libraries won't be on your compile classpath and you'll get "package does not exist" errors.

#### MainApplication.java (Required)

Remove `isHermesEnabled()` override — it no longer exists in `DefaultReactNativeHost`:

```diff
-        @Override
-        protected Boolean isHermesEnabled() {
-          return BuildConfig.IS_HERMES_ENABLED;
-        }
```

#### gradle.properties — Architecture (Recommended)

For faster builds, limit architectures:

```properties
# Only build for your target device architecture
reactNativeArchitectures=arm64-v8a
```

#### NDK Version (Conditional)

If using Nix or a read-only SDK, set ndkVersion explicitly in root `build.gradle`:

```groovy
ext {
    def ndkVersionEnv = System.getenv("ANDROID_NDK_VERSION")
    if (ndkVersionEnv) {
        ndkVersion = ndkVersionEnv
    }
}
```

And in `app/build.gradle`:

```groovy
android {
    ndkVersion rootProject.ext.ndkVersion
}
```

### JavaScript / Metro

#### Babel Preset (Required)

Replace the old preset:

```diff
-    "metro-react-native-babel-preset": "^0.77.0",
+    "@react-native/babel-preset": "^0.84.0",
```

In `babel.config.js`:

```diff
-  presets: ['module:metro-react-native-babel-preset'],
+  presets: ['module:@react-native/babel-preset'],
```

#### Metro Config (Required)

Update `@react-native/metro-config` to match RN version:

```diff
-    "@react-native/metro-config": "^0.77.0",
+    "@react-native/metro-config": "^0.84.0",
```

The `metro-config/src/defaults/exclusionList` import is removed. Use the new API:

```diff
-const exclusionList = require('metro-config/src/defaults/exclusionList');
-const defaultSourceExts = require('metro-config/src/defaults/defaults').sourceExts;
-
-resolver: {
-  blacklistRE: exclusionList([...]),
-}
+resolver: {
+  blockList: new RegExp([...].join('|')),
+}
```

### Navigation Dependencies

#### react-native-screens (Required if using react-navigation)

Upgrade to v4.25.2+ for New Architecture support:

```diff
-    "react-native-screens": "^3.27.0",
+    "react-native-screens": "^4.25.2",
```

**Note:** Versions 4.10–4.24 have codegen compatibility issues with RN 0.84 (missing `EventEmitters.h` include paths) and deprecated `ShadowNode::Shared` usage that requires suppressing `-Werror=deprecated-declarations`. Use 4.25.2 or later.

#### @react-navigation/stack → native-stack (Recommended)

`@react-navigation/native-stack` avoids the C++ interop issues entirely since it uses platform-native navigation:

```diff
-import {createStackNavigator} from '@react-navigation/stack';
+import {createNativeStackNavigator} from '@react-navigation/native-stack';
```

This also removes the dependency on `react-native-gesture-handler` and `@react-native-masked-view/masked-view`.

#### react-native-safe-area-context (Required)

Upgrade to v5.x:

```diff
-    "react-native-safe-area-context": "^4.7.4",
+    "react-native-safe-area-context": "^5.0.0",
```

---

## Open Issues (In Progress)

- [x] react-native-screens vtable linker errors — resolved by upgrading to 4.25.2
- [ ] iOS build verification (not yet tested)
- [ ] Detox E2E test compatibility with RN 0.84
