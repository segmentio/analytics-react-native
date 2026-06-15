# React Native 0.84 + New Architecture Migration Guide

This document covers the changes required to migrate the `e2e-latest` example app from React Native 0.72 (Old Architecture) to React Native 0.84 (New Architecture / Bridgeless).

## Overview

React Native 0.84 defaults to the New Architecture with bridgeless mode. This means:

- **Fabric** replaces the legacy renderer
- **TurboModules** replace the bridge-based native module system
- **Bridgeless mode** removes the bridge entirely

## Android Changes

### settings.gradle

The old `native_modules.gradle` approach is removed in RN 0.84. Replace with:

```gradle
// OLD (RN 0.72)
rootProject.name = 'AnalyticsReactNativeE2E'
apply from: file("../node_modules/@react-native-community/cli-platform-android/native_modules.gradle")
applyNativeModulesSettingsGradle(settings)
include ':app'
includeBuild('../node_modules/@react-native/gradle-plugin')

// NEW (RN 0.84)
pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings") }
extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand() }
rootProject.name = 'AnalyticsReactNativeE2E'
include ':app'
includeBuild('../node_modules/@react-native/gradle-plugin')
```

### gradle-wrapper.properties

Upgrade to Gradle 9.x:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-9.3.1-all.zip
```

### gradle.properties

Enable New Architecture:

```properties
newArchEnabled=true
hermesEnabled=true

# Restrict to arm64 for faster builds
reactNativeArchitectures=arm64-v8a

# Disable SDK auto-download when using Nix/Devbox
android.builder.sdkDownload=false
```

### MainApplication (Java -> Kotlin)

Replace `MainApplication.java` with `MainApplication.kt`:

```kotlin
package com.AnalyticsReactNativeE2E

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
            override fun getPackages(): List<ReactPackage> = PackageList(this).packages
            override fun getJSMainModuleName(): String = "index"
            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        ReactNativeApplicationEntryPoint.loadReactNative(this)
    }
}
```

### app/build.gradle

Add `autolinkLibrariesWithApp()` and use the React Native Gradle Plugin:

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

react {
    autolinkLibrariesWithApp()
}
```

## iOS Changes

### Podfile

The Podfile remains mostly unchanged for RN 0.84. The key difference is Xcode 26 compatibility:

```ruby
post_install do |installer|
  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false
  )
  # Xcode 26 enables C++20 coroutines by default, but the prebuilt RN
  # dependencies don't ship folly/coro headers. Disable folly coroutines.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |bc|
      defs = bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
      defs = [defs] if defs.is_a?(String)
      unless defs.include?('FOLLY_CFG_NO_COROUTINES=1')
        defs << 'FOLLY_CFG_NO_COROUTINES=1'
        bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
    end
  end
end
```

### Xcode Project

Add `FOLLY_CFG_NO_COROUTINES=1` to `GCC_PREPROCESSOR_DEFINITIONS` in the app target's build settings (both Debug and Release configurations).

### Build command

Use `-arch arm64` to avoid x86_64 folly coroutine header issues:

```bash
SKIP_BUNDLING=1 xcodebuild \
  -workspace ios/AnalyticsReactNativeE2E.xcworkspace \
  -scheme AnalyticsReactNativeE2E \
  -configuration Release \
  -sdk iphonesimulator \
  -arch arm64 \
  -derivedDataPath ios/build \
  build
```

## JavaScript Changes

### Navigation

Replace `@react-navigation/stack` (requires gesture-handler) with `@react-navigation/native-stack` (uses native stack, no extra dependencies):

```diff
-import 'react-native-gesture-handler';
-import {createStackNavigator} from '@react-navigation/stack';
+import {createNativeStackNavigator} from '@react-navigation/native-stack';

-const Stack = createStackNavigator();
+const Stack = createNativeStackNavigator();
```

### babel.config.js

Replace `metro-react-native-babel-preset` with `@react-native/babel-preset`:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
```

### metro.config.js

Use `@react-native/metro-config` instead of the standalone metro-config package.

## Dependency Changes

| Package                         | Old (0.72) | New (0.84) |
| ------------------------------- | ---------- | ---------- |
| react                           | 18.2.0     | 19.2.3     |
| react-native                    | 0.72.9     | 0.84.1     |
| @react-navigation/native        | ^6         | ^7         |
| @react-navigation/stack         | ^6         | removed    |
| @react-navigation/native-stack  | -          | ^7         |
| react-native-gesture-handler    | ^2         | removed    |
| react-native-safe-area-context  | ^4         | ^5         |
| react-native-screens            | ^3         | 4.25.x     |
| @react-native/babel-preset      | -          | ^0.84.0    |
| @react-native/metro-config      | ^0.72      | ^0.84.0    |
| metro-react-native-babel-preset | 0.76.8     | removed    |

## Known Issues

### Xcode 26 + folly coroutines

RN 0.84's prebuilt `ReactNativeDependencies` pod ships folly headers that conditionally include `folly/coro/Coroutine.h`. Xcode 26's clang enables C++20 coroutines by default (`__cpp_impl_coroutine >= 201902L`), triggering this include — but the coroutine headers aren't actually shipped in the prebuilt pod.

**Fix:** Define `FOLLY_CFG_NO_COROUTINES=1` in both the Podfile (for pod targets) and the Xcode project settings (for the app target).

### iOS simulator architecture

Building for x86_64 simulator fails with folly header errors even with the coroutine fix. Use `-arch arm64` to build only for Apple Silicon simulators.

### app.json name must match native expectations

The `name` field in `app.json` must match what `MainActivity.getMainComponentName()` returns. A mismatch causes the "has not been registered" runtime crash.
