#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"

if [ "${RUN_SH_ACTIVE:-}" = "1" ]; then
  echo "scripts/run.sh is already running." >&2
  exit 1
fi
RUN_SH_ACTIVE=1
export RUN_SH_ACTIVE

init_path="$script_dir/env.sh"
if [ ! -f "$init_path" ]; then
  repo_root=""
  if command -v git >/dev/null 2>&1; then
    repo_root="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || true)"
  fi
  if [ -n "$repo_root" ] && [ -f "$repo_root/scripts/env.sh" ]; then
    init_path="$repo_root/scripts/env.sh"
  fi
fi
# shellcheck disable=SC1090
. "$init_path"
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
    . "$scripts_root/android/actions.sh"
    android_run "$action" "$@"
    ;;
  ios)
    # shellcheck disable=SC1090
    . "$scripts_root/ios/actions.sh"
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
