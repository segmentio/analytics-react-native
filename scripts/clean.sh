#!/usr/bin/env bash
set -euo pipefail

target="${1:-all}"

project_root="${PROJECT_ROOT:-${DEVBOX_PROJECT_ROOT:-}}"
if [ -z "$project_root" ]; then
  project_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi
cd "$project_root"

clean_workspaces() {
  yarn workspaces foreach -A -p run clean || true
}

clean_gradle() {
  rm -rf ~/.gradle/caches ~/.gradle/wrapper
  rm -rf examples/E2E/android/build examples/E2E/android/app/build
}

clean_pods() {
  rm -rf examples/E2E/ios/Podfile.lock examples/E2E/ios/Pods
}

stop_android_emulators() {
  if command -v flox >/dev/null 2>&1; then
    flox services stop android-emulator-min android-emulator-max >/dev/null 2>&1 || true
  fi
  if command -v adb >/dev/null 2>&1; then
    devices=$(adb devices -l 2>/dev/null | tail -n +2 | awk '{print $1}')
    if [ -n "${devices:-}" ]; then
      for d in $devices; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
    fi
  fi
  pkill -f "emulator@" >/dev/null 2>&1 || true
}

stop_ios_simulators() {
  if command -v flox >/dev/null 2>&1; then
    flox services stop ios-simulator-min ios-simulator-max >/dev/null 2>&1 || true
  fi
  if command -v xcrun >/dev/null 2>&1 && xcrun -f simctl >/dev/null 2>&1; then
    xcrun simctl shutdown all >/dev/null 2>&1 || true
    xcrun simctl erase all >/dev/null 2>&1 || true
  fi
}

clean_android() {
  stop_android_emulators
  rm -rf ~/.android/avd ~/.android/adbkey*
  clean_gradle
}

clean_ios() {
  stop_ios_simulators
  rm -rf ~/Library/Developer/CoreSimulator/Devices
  rm -rf ~/Library/Developer/Xcode/DerivedData
  clean_pods
}

clean_nix() {
  nix-collect-garbage -d >/dev/null 2>&1 || true
}

clean_flox() {
  flox gc >/dev/null 2>&1 || true
}

clean_emulators() {
  stop_android_emulators
  stop_ios_simulators
}

case "$target" in
  workspaces) clean_workspaces ;;
  gradle) clean_gradle ;;
  pods|cocoapods) clean_pods ;;
  android) clean_android ;;
  ios) clean_ios ;;
  nix|nix-gc) clean_nix ;;
  flox) clean_flox ;;
  emulators) clean_emulators ;;
  all)
    clean_workspaces
    clean_gradle
    clean_pods
    clean_emulators
    clean_android
    clean_ios
    clean_nix
    clean_flox
    ;;
  *)
    echo "Unknown clean target: $target"
    echo "Valid targets: all, workspaces, gradle, pods, android, ios, emulators, nix, flox"
    exit 1
    ;;
esac

echo "Clean ($target) complete."
