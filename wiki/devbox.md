# Devbox Overview

This repo ships a Devbox environment that preinstalls the Android SDK and common build tools like Gradle and Yarn. Devbox uses Nix under the hood to pin versions so everyone has the same setup. You don’t need to know Nix to use it.

Enter the environment with `devbox shell`. The init hook wires `ANDROID_SDK_ROOT`/`ANDROID_HOME` and PATH. Common scripts run via `devbox run`, for example `devbox run build`. For Devbox basics, see the official docs: https://www.jetify.com/devbox/docs/.

## Getting started

- Install Devbox (https://www.jetify.com/devbox/docs/install/).
- From the repo root: `devbox install`.
- Enter the shell: `devbox shell`.
- Build/test: `devbox run build`, `devbox run test-android`, `devbox run test-ios`.

## Android

By default, Devbox uses the flake-pinned SDK (`path:./nix#android-sdk`). It sets `ANDROID_SDK_ROOT`/`ANDROID_HOME` and adds emulator/platform-tools/cmdline-tools to `PATH` via `scripts/android-env.sh`. Platform versions live in `nix/platform-versions.json` (single source of truth for min/max API and build tools; loaded by `scripts/platform-versions.sh`). To use a local SDK instead, launch with `ANDROID_HOME="$HOME/Library/Android/sdk" devbox shell` (or set `ANDROID_SDK_ROOT`). Clear both env vars to return to the Nix SDK. Inspect the active SDK with `echo "$ANDROID_SDK_ROOT"` and `which sdkmanager` inside the shell. Create/boot AVDs via `devbox run start-android*` (uses `scripts/android-setup.sh` + `scripts/android-manager.sh`).

### Emulator/AVD scripts

- `devbox run start-android` launches the default “latest” AVD (API 33, Medium Phone). On arm64 hosts it uses the arm64-v8a image; on Intel it uses x86_64. Override with `AVD_FLAVOR=minsdk` to launch the API 21 Pixel AVD instead. You can also set `DETOX_AVD` to pick an exact AVD name.
- `devbox run start-android-latest` / `start-android-minsdk` explicitly launch the latest (API 33) or minsdk (API 21) AVDs. Both will create the AVD first via `scripts/android-setup.sh` if it does not exist.
- `scripts/android-setup.sh` now accepts env overrides: `AVD_API`, `AVD_DEVICE`, `AVD_TAG`, `AVD_ABI`, `AVD_NAME`. Defaults target API 21 for minsdk; CI passes API 33 for latest. The script auto-selects the best ABI for the host (arm64-v8a on arm, x86_64 on Intel) if `AVD_ABI` is unset.
- `devbox run reset-android` removes local AVDs/adb keys if you need a clean slate.
- `EMU_HEADLESS=1 devbox run start-android*` to run the emulator headless (CI sets this); omit for a visible emulator locally.
- `EMU_PORT=5554 devbox run start-android*` to set the emulator port/serial (defaults to 5554) and avoid adb conflicts.
- `devbox run test-android` runs `setup-android` first to ensure AVDs exist, then delegates startup to Detox. It will not boot an emulator itself; use `start-android*` if you want it running beforehand.

### Detox defaults

- Android Detox defaults to the latest AVD (`medium_phone_API33_arm64_v8a` on arm hosts, x86*64 otherwise). Set `DETOX_AVD=pixel_API21*\*` to run against the minsdk AVD.
- CI Android E2E runs both API 21 (Pixel) and API 33 (Medium Phone) in parallel in the nightly workflow. Override the workflow matrix in `ci-e2e-nightly.yml` if needed.

### Updating Android min/latest versions

- Bump pinned SDK versions in `nix/platform-versions.json` (platformVersions/buildToolsVersions/cmdLineToolsVersion). Rebuild devbox (`devbox shell --rebuild`) so everyone gets the new SDK.
- Update AVD defaults/names if you change API levels:
  - `devbox.json` (`start-android-*` scripts) for default AVD names.
  - `examples/E2E/.detoxrc.js` for the default `DETOX_AVD`.
  - CI matrix in `.github/workflows/ci-e2e-nightly.yml` (`android-min`/`android-latest` targets).
- Gradle uses `buildToolsVersion` from `examples/E2E/android/build.gradle`; Devbox exports `ANDROID_BUILD_TOOLS_VERSION` from `nix/platform-versions.json` (single source of truth) and you can override it if needed.

## iOS

iOS uses the host Xcode toolchain. There is no Nix-provisioned iOS SDK. Run `devbox run setup-ios` to install pods and bootstrap the iOS example/E2E apps. Full Xcode is required for `simctl` (Command Line Tools alone are not enough). Make sure Xcode command line tools are selected (`xcode-select --print-path` or `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`) and that you have agreed to the license if prompted.

> Important: `devbox run` by itself uses the Nix compiler toolchain on macOS. For iOS work you must route commands through `devbox shell --omit-nix-env --command "<cmd>"` (or run an interactive `devbox shell --omit-nix-env` first) so the Xcode toolchain is used. CI does this for setup/tests.

### Simulators and Detox

- `devbox run setup-ios` provisions simulators. Defaults are driven by `nix/platform-versions.json` (min/max device/runtime). Override via env vars to target a specific device/runtime. Set `IOS_DOWNLOAD_RUNTIME=0` to skip attempting `xcodebuild -downloadPlatform iOS` when the preferred runtime is missing. Set `IOS_DEVELOPER_DIR` (e.g., `/Applications/Xcode.app/Contents/Developer`) to point at a specific Xcode; otherwise it uses `xcode-select -p` or the default Xcode.app if found.
- On macOS, use `devbox shell --omit-nix-env --command "<cmd>"` when invoking iOS builds/tests to ensure the Xcode toolchain is used instead of the Nix compiler toolchain.
- `devbox run start-ios` provisions simulators (via `setup-ios`), then boots the chosen device (`DETOX_IOS_DEVICE` or default `iPhone 17`) and opens Simulator. Set `IOS_FLAVOR=minsdk` to target the min sim (per `nix/platform-versions.json`) or leave default for latest. Internally uses `scripts/ios-manager.sh`.
- `devbox run reset-ios` shuts down/erases and removes all local simulator devices.
- `devbox run stop-android` / `stop-ios` / `stop` to shut down running emulators/simulators (handy for headless runs).
- Detox defaults to `iPhone 17` for local runs; override with `DETOX_IOS_DEVICE`. CI runs a matrix: min sim (from `nix/platform-versions.json`) and latest (iPhone 17 @ latest runtime).
- `devbox run test-ios` runs `setup-ios` first to ensure simulators exist; Detox handles booting. Use `start-ios` if you want to pre-boot.

### Common env knobs

- Android: `AVD_FLAVOR` (minsdk/latest), `DETOX_AVD` (explicit AVD name), `EMU_HEADLESS` (1 for headless), `EMU_PORT` (emulator port/serial), `ANDROID_BUILD_TOOLS_VERSION` (override build-tools).
- iOS: `IOS_FLAVOR` (minsdk/latest), `DETOX_IOS_DEVICE` (explicit sim device), `IOS_RUNTIME` (preferred runtime), `IOS_DEVICE_NAMES` (comma list to create), `IOS_DEVELOPER_DIR` (Xcode path), `IOS_DOWNLOAD_RUNTIME` (0 to skip runtime download attempt).

### Releases

- `devbox run release` runs npm auth, yarn install/build, and `yarn release`. Requires `NPM_TOKEN` (and `GH_TOKEN`/`YARN_NPM_AUTH_TOKEN` for publishing). Used by the publish workflow.

### Updating iOS min/latest versions

- Adjust platform defaults in `nix/platform-versions.json` and rebuild Devbox if you change Android SDK versions.
- Update Detox default device in `examples/E2E/.detoxrc.js` if the default device changes.
- Update CI matrices in `.github/workflows/ci-e2e-nightly.yml` (ios-min/ios-latest rows) if you want to override the platform defaults in CI.

### Platform versions source of truth

`nix/platform-versions.json` is the single source of truth for min/max SDK targets and Android build tools. It feeds:

- `nix/flake.nix` (Android SDK packages).
- `scripts/platform-versions.sh` (exports env vars via `jq` for devbox scripts).
- CI workflows (`ci-e2e-optional.yml` and `ci-e2e-nightly.yml`) for iOS/Android target selection.

After updating `nix/platform-versions.json`:

- Run `devbox install` or `devbox shell --rebuild` to refresh the SDK.
- If you change iOS min/max, re-run the iOS E2E workflow to confirm the runtime/device exists on the runner.
