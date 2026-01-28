#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"
load_platform_versions "$script_dir"

action="${1:-}"
shift || true

start_ios() {
  flavor="${IOS_FLAVOR:-latest}"
  if [ "$flavor" = "minsdk" ]; then
    IOS_DEVICE_NAMES="${IOS_MIN_DEVICE:-${PLATFORM_IOS_MIN_DEVICE:-iPhone 13}}"
    IOS_RUNTIME="${IOS_MIN_RUNTIME:-${PLATFORM_IOS_MIN_RUNTIME:-15.0}}"
    DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-${IOS_MIN_DEVICE:-${PLATFORM_IOS_MIN_DEVICE:-iPhone 13}}}"
    export IOS_DEVICE_NAMES IOS_RUNTIME DETOX_IOS_DEVICE
  else
    IOS_DEVICE_NAMES="${IOS_DEVICE_NAMES:-${IOS_MIN_DEVICE:-${PLATFORM_IOS_MIN_DEVICE:-iPhone 13}},${IOS_MAX_DEVICE:-${PLATFORM_IOS_MAX_DEVICE:-iPhone 17}}}"
    IOS_RUNTIME="${IOS_RUNTIME:-${IOS_MAX_RUNTIME:-${PLATFORM_IOS_MAX_RUNTIME:-}}}"
    DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-iPhone 17}"
    export IOS_DEVICE_NAMES IOS_RUNTIME DETOX_IOS_DEVICE
  fi

  devbox run setup-ios
  sim_device="${DETOX_IOS_DEVICE}"
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
  *)
    echo "Usage: manager.sh {start|stop|reset}" >&2
    exit 1
    ;;
 esac
