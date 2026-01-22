#!/usr/bin/env bash
set -euo pipefail

action="${1:-start}"
target="${2:-latest}"

project_root="${PROJECT_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$project_root"

start_latest() {
  flox services start android-emulator-latest ios-simulator-latest
}

start_min() {
  flox services start -d env/android/min android-emulator-min
  flox services start -d env/ios/min ios-simulator-min
}

stop_latest() {
  flox services stop android-emulator-latest ios-simulator-latest >/dev/null 2>&1 || true
}

stop_min() {
  flox services stop -d env/android/min android-emulator-min >/dev/null 2>&1 || true
  flox services stop -d env/ios/min ios-simulator-min >/dev/null 2>&1 || true
}

case "$action:$target" in
  start:latest) start_latest ;;
  start:min) start_min ;;
  start:all)
    start_latest
    start_min
    ;;
  start:android-latest) flox services start android-emulator-latest ;;
  start:android-min) flox services start -d env/android/min android-emulator-min ;;
  start:ios-latest) flox services start ios-simulator-latest ;;
  start:ios-min) flox services start -d env/ios/min ios-simulator-min ;;
  stop:latest) stop_latest ;;
  stop:min) stop_min ;;
  stop:all)
    stop_latest
    stop_min
    ;;
  stop:android-latest) flox services stop android-emulator-latest >/dev/null 2>&1 || true ;;
  stop:android-min) flox services stop -d env/android/min android-emulator-min >/dev/null 2>&1 || true ;;
  stop:ios-latest) flox services stop ios-simulator-latest >/dev/null 2>&1 || true ;;
  stop:ios-min) flox services stop -d env/ios/min ios-simulator-min >/dev/null 2>&1 || true ;;
  *)
    echo "Unknown action/target: $action $target"
    echo "Usage: bash scripts/devices.sh [start|stop] [latest|min|all|android-latest|android-min|ios-latest|ios-min]"
    exit 1
    ;;
esac

echo "$action ($target) complete."
