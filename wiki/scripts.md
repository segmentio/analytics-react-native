# Scripts Overview

This repo uses `scripts/` as the entry point for devbox commands and CI helpers. Scripts are organized by platform with a small shared helper layer.

## Layout

- `scripts/run.sh`: entrypoint for devbox/CI tasks (build/test/act).
- `scripts/env-defaults.sh`: loads `scripts/env-defaults.json` and exports platform vars for scripts.
- `scripts/shared/common.sh`: shared helpers (tool checks, platform version loader).
- `scripts/android/`: Android SDK, AVD, and E2E helpers.
- `scripts/ios/`: iOS simulator setup, toolchain fixups, and E2E helpers.
- `scripts/android/run.sh` + `scripts/ios/run.sh`: platform task dispatchers called by `scripts/run.sh`.

## Shared helpers

- `scripts/shared/common.sh`
  - `require_tool`: asserts a tool exists (with an optional custom message).
  - `env-defaults.sh`: sourced once to load platform defaults for scripts.
  - `PROJECT_ROOT`: auto-detected git root when unset.
  - `SCRIPTS_DIR`: defaults to `$PROJECT_ROOT/scripts` when unset.

## Android scripts

- `scripts/android/env.sh`

  - Sets `ANDROID_SDK_ROOT`/`ANDROID_HOME` and PATH for the Nix SDK (prefers `android-sdk-max` when available).
  - Set `ANDROID_SDK_USE_LOCAL=1` to keep a pre-set local SDK instead.
  - Loads platform defaults via `scripts/env-defaults.sh`.
  - Used by devbox init hooks in `devbox.json` and `shells/android-min/devbox.json` + `shells/android-max/devbox.json`.

- `scripts/android/avd.sh`

  - Creates/ensures AVDs for the target API level, then starts/stops/resets emulators.
  - Depends on `sdkmanager`, `avdmanager`, `emulator` in PATH (Devbox shell).
  - Uses platform defaults from `scripts/env-defaults.sh`.


## iOS scripts

- `scripts/ios/env.sh`

  - Workaround for Devbox macOS toolchain injection.
  - Removes Nix toolchain variables and re-selects system clang/Xcode.
  - Sourced by devbox init hooks and re-applied in `scripts/run.sh` for iOS tasks.

- `scripts/ios/simctl.sh`

  - Helpers for runtime selection and simulator management.
  - Ensures Xcode tools are selected and simulators exist.


## Devbox wiring

Root devbox (`devbox.json`) exposes:

- `build` -> `scripts/run.sh build`
- `test-android` -> `scripts/run.sh android test`
- `test-ios` -> `scripts/run.sh ios test`
- `setup-android` -> `scripts/run.sh android setup`
- `setup-ios` -> `scripts/run.sh ios setup`
- `start-android*` -> `scripts/run.sh android start` (uses `scripts/android/avd.sh`)
- `start-ios` -> `scripts/run.sh ios start`
- `act` -> `scripts/run.sh act <workflow>`

Slim CI shells:

- `shells/minimal/devbox.json` -> `scripts/run.sh build`
- `shells/android-min/devbox.json` -> `scripts/run.sh android test`
- `shells/android-max/devbox.json` -> `scripts/run.sh android test`
- `shells/ios/devbox.json` -> `scripts/run.sh ios test`

See `wiki/devbox.md` for usage and `wiki/nix.md` for platform version sources.
