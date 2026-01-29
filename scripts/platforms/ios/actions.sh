#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/platforms/ios/actions.sh must be sourced." >&2
  exit 1
fi

ios_run() {
  action="${1:-}"
  shift 1 || true

  if [ "$(uname -s)" = "Darwin" ]; then
    # shellcheck disable=SC1090
    . "$SCRIPTS_DIR/platforms/ios/env.sh"
  fi

  case "$action" in
    test)
      # shellcheck disable=SC1090
      . "$SCRIPTS_DIR/platforms/ios/simctl.sh"
      target_sdk="${TARGET_SDK:-max}"
      runtime_version=""
      device_name=""
      case "$target_sdk" in
        custom)
          if [ -z "${IOS_CUSTOM_DEVICE:-}" ]; then
            echo "TARGET_SDK=custom requires IOS_CUSTOM_DEVICE to be set." >&2
            exit 1
          fi
          if [ -z "${IOS_RUNTIME_CUSTOM:-}" ]; then
            echo "TARGET_SDK=custom requires IOS_RUNTIME_CUSTOM to be set." >&2
            exit 1
          fi
          runtime_version="${IOS_RUNTIME_CUSTOM}"
          device_name="${IOS_CUSTOM_DEVICE}"
          ;;
        min)
          if [ -z "${IOS_RUNTIME_MIN:-}" ]; then
            echo "TARGET_SDK=min requires IOS_RUNTIME_MIN to be set." >&2
            exit 1
          fi
          runtime_version="${IOS_RUNTIME_MIN}"
          device_name="${IOS_MIN_DEVICE:-iPhone 13}"
          ;;
        max)
          if [ -z "${IOS_RUNTIME_MAX:-}" ]; then
            echo "TARGET_SDK=max requires IOS_RUNTIME_MAX to be set." >&2
            exit 1
          fi
          runtime_version="${IOS_RUNTIME_MAX}"
          device_name="${IOS_MAX_DEVICE:-iPhone 17}"
          ;;
        *)
          echo "Unsupported TARGET_SDK '${target_sdk}'. Use min, max, or custom." >&2
          exit 1
          ;;
      esac

      IOS_RUNTIME="$runtime_version"
      IOS_DEVICE_NAMES="$device_name"
      DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-$device_name}"
      export IOS_RUNTIME IOS_DEVICE_NAMES DETOX_IOS_DEVICE

      ensure_developer_dir
      require_tool jq
      ensure_simctl
      if ! resolve_runtime_name_strict "$runtime_version"; then
        exit 1
      fi
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
      . "$SCRIPTS_DIR/platforms/ios/simctl.sh"
      ios_setup "$@"
      ;;
    start | stop | reset)
      # shellcheck disable=SC1090
      . "$SCRIPTS_DIR/platforms/ios/simctl.sh"
      case "$action" in
        start)
          ensure_developer_dir
          require_tool jq
          ensure_simctl
          target_sdk="${TARGET_SDK:-max}"
          runtime_version=""
          case "$target_sdk" in
            custom)
              if [ -z "${IOS_CUSTOM_DEVICE:-}" ]; then
                echo "TARGET_SDK=custom requires IOS_CUSTOM_DEVICE to be set." >&2
                exit 1
              fi
              if [ -z "${IOS_RUNTIME_CUSTOM:-}" ]; then
                echo "TARGET_SDK=custom requires IOS_RUNTIME_CUSTOM to be set." >&2
                exit 1
              fi
              runtime_version="${IOS_RUNTIME_CUSTOM}"
              IOS_DEVICE_NAMES="${IOS_CUSTOM_DEVICE}"
              DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-${IOS_CUSTOM_DEVICE}}"
              ;;
            min)
              if [ -z "${IOS_RUNTIME_MIN:-}" ]; then
                echo "TARGET_SDK=min requires IOS_RUNTIME_MIN to be set." >&2
                exit 1
              fi
              runtime_version="${IOS_RUNTIME_MIN}"
              IOS_DEVICE_NAMES="${IOS_MIN_DEVICE:-iPhone 13}"
              DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-${IOS_MIN_DEVICE:-iPhone 13}}"
              ;;
            max)
              if [ -z "${IOS_RUNTIME_MAX:-}" ]; then
                echo "TARGET_SDK=max requires IOS_RUNTIME_MAX to be set." >&2
                exit 1
              fi
              runtime_version="${IOS_RUNTIME_MAX}"
              IOS_DEVICE_NAMES="${IOS_MAX_DEVICE:-iPhone 17}"
              DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-${IOS_MAX_DEVICE:-iPhone 17}}"
              ;;
            *)
              echo "Unsupported TARGET_SDK '${target_sdk}'. Use min, max, or custom." >&2
              exit 1
              ;;
          esac
          export IOS_DEVICE_NAMES DETOX_IOS_DEVICE
          if [ -n "$runtime_version" ]; then
            if ! resolve_runtime_name_strict "$runtime_version"; then
              exit 1
            fi
            IOS_RUNTIME="$runtime_version"
            export IOS_RUNTIME
          fi
          ios_setup
          sim_device="${DETOX_IOS_DEVICE}"
          runtime_name="$(resolve_runtime_name "${runtime_version:-}" || true)"
          display_name="$sim_device"
          if [ -n "$runtime_name" ]; then
            display_name="${sim_device} (${runtime_name})"
          fi

          sim_udid="$(existing_device_udid_any_runtime "$display_name")"
          if [ -z "$sim_udid" ]; then
            sim_udid="$(existing_device_udid_any_runtime "$sim_device")"
          fi
          if [ -z "$sim_udid" ]; then
            ensure_device "$sim_device" "${runtime_version:-}"
            sim_udid="$(existing_device_udid_any_runtime "$display_name")"
          fi
          if [ -z "$sim_udid" ]; then
            echo "Simulator ${sim_device} not found; ensure setup-ios created it." >&2
            exit 1
          fi
          echo "Starting iOS simulator: ${sim_device} (runtime ${runtime_version:-})"
          xcrun simctl boot "$sim_udid" || true
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
