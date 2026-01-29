#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"

if [ -z "${COMMON_SH_LOADED:-}" ]; then
  # shellcheck disable=SC1090
  . "$script_dir/../shared/common.sh"
fi

scripts_root="${SCRIPTS_DIR:-$(cd "$script_dir/.." && pwd)}"
debug_log_script "scripts/android/run.sh"

android_run() {
  action="${1:-}"
  shift 1 || true

  # shellcheck disable=SC1090
  . "$scripts_root/android/env.sh"

  case "$action" in
    test)
      RUN_MAIN=0
      # shellcheck disable=SC1090
      . "$scripts_root/android/avd.sh"
      android_setup
      yarn e2e install
      yarn build
      yarn e2e build:android
      yarn e2e test:android
      ;;
    setup)
      RUN_MAIN=0
      # shellcheck disable=SC1090
      . "$scripts_root/android/avd.sh"
      android_setup "$@"
      ;;
    start | stop | reset)
      RUN_MAIN=0
      # shellcheck disable=SC1090
      . "$scripts_root/android/avd.sh"
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

if [ "${RUN_MAIN:-1}" = "1" ]; then
  android_run "$@"
fi
