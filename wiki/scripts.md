# Scripts Overview

This repo uses `scripts/` as the entry point for devbox commands and CI helpers. Scripts are organized by platform with a small shared helper layer.

## Layout

- `scripts/build.sh`: JS build + lint for fast CI.
- `scripts/platform-versions.sh`: loads `nix/platform-versions.json` and exports platform vars for scripts.
- `scripts/shared/common.sh`: shared helpers (tool checks, platform version loader).
- `scripts/android/`: Android SDK, AVD, and E2E helpers.
- `scripts/ios/`: iOS simulator setup, toolchain fixups, and E2E helpers.
- `scripts/act-ci.sh`: local CI runner helper for `act`.

## Shared helpers

- `scripts/shared/common.sh`
  - `require_tool`: asserts a tool exists (with an optional custom message).
  - `load_platform_versions`: sources `scripts/platform-versions.sh` if present.
  - `PROJECT_ROOT`: auto-detected git root when unset.
  - `SCRIPTS_DIR`: defaults to `$PROJECT_ROOT/scripts` when unset.

## Android scripts

- `scripts/android/env.sh`

  - Sets `ANDROID_SDK_ROOT`/`ANDROID_HOME` and PATH for the Nix SDK.
  - Loads platform defaults via `scripts/platform-versions.sh`.
  - Used by devbox init hooks in `devbox.json` and `shells/android-min/devbox.json` + `shells/android-max/devbox.json`.

- `scripts/android/setup.sh`

  - Creates/ensures AVDs for min and max API levels.
  - Depends on `sdkmanager`, `avdmanager`, `emulator` in PATH (Devbox shell).
  - Uses platform defaults from `scripts/platform-versions.sh`.

- `scripts/android/manager.sh`

  - Starts/stops/resets AVDs and applies emulator defaults.
  - Uses `devbox run setup-android` to ensure AVDs exist.

- `scripts/android/test.sh`
  - Runs setup + yarn build + Android E2E (Detox).
  - Used by `devbox run test-android` and CI Android workflows.

## iOS scripts

- `scripts/ios/env.sh`

  - Workaround for Devbox macOS toolchain injection.
  - Removes Nix toolchain variables and re-selects system clang/Xcode.
  - Sourced by devbox init hooks and re-applied in `scripts/ios/test.sh`.

- `scripts/ios/simctl.sh`

  - Helpers for runtime selection and simulator management.
  - Used by `scripts/ios/setup.sh`.

- `scripts/ios/setup.sh`

  - Ensures Xcode tools are selected and simulators exist.
  - Uses `scripts/ios/simctl.sh` to choose runtimes/devices.

- `scripts/ios/manager.sh`

  - Boots/shuts down simulators via `simctl`.
  - Uses platform defaults from `scripts/platform-versions.sh`.

- `scripts/ios/test.sh`
  - Applies `scripts/ios/env.sh`, then runs setup + yarn build + iOS E2E.
  - Used by `devbox run test-ios` and CI iOS workflows.

## Devbox wiring

Root devbox (`devbox.json`) exposes:

- `build` -> `scripts/build.sh`
- `test-android` -> `scripts/android/test.sh`
- `test-ios` -> `scripts/ios/test.sh`
- `setup-android` -> `scripts/android/setup.sh`
- `setup-ios` -> `scripts/ios/setup.sh`
- `start-android*` -> `scripts/android/manager.sh`
- `start-ios` -> `scripts/ios/manager.sh`

Slim CI shells:

- `shells/minimal/devbox.json` -> `scripts/build.sh`
- `shells/android-min/devbox.json` -> `scripts/android/test.sh`
- `shells/android-max/devbox.json` -> `scripts/android/test.sh`
- `shells/ios/devbox.json` -> `scripts/ios/test.sh`

See `wiki/devbox.md` for usage and `wiki/nix.md` for platform version sources.
