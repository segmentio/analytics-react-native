# Devbox Overview

This repo ships a Devbox environment that preinstalls the Android SDK and common build tools like Gradle and Yarn. Devbox uses Nix under the hood to pin versions so everyone has the same setup. You don’t need to know Nix to use it.

Enter the environment with `devbox shell`. The init hook wires `ANDROID_SDK_ROOT`/`ANDROID_HOME` and PATH. Common scripts run via `devbox run`, for example `devbox run build`. For Devbox basics, see the official docs: https://www.jetify.com/devbox/docs/. For script layout, see `wiki/scripts.md`; for Nix/SDK versions, see `wiki/nix.md`.

## Getting started

- Install Devbox (https://www.jetify.com/devbox/docs/install/).
- From the repo root: `devbox install`.
- Enter the shell: `devbox shell`.
- Build/test: `devbox run build`, `devbox run test-android`, `devbox run test-ios`.

## Android

By default, Devbox uses the flake-pinned SDKs and prefers the latest (`android-sdk-max`) when available. It sets `ANDROID_SDK_ROOT`/`ANDROID_HOME` and adds emulator/platform-tools/cmdline-tools to `PATH` via `scripts/android/env.sh`. To use a local SDK instead, launch with `ANDROID_SDK_USE_LOCAL=1 ANDROID_HOME="$HOME/Library/Android/sdk" devbox shell` (or set `ANDROID_SDK_ROOT`). Unset `ANDROID_SDK_USE_LOCAL` (and `ANDROID_HOME`/`ANDROID_SDK_ROOT` if you set them) to return to the Nix SDK. Inspect the active SDK with `echo "$ANDROID_SDK_ROOT"` and `which sdkmanager` inside the shell. Create/boot AVDs via `devbox run start-android*` (uses `scripts/android/avd.sh`). Version sources are documented in `wiki/nix.md`.

### Emulator/AVD scripts

- `devbox run start-android` launches the default “max” AVD (from `nix/defaults.json`). Override with `TARGET_SDK=min` to launch the min AVD instead. You can also set `DETOX_AVD` or `AVD_NAME` to pick an exact AVD name. Internally uses `scripts/android/avd.sh`.
- `devbox run start-android-max` / `start-android-min` explicitly launch the max (API 33) or min (API 21) AVDs. Both will create the AVD first via `scripts/android/avd.sh` if it does not exist.
- `scripts/android/avd.sh` accepts env overrides: `AVD_API`, `AVD_DEVICE`, `AVD_TAG`, `AVD_ABI`, `AVD_NAME`, `ANDROID_TARGET_API`. Defaults target the latest API (`ANDROID_MAX_API`) when available. The script auto-selects the best ABI for the host (arm64-v8a on arm, x86_64 on Intel) if `AVD_ABI` is unset.
- `devbox run reset-android` removes local AVDs/adb keys if you need a clean slate.
- `EMU_HEADLESS=1 devbox run start-android*` to run the emulator headless (CI sets this); omit for a visible emulator locally.
- `EMU_PORT=5554 devbox run start-android*` to set the emulator port/serial (defaults to 5554) and avoid adb conflicts.
- `devbox run test-android` runs `setup-android` first to ensure AVDs exist, then delegates startup to Detox. It will not boot an emulator itself; use `start-android*` if you want it running beforehand.

### Detox defaults

- Android Detox defaults to the latest AVD (`medium_phone_API33_arm64_v8a` on arm hosts, x86*64 otherwise). Set `DETOX_AVD=pixel_API21*\*` to run against the minsdk AVD.
- CI Android E2E runs both API 21 (Pixel) and API 33 (Medium Phone) in parallel in the full workflow. Override the workflow matrix in `ci-e2e-full.yml` if needed.

### Updating Android min/latest versions

- Bump pinned SDK versions in `nix/defaults.json`. Refresh your devshell by running the `refresh` command while inside a devbox shell.
- Update AVD defaults/names if you change API levels:
  - `devbox.json` (`start-android-*` scripts) for default AVD names.
  - `examples/E2E/.detoxrc.js` for the default `DETOX_AVD`.
  - CI matrix in `.github/workflows/ci-e2e-full.yml` (`android-min`/`android-latest` targets).
- Gradle uses `buildToolsVersion` from `examples/E2E/android/build.gradle`; Devbox exports `ANDROID_BUILD_TOOLS_VERSION` from `nix/defaults.json` (single source of truth) and you can override it if needed.

## iOS

iOS uses the host Xcode toolchain. There is no Nix-provisioned iOS SDK. Run `devbox run setup-ios` to provision simulators and validate Xcode tooling. Full Xcode is required for `simctl` (Command Line Tools alone are not enough). Make sure Xcode command line tools are selected (`xcode-select --print-path` or `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`) and that you have agreed to the license if prompted.

> Important: `devbox shell` injects Nix toolchain variables on macOS, which can break Xcode builds. The init hooks source `scripts/ios/env.sh` to undo that and re-select the system toolchain, and `scripts/run.sh` re-applies it before running iOS E2E.

### Simulators and Detox

- `devbox run setup-ios` provisions simulators. Defaults are driven by `nix/defaults.json` (min/max device and iOS version). Override via env vars to target a specific device/runtime. Set `IOS_DOWNLOAD_RUNTIME=0` to skip attempting `xcodebuild -downloadPlatform iOS` when the preferred runtime is missing. Set `IOS_DEVELOPER_DIR` (e.g., `/Applications/Xcode.app/Contents/Developer`) to point at a specific Xcode; otherwise it uses `xcode-select -p` or the default Xcode.app if found. Internally uses `scripts/ios/simctl.sh`.
- `devbox run start-ios` provisions simulators (via `setup-ios`), then boots the chosen device (`DETOX_IOS_DEVICE` or default `iPhone 17`) and opens Simulator. Set `TARGET_SDK=min` to target the min sim (per `nix/defaults.json`) or leave default for latest. Internally uses `scripts/run.sh ios start`.
- `devbox run reset-ios` shuts down/erases and removes all local simulator devices.
- `devbox run stop-android` / `stop-ios` / `stop` to shut down running emulators/simulators (handy for headless runs).
- Detox defaults to `iPhone 17` for local runs; override with `DETOX_IOS_DEVICE`. CI runs a matrix: min sim (from `nix/defaults.json`) and latest (iPhone 17).
- `devbox run test-ios` runs `setup-ios` first to ensure simulators exist; Detox handles booting. Use `start-ios` if you want to pre-boot.

### Common env knobs

- Android: `TARGET_SDK` (min/max), `DETOX_AVD` (explicit AVD name), `AVD_NAME` (explicit AVD name for create + start), `EMU_HEADLESS` (1 for headless), `EMU_PORT` (emulator port/serial), `ANDROID_BUILD_TOOLS_VERSION` (override build-tools).
- iOS: `TARGET_SDK` (min/max/custom), `DETOX_IOS_DEVICE` (explicit sim device), `IOS_RUNTIME` (preferred runtime), `IOS_DEVICE_NAMES` (comma list to create), `IOS_DEVELOPER_DIR` (Xcode path), `IOS_DOWNLOAD_RUNTIME` (0 to skip runtime download attempt). The default min/max iOS versions live in `nix/defaults.json` as `IOS_MIN_VERSION`/`IOS_MAX_VERSION`.

### Releases

- `devbox run release` runs npm auth, yarn install/build, and `yarn release`. Requires `NPM_TOKEN` (and `GH_TOKEN`/`YARN_NPM_AUTH_TOKEN` for publishing). Used by the publish workflow.

### Updating iOS min/latest versions

- Adjust platform defaults in `nix/defaults.json` and rebuild Devbox if you change Android SDK versions.
- Update Detox default device in `examples/E2E/.detoxrc.js` if the default device changes.
- Update CI matrices in `.github/workflows/ci-e2e-full.yml` (ios-min/ios-latest rows) if you want to override the platform defaults in CI.

### CI devbox shells

The root `devbox.json` is a full local dev environment. CI uses slim Devbox configs under `shells/` to avoid pulling unnecessary SDKs:

- `shells/minimal/devbox.json`: build + lint only.
- `shells/android-min/devbox.json`: Android SDK (min API) + JDK/Gradle for Android E2E.
- `shells/android-max/devbox.json`: Android SDK (max API) + JDK/Gradle for Android E2E.
- `shells/ios/devbox.json`: CocoaPods + Yarn for iOS E2E (Xcode still required on macOS).

Run them locally with:

```sh
devbox run --config=shells/minimal/devbox.json build
devbox run --config=shells/android-min/devbox.json test-android
devbox run --config=shells/android-max/devbox.json test-android
devbox run --config=shells/ios/devbox.json test-ios
```

Note: when you use `devbox run --config=shells/<name>/devbox.json`, Devbox treats `shells/<name>/` as the config root. The init hooks set `SCRIPTS_DIR` to point back at the repo-level `scripts/` folder.
