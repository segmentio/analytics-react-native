#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/platforms/android/actions.sh must be sourced." >&2
  exit 1
fi

android_run() {
  action="${1:-}"
  shift 1 || true

  # shellcheck disable=SC1090
  . "$SCRIPTS_DIR/platforms/android/env.sh"

  case "$action" in
    test)
      # shellcheck disable=SC1090
      . "$SCRIPTS_DIR/platforms/android/avd.sh"
      android_setup
      yarn install --immutable
      yarn e2e install
      yarn build
      yarn e2e build:android
      yarn e2e test:android
      ;;
    setup)
      # shellcheck disable=SC1090
      . "$SCRIPTS_DIR/platforms/android/avd.sh"
      android_setup "$@"
      ;;
    start | stop | reset)
      # shellcheck disable=SC1090
      . "$SCRIPTS_DIR/platforms/android/avd.sh"
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
