# Scripts Overview

This repo uses `scripts/` as the entry point for devbox commands and tasks. Scripts are organized by platform with a small shared helper layer. Devbox runs are expected to use `--pure` for reproducible environments.

## Layout

- `scripts/run.sh`: entrypoint for tasks (build/test).
- `scripts/bootstrap/env.sh`: establishes `PROJECT_ROOT`/`SCRIPTS_DIR`, loads `scripts/shared/*`, and optionally initializes platforms when `INIT_ANDROID`/`INIT_IOS` are set.
- `scripts/bootstrap/init.sh`: bootstraps `scripts/bootstrap/env.sh` when invoked from `scripts/run.sh`.
- `scripts/shared/project.sh`: project root + scripts path helpers.
- `scripts/shared/tools.sh`: shared tool checks.
- `scripts/shared/defaults.sh`: loads `nix/defaults.json` via `jq`.
- `scripts/platforms/android/`: Android SDK, AVD, and E2E helpers.
- `scripts/platforms/ios/`: iOS simulator setup, toolchain fixups, and E2E helpers.
- `scripts/platforms/android/actions.sh` + `scripts/platforms/ios/actions.sh`: platform task dispatchers called by `scripts/run.sh`.

## Shared helpers

- `scripts/shared/project.sh`
  - `ensure_project_root`: resolves `PROJECT_ROOT`.
  - `SCRIPTS_DIR`: defaults to `$PROJECT_ROOT/scripts` when unset.
- `scripts/shared/tools.sh`
  - `require_tool`: asserts a tool exists (with an optional custom message).
  - `require_file`: asserts a file exists (with an optional custom message).
  - `require_dir`: asserts a directory exists (with an optional custom message).
  - `require_dir_contains`: asserts a directory contains a specific subpath (with an optional custom message).
  - `require_var`: asserts an env var is set (with an optional custom message).
- `scripts/shared/defaults.sh`
  - Loads `nix/defaults.json` (via `jq`) to export default env vars when available.

## Android scripts

- `scripts/platforms/android/env.sh`

  - Sets `ANDROID_SDK_ROOT`/`ANDROID_HOME` and PATH for the Nix SDK (prefers `android-sdk-max` when available).
  - Set `ANDROID_LOCAL_SDK=1` to keep a pre-set local SDK instead.
  - Loads platform defaults via `scripts/shared/defaults.sh` (from `nix/defaults.json`).
  - Used by devbox init hooks in `devbox.json` and `shells/android-min/devbox.json` + `shells/android-max/devbox.json`.

- `scripts/platforms/android/avd.sh`

  - Creates/ensures AVDs for the target API level, then starts/stops/resets emulators.
  - Depends on `sdkmanager`, `avdmanager`, `emulator` in PATH (Devbox shell).
  - Uses platform defaults from `scripts/shared/defaults.sh`.


## iOS scripts

- `scripts/platforms/ios/env.sh`

  - Workaround for Devbox macOS toolchain injection.
  - Removes Nix toolchain variables and re-selects system clang/Xcode.
  - Sourced by devbox init hooks and re-applied in `scripts/run.sh` for iOS tasks.

- `scripts/platforms/ios/simctl.sh`

  - Helpers for runtime selection and simulator management.
  - Ensures Xcode tools are selected and simulators exist.

## User overrides

These env vars can be set by users to override defaults or behavior.

### Android

- `ENV_DEFAULTS_JSON`: path to an alternate `nix/defaults.json` (advanced).
- `ANDROID_SDK_ROOT`, `ANDROID_HOME`: explicit SDK location (used with `ANDROID_LOCAL_SDK=1`).
- `ANDROID_LOCAL_SDK`: use a local Android SDK instead of the Nix SDK.
- `ANDROID_SDK_FLAKE_OUTPUT`: force a specific flake output (e.g., `android-sdk-max`).
- `TARGET_SDK`: `min`, `max`, or `custom` (selects which API/device pairing to use).
- `ANDROID_MIN_API`, `ANDROID_MAX_API`: override the min/max API levels.
- `ANDROID_MIN_DEVICE`, `ANDROID_MAX_DEVICE`: override the min/max AVD device names.
- `ANDROID_SYSTEM_IMAGE_TAG`: override the system image tag (default `google_apis`).
- `ANDROID_BUILD_TOOLS_VERSION`, `ANDROID_CMDLINE_TOOLS_VERSION`: override build tools/cmdline tools versions.
- `ANDROID_CUSTOM_API`, `ANDROID_CUSTOM_DEVICE`, `ANDROID_CUSTOM_SYSTEM_IMAGE_TAG`: required/optional when `TARGET_SDK=custom`.
- `ANDROID_TARGET_API`: force a specific API, bypassing `TARGET_SDK`.
- `AVD_API`, `AVD_DEVICE`, `AVD_TAG`, `AVD_ABI`, `AVD_NAME`: override AVD creation/selection.
- `DETOX_AVD`: force a specific AVD name for Detox.
- `EMU_HEADLESS`: `1` to launch the emulator without a window.
- `EMU_PORT`: emulator port/serial (default `5554`).
- `DEBUG` / `ANALYTICS_CI_DEBUG`: enables verbose logging for script helpers.

### iOS

- `IOS_MIN_DEVICE`, `IOS_MAX_DEVICE`: override min/max device names.
- `IOS_RUNTIME_MIN`, `IOS_RUNTIME_MAX`: required iOS simulator runtimes for min/max.
- `IOS_RUNTIME_CUSTOM`: required runtime when `TARGET_SDK=custom`.
- `IOS_DEVICE_NAMES`: comma-separated list of devices to create.
- `IOS_DEVELOPER_DIR`: override the Xcode path.
- `IOS_DOWNLOAD_RUNTIME`: set to `0` to skip `xcodebuild -downloadPlatform iOS`.
- `TARGET_SDK`: `min`, `max`, or `custom` (controls which device/runtime to boot for iOS).
- `IOS_CUSTOM_DEVICE`: used when `TARGET_SDK=custom`.
- `DETOX_IOS_DEVICE`: force a specific simulator name for Detox.


## Devbox wiring

Root devbox (`devbox.json`) exposes:

- `build` -> `scripts/run.sh build`
- `test-android` -> `scripts/run.sh android test`
- `test-ios` -> `scripts/run.sh ios test`
- `setup-android` -> `scripts/run.sh android setup`
- `setup-ios` -> `scripts/run.sh ios setup`
- `start-android*` -> `scripts/run.sh android start` (uses `scripts/platforms/android/avd.sh`)
- `start-ios` -> `scripts/run.sh ios start`

Slim CI shells:

- `shells/minimal/devbox.json` -> `scripts/run.sh build`
- `shells/android-min/devbox.json` -> `scripts/run.sh android test`
- `shells/android-max/devbox.json` -> `scripts/run.sh android test`
- `shells/ios/devbox.json` -> `scripts/run.sh ios test`

See `wiki/devbox.md` for usage and `wiki/nix.md` for platform version sources.
