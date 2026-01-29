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

  - Sets `ANDROID_SDK_ROOT`/`ANDROID_HOME` and PATH for the Nix SDK (prefers `android-sdk-max` when available).
  - Set `ANDROID_SDK_USE_LOCAL=1` to keep a pre-set local SDK instead.
  - Loads platform defaults via `scripts/platform-versions.sh`.
  - Used by devbox init hooks in `devbox.json` and `shells/android-min/devbox.json` + `shells/android-max/devbox.json`.

- `scripts/android/avd.sh`

  - Creates/ensures AVDs for min and max API levels, then starts/stops/resets emulators.
  - Depends on `sdkmanager`, `avdmanager`, `emulator` in PATH (Devbox shell).
  - Uses platform defaults from `scripts/platform-versions.sh`.


## iOS scripts

- `scripts/ios/env.sh`

  - Workaround for Devbox macOS toolchain injection.
  - Removes Nix toolchain variables and re-selects system clang/Xcode.
  - Sourced by devbox init hooks and re-applied in `scripts/entry/run.sh` for iOS tasks.

- `scripts/ios/simctl.sh`

  - Helpers for runtime selection and simulator management.
  - Ensures Xcode tools are selected and simulators exist.


## Devbox wiring

Root devbox (`devbox.json`) exposes:

- `build` -> `scripts/entry/run.sh build`
- `test-android` -> `scripts/entry/run.sh android test`
- `test-ios` -> `scripts/entry/run.sh ios test`
- `setup-android` -> `scripts/entry/run.sh android setup`
- `setup-ios` -> `scripts/entry/run.sh ios setup`
- `start-android*` -> `scripts/entry/run.sh android start` (uses `scripts/android/avd.sh`)
- `start-ios` -> `scripts/entry/run.sh ios start`

Slim CI shells:

- `shells/minimal/devbox.json` -> `scripts/entry/run.sh build`
- `shells/android-min/devbox.json` -> `scripts/entry/run.sh android test`
- `shells/android-max/devbox.json` -> `scripts/entry/run.sh android test`
- `shells/ios/devbox.json` -> `scripts/entry/run.sh ios test`

See `wiki/devbox.md` for usage and `wiki/nix.md` for platform version sources.
