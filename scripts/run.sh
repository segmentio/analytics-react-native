#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
bootstrap_dir="$script_dir/bootstrap"

if [ "${RUN_SH_ACTIVE:-}" = "1" ]; then
  echo "scripts/run.sh is already running." >&2
  exit 1
fi
RUN_SH_ACTIVE=1
export RUN_SH_ACTIVE

# shellcheck disable=SC1090
. "$bootstrap_dir/init.sh"
load_env "$script_dir"
debug_log_script "scripts/run.sh"

scripts_root="${SCRIPTS_DIR:-$script_dir}"

platform="${1:-}"
action="${2:-}"
shift 2 || true

run_build() {
  yarn install --immutable
  yarn build
  yarn lint
}


case "$platform" in
  android)
    # shellcheck disable=SC1090
    . "$scripts_root/platforms/android/actions.sh"
    android_run "$action" "$@"
    ;;
  ios)
    # shellcheck disable=SC1090
    . "$scripts_root/platforms/ios/actions.sh"
    ios_run "$action" "$@"
    ;;
  build)
    run_build "$@"
    ;;
  *)
    echo "Usage: run.sh {android|ios} <action> [args] | run.sh build" >&2
    exit 1
    ;;
esac
