# Devbox

This repo uses [Devbox](https://www.jetify.com/devbox/docs/) to provide reproducible, project-local development environments. Devbox uses Nix under the hood to pin tool versions so everyone gets the same setup. You don't need to know Nix to use it.

There are two tiers of Devbox environment in this repo:

1. **Root environment** (`devbox.json` at the repo root) — a lean environment for building, testing, linting, formatting, and releasing the library packages. It does **not** provision the Android SDK, emulators, or iOS simulators.
2. **Example/E2E environments** (`examples/e2e-latest/devbox.json`, `examples/e2e-compat/devbox.json`) — full mobile build + device environments for running the Detox end-to-end suites. These provision the Android and iOS toolchains via the shared [mobile-devtools](https://github.com/segment-integrations/mobile-devtools) Devbox plugins.

## Root environment

Enter it from the repo root with `devbox shell`. The init hook sets `PROJECT_ROOT`, adds `node_modules/.bin` to `PATH`, runs `yarn install` if dependencies are missing, prebuilds `packages/core/src/info.ts`, and installs the Husky git hooks.

### Packages

`cocoapods`, `nodejs` 22, `yarn-berry`, `jq`, `treefmt`, `nixfmt`, `shfmt`.

### Scripts

Run with `devbox run <script>`:

- `build` — build all public workspaces (`yarn build`).
- `test` — run unit tests (`yarn test`).
- `typecheck` — type-check (`yarn typecheck`).
- `lint` / `format` / `format-check` — ESLint and treefmt.
- `check` — runs lint, format-check, build, typecheck, and test in sequence (the local equivalent of CI).
- `clean` — clean build artifacts and `node_modules`.
- `release` / `release-dry-run` — run multi-semantic-release (see [RELEASING.md](../RELEASING.md)); these are invoked by the `Release` GitHub workflow, not run locally as a rule.
- `sync-versions` — reconcile `package.json` versions with what was published to npm (`scripts/sync-versions.sh`).
- `update-apps` — refresh the example apps' dependencies against the workspace.
- `ci:install` / `ci:commitlint` — used by CI.

## Example / E2E environments

The Detox E2E suites live in the example workspaces:

- `examples/e2e-latest` — newest supported React Native.
- `examples/e2e-compat` — minimum supported React Native.

Each `devbox.json` includes the React Native plugin from mobile-devtools:

```json
"include": [
  "github:segment-integrations/mobile-devtools?dir=plugins/react-native&ref=main"
]
```

The React Native plugin composes the Android and iOS plugins, which provide the emulator/simulator lifecycle and device management. Project-local device definitions and lock files are committed under each example's `devbox.d/` directory (`segment-integrations.mobile-devtools.android/` and `…ios/`, with `devices/min.json` and `devices/max.json` plus their `.lock` files), so the SDK/device configuration is reviewable in PRs and reproducible across machines.

### Running E2E

From an example directory:

```sh
cd examples/e2e-latest   # or examples/e2e-compat

# iOS
devbox run build:ios
devbox run test:ios

# Android
devbox run build:android
devbox run test:android
```

The `build:*` scripts are defined locally in each example's `devbox.json`; `test:*` boot a simulator/emulator (via the plugin's `start:sim` / `start:emu`) and then run Detox. See [wiki/e2e/setup.md](e2e/setup.md) for the shared test architecture and [.github/workflows/e2e-tests.yml](../.github/workflows/e2e-tests.yml) for how CI orchestrates the matrix.

### Plugin-provided commands

The mobile-devtools React Native plugin exposes device/build helpers that the example scripts build on, including:

- **Android:** `devbox run start:emu`, `devbox run stop:emu`, `devbox run reset:emu`, `devbox run start:android` (build + install + launch).
- **iOS:** `devbox run start:sim`, `devbox run stop:sim`, `devbox run start:ios` (build + install + launch).
- **Metro:** `devbox run start:metro`, `devbox run stop:metro`.
- **Diagnostics:** `devbox run doctor`, `devbox run verify:setup`.

For the full command list, configurable env vars, and device-definition/lock-file workflow, see the plugin docs in the [mobile-devtools](https://github.com/segment-integrations/mobile-devtools) repo (`plugins/react-native/README.md` and `REFERENCE.md`, plus the `plugins/android` and `plugins/ios` READMEs).

### Configuring SDK / device versions

SDK levels and build tools are set via env vars in the example's `devbox.json` (e.g. `ANDROID_COMPILE_SDK`, `ANDROID_BUILD_TOOLS_VERSION`, `CMAKE_VERSION`, `ANDROID_APP_APK`, `IOS_APP_ARTIFACT`). Device targets are defined in the `devbox.d/.../devices/*.json` files and pinned by the adjacent `.lock` files; after editing a device definition, regenerate its lock file per the plugin docs. The Detox device wiring lives in each example's `.detoxrc.js`.

## iOS build notes

iOS uses the host Xcode toolchain — there is no Nix-provisioned iOS SDK. Make sure full Xcode is installed (Command Line Tools alone are not enough for `simctl`), the right toolchain is selected (`xcode-select --print-path`), and you have accepted the Xcode license. On macOS, `devbox shell` injects Nix toolchain variables; the plugin's init hooks re-select the system toolchain so Xcode builds work.

Both example apps use a two-step iOS build to avoid Metro resolution issues in the monorepo:

1. `RCT_NO_LAUNCH_PACKAGER=1 SKIP_BUNDLING=1 xcodebuild ...` — builds the native binary without bundling JS or spawning Metro.
2. `react-native bundle ...` — creates the JS bundle directly into the `.app`.

`RCT_NO_LAUNCH_PACKAGER=1` prevents the Xcode "Start Packager" build phase from opening a Metro terminal during release builds.

## Android build notes

- `e2e-compat` (RN 0.72): standard `./gradlew assembleRelease`.
- `e2e-latest` (RN 0.84): runs `generateCodegenArtifactsFromSchema --rerun-tasks` before assembly (required for the New Architecture).

## Releases

`devbox run release` (root environment) runs `yarn install --immutable`, `yarn build`, and `yarn release` (multi-semantic-release). It is invoked by the production/beta jobs of the `Release` GitHub workflow. Publishing to npm uses OIDC trusted publishing with provenance — there is **no** `NPM_TOKEN`; the workflow passes only `GH_TOKEN` (`github.token`) for GitHub releases. See [RELEASING.md](../RELEASING.md) for the full release guide.
