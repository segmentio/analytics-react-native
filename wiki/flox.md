## Flox environments

- Install flox (https://flox.dev/docs/install) and ensure `~/.flox/bin` is on PATH.
- From the repo root, enter the full toolchain shell: `flox activate . --devshell default`.
- Lean shells: `flox activate . --devshell android`, `flox activate . --devshell ios`, `flox activate . --devshell ci-android`, `flox activate . --devshell ci-ios`.
- The shell hook sets `PROJECT_ROOT`, wires the pinned Android SDK (unless `ANDROID_HOME`/`ANDROID_SDK_ROOT` is already set), and leaves CocoaPods/Xcode on macOS.
- Common tasks (run inside `flox activate ... --`): `bash flox/scripts/build.sh`, `bash flox/scripts/android/test.sh`, `bash flox/scripts/ios/test.sh`.
- Android emulators: `bash flox/scripts/android-manager.sh start|stop|reset`; iOS simulators: `bash flox/scripts/ios-manager.sh start|stop|reset`.
- The Android SDK comes from `flox/nix/flake.nix`; adjust versions there and re-lock if needed.
