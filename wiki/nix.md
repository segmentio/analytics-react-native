# Nix + Platform Versions

This repo uses a Nix flake for the Android SDK, and a JSON file for single-source platform versioning.

## Files

- `nix/flake.nix`

  - Defines the pinned Android SDK (emulator, system images, build tools).
  - Exposes an `android-sdk` output used by Devbox (`path:./nix#android-sdk`).

- `nix/defaults.json`

  - Single source of truth for Android/iOS min and max targets.
  - Contains Android build tools + cmdline tools versions.

- `scripts/env.sh`
  - Establishes `PROJECT_ROOT` and `SCRIPTS_DIR` for scripts and CI.

## How versions flow

1. `nix/defaults.json` is updated.
2. `nix/flake.nix` reads those values when building the Android SDK output.
3. `scripts/shared/defaults.sh` loads defaults (via `jq`) and establishes script root context for:
   - scripts under `scripts/android/` and `scripts/ios/`
   - CI workflows that set min/max targets

## Updating versions

1. Edit `nix/defaults.json`.
2. In a devbox shell, run `refresh` to rebuild the SDK.
3. If iOS min/max versions change, re-run the iOS E2E workflow to confirm the runtime/device exists on the runner.
4. `nix/defaults.json` exports concrete defaults via the `defaults` section.

## CI targets

- Latest E2E: `.github/workflows/ci-e2e-latest.yml`
- Full (min+max) E2E: `.github/workflows/ci-e2e-full.yml`
