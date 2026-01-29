#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/ios/actions.sh must be sourced." >&2
  exit 1
fi

ios_run() {
  action="${1:-}"
  shift 1 || true

  if [ "$(uname -s)" = "Darwin" ]; then
    # shellcheck disable=SC1090
    . "$SCRIPTS_DIR/ios/env.sh"
  fi

  case "$action" in
    test)
      # shellcheck disable=SC1090
      . "$SCRIPTS_DIR/ios/simctl.sh"
      ios_setup
      yarn install --immutable
      yarn e2e install
      yarn e2e pods
      yarn build
      yarn e2e build:ios
      yarn e2e test:ios
      ;;
    setup)
      # shellcheck disable=SC1090
      . "$SCRIPTS_DIR/ios/simctl.sh"
      ios_setup "$@"
      ;;
    start | stop | reset)
      # shellcheck disable=SC1090
      . "$SCRIPTS_DIR/ios/simctl.sh"
      case "$action" in
        start)
          flavor="${IOS_FLAVOR:-latest}"
          if [ "$flavor" = "custom" ]; then
            if [ -z "${IOS_CUSTOM_DEVICE:-}" ]; then
              echo "IOS_FLAVOR=custom requires IOS_CUSTOM_DEVICE to be set." >&2
              exit 1
            fi
            if [ -n "${IOS_CUSTOM_VERSION:-}" ]; then
              IOS_RUNTIME="${IOS_CUSTOM_VERSION}"
              export IOS_RUNTIME
            fi
            IOS_DEVICE_NAMES="${IOS_CUSTOM_DEVICE}"
            DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-${IOS_CUSTOM_DEVICE}}"
          elif [ "$flavor" = "minsdk" ]; then
            IOS_DEVICE_NAMES="${IOS_MIN_DEVICE:-iPhone 13}"
            DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-${IOS_MIN_DEVICE:-iPhone 13}}"
          else
            IOS_DEVICE_NAMES="${IOS_DEVICE_NAMES:-${IOS_MIN_DEVICE:-iPhone 13},${IOS_MAX_DEVICE:-iPhone 17}}"
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
