#!/usr/bin/env bash
set -euo pipefail

action="${1:-}"
shift || true

start_ios() {
  local flavor="${IOS_FLAVOR:-latest}"
  if [[ "$flavor" == "minsdk" ]]; then
    export IOS_DEVICE_NAMES="iPhone 13"
    export IOS_RUNTIME="15.0"
    export DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-iPhone 13}"
  else
    export IOS_DEVICE_NAMES="${IOS_DEVICE_NAMES:-iPhone 13,iPhone 17}"
    export IOS_RUNTIME="${IOS_RUNTIME:-26.1}"
    export DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-iPhone 17}"
  fi

  devbox run setup-ios
  local sim_device="${DETOX_IOS_DEVICE}"
  if ! xcrun simctl list devices | grep -q "${sim_device}"; then
    echo "Simulator ${sim_device} not found; ensure setup-ios created it." >&2
    exit 1
  fi
  echo "Starting iOS simulator: ${sim_device} (runtime ${IOS_RUNTIME})"
  xcrun simctl boot "$sim_device" || true
  open -a Simulator
}

stop_ios() {
  devbox run stop-ios
}

reset_ios() {
  devbox run reset-ios
}

case "$action" in
  start) start_ios ;;
  stop) stop_ios ;;
  reset) reset_ios ;;
  *) echo "Usage: ios-manager.sh {start|stop|reset}" >&2; exit 1 ;;
esac
