#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

# shellcheck disable=SC1090
. "$repo_root/scripts/shared/common.sh"
debug_log_script "scripts/entry/run.sh"

platform="${1:-}"
action="${2:-}"
shift 2 || true

run_android() {
  # shellcheck disable=SC1090
  . "$repo_root/scripts/android/env.sh"

  case "$action" in
    test)
      RUN_MAIN=0
      # shellcheck disable=SC1090
      . "$repo_root/scripts/android/avd.sh"
      android_setup
      yarn e2e install
      yarn build
      yarn e2e build:android
      yarn e2e test:android
      ;;
    setup)
      RUN_MAIN=0
      # shellcheck disable=SC1090
      . "$repo_root/scripts/android/avd.sh"
      android_setup "$@"
      ;;
    start | stop | reset)
      RUN_MAIN=0
      # shellcheck disable=SC1090
      . "$repo_root/scripts/android/avd.sh"
      case "$action" in
        start) android_start "$@" ;;
        stop) android_stop "$@" ;;
        reset) android_reset "$@" ;;
      esac
      ;;
    *)
      echo "Usage: run.sh android {test|setup|start|stop|reset} [args]" >&2
      exit 1
      ;;
  esac
}

run_ios() {
  if [ "$(uname -s)" = "Darwin" ]; then
    # shellcheck disable=SC1090
    . "$repo_root/scripts/ios/env.sh"
  fi

  case "$action" in
    test)
      RUN_MAIN=0
      # shellcheck disable=SC1090
      . "$repo_root/scripts/ios/simctl.sh"
      ios_setup
      yarn e2e install
      yarn e2e pods
      yarn build
      yarn e2e build:ios
      yarn e2e test:ios
      ;;
    setup)
      RUN_MAIN=0
      # shellcheck disable=SC1090
      . "$repo_root/scripts/ios/simctl.sh"
      ios_setup "$@"
      ;;
    start | stop | reset)
      RUN_MAIN=0
      # shellcheck disable=SC1090
      . "$repo_root/scripts/ios/simctl.sh"
      case "$action" in
        start)
          flavor="${IOS_FLAVOR:-latest}"
          if [ "$flavor" = "minsdk" ]; then
            IOS_DEVICE_NAMES="${IOS_MIN_DEVICE:-${PLATFORM_IOS_MIN_DEVICE:-iPhone 13}}"
            DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-${IOS_MIN_DEVICE:-${PLATFORM_IOS_MIN_DEVICE:-iPhone 13}}}"
          else
            IOS_DEVICE_NAMES="${IOS_DEVICE_NAMES:-${IOS_MIN_DEVICE:-${PLATFORM_IOS_MIN_DEVICE:-iPhone 13}},${IOS_MAX_DEVICE:-${PLATFORM_IOS_MAX_DEVICE:-iPhone 17}}}"
            DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-iPhone 17}"
          fi
          export IOS_DEVICE_NAMES DETOX_IOS_DEVICE
          ios_setup
          sim_device="${DETOX_IOS_DEVICE}"
          if ! xcrun simctl list devices | grep -q "${sim_device}"; then
            echo "Simulator ${sim_device} not found; ensure setup-ios created it." >&2
            exit 1
          fi
          echo "Starting iOS simulator: ${sim_device} (runtime ${IOS_RUNTIME:-})"
          xcrun simctl boot "$sim_device" || true
          if [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
            open -a Simulator
          fi
          ;;
        stop)
          if command -v xcrun >/dev/null 2>&1 && xcrun -f simctl >/dev/null 2>&1; then
            if xcrun simctl list devices booted | grep -q "Booted"; then
              echo "Shutting down booted iOS simulators..."
              xcrun simctl shutdown all >/dev/null 2>&1 || true
            else
              echo "No booted iOS simulators detected."
            fi
          else
            echo "simctl not available; skipping iOS shutdown."
          fi
          echo "iOS simulators shutdown (if any were running)."
          ;;
        reset)
          xcrun simctl shutdown all || true
          xcrun simctl erase all || true
          xcrun simctl delete all || true
          xcrun simctl delete unavailable || true
          killall -9 com.apple.CoreSimulatorService 2>/dev/null || true
          echo "Simulators reset via simctl. Recreate via start-ios."
          ;;
      esac
      ;;
    *)
      echo "Usage: run.sh ios {test|setup|start|stop|reset} [args]" >&2
      exit 1
      ;;
  esac
}

case "$platform" in
  android) run_android "$@" ;;
  ios) run_ios "$@" ;;
  build)
    RUN_MAIN=0
    # shellcheck disable=SC1090
    . "$repo_root/scripts/build.sh"
    build_project "$@"
    ;;
  *)
    echo "Usage: run.sh {android|ios} <action> [args] | run.sh build" >&2
    exit 1
    ;;
esac
