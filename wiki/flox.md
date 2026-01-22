## Flox environments

Flox devshells live in `.flox/env/manifest.toml` and compose `env/common`, `env/nodejs`, `env/android/min`, `env/android/latest`, `env/ios/min`, and `env/ios/latest`. Activation exports `PROJECT_ROOT`, wires the pinned Android SDK unless you set `ANDROID_HOME` or `ANDROID_SDK_ROOT`, and seeds Detox defaults for `DETOX_AVD` and `DETOX_IOS_DEVICE`. Use `flox activate . --devshell default -- <command>` for builds and tests; lean shells `--devshell android` or `--devshell ios` are also available.

Emulators and simulators are managed by flox services instead of helper scripts. Start Android with `flox services start android-emulator-min` (API 21) or `flox services start android-emulator-latest` (API 33; architecture is chosen automatically). Override the target with `ANDROID_AVD` and `ANDROID_SYSTEM_IMAGE`; headless options come from `ANDROID_EMULATOR_HEADLESS_FLAGS`. Start iOS with `flox services start ios-simulator-min` or `flox services start ios-simulator-latest`, and override with `IOS_SIM_DEVICE` and `IOS_SIM_RUNTIME`. If you do not set `DETOX_IOS_DEVICE`, activation fills it from the simulator choice. AVD data is cached in `.flox/cache/android/avd` so CI and local runs stay isolated from your global `~/.android`.

The environment tree is layered but flatter. The root manifest composes every sub-environment so `flox activate .` pulls in common tooling, Node, Android min, Android latest, and iOS min/latest. `env/common` is the base and sets shared variables like `PROJECT_ROOT`. Android-specific configuration lives under `env/android`: `android-common` inherits from `env/common`, while `android-min` and `android-latest` inherit from `android-common`; both are composed directly by the root manifest. iOS follows the same pattern: `env/ios` inherits from `env/common` and `env/nodejs`, while `env/ios/min` and `env/ios/latest` inherit from `env/ios` and are composed at the root.

Visual dependency graph (includes):
```
.flox/env/manifest.toml
├─ env/common
├─ env/nodejs
├─ env/android/min
│  └─ env/android/android-common
│     └─ env/common
├─ env/android/latest
│  └─ env/android/android-common
│     └─ env/common
├─ env/ios/min
│  └─ env/ios
│     ├─ env/common
│     └─ env/nodejs
└─ env/ios/latest
   └─ env/ios
      ├─ env/common
      └─ env/nodejs
```

Install flox from https://flox.dev/docs/install and ensure `~/.flox/bin` is on `PATH`. Run the full build, lint, and test suite with `flox activate . --devshell default -- bash scripts/build.sh`.

For Android E2E, start the emulator service first, then run:
```
flox activate . --devshell default -- bash -lc "yarn install --immutable && yarn e2e install && yarn build && yarn e2e build:android && yarn e2e test:android"
```
For iOS E2E on macOS, start the simulator service first, then run:
```
flox activate . --devshell default -- bash -lc "yarn install --immutable && yarn e2e install && yarn e2e pods && yarn build && yarn e2e build:ios && yarn e2e test:ios"
```
