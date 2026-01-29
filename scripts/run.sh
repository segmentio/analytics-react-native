#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"

# shellcheck disable=SC1090
. "$script_dir/shared/common.sh"
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

run_act() {
  workflow="${1:-}"
  if [ -n "$workflow" ] && [ "${workflow#-}" = "$workflow" ]; then
    shift 1
    case "$workflow" in
      *.yml | *.yaml)
        workflow_path="$workflow"
        ;;
      *)
        workflow_path=".github/workflows/${workflow}.yml"
        ;;
    esac
  else
    workflow=""
    workflow_path=""
  fi

  JOB=""
  PLATFORMS=""

  host_arch="$(uname -m)"
  if [ "$host_arch" = "arm64" ] || [ "$host_arch" = "aarch64" ]; then
    PLATFORMS="ubuntu-24.04-arm=ghcr.io/catthehacker/ubuntu:act-24.04"
  else
    PLATFORMS="ubuntu-24.04=ghcr.io/catthehacker/ubuntu:act-24.04"
  fi
  PLATFORMS="$PLATFORMS ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-24.04"

  while [ $# -gt 0 ]; do
    case "$1" in
      -j | --job)
        JOB="$2"
        shift 2
        ;;
      -p | --platform)
        PLATFORMS="$PLATFORMS $2"
        shift 2
        ;;
      *)
        echo "Unknown option: $1" >&2
        exit 1
        ;;
    esac
  done

  set -- act --pull=false
  if [ -n "$workflow_path" ]; then
    set -- "$@" -W "$workflow_path"
  fi
  for platform in $PLATFORMS; do
    set -- "$@" --platform "$platform"
  done
  set -- "$@" --input ACT=true
  if [ -n "$JOB" ]; then
    set -- "$@" --job "$JOB"
  fi

  printf 'Running: %s\n' "$*"
  exec "$@"
}

case "$platform" in
  android)
    RUN_MAIN=0
    # shellcheck disable=SC1090
    . "$scripts_root/android/run.sh"
    android_run "$action" "$@"
    ;;
  ios)
    RUN_MAIN=0
    # shellcheck disable=SC1090
    . "$scripts_root/ios/run.sh"
    ios_run "$action" "$@"
    ;;
  build)
    run_build "$@"
    ;;
  act)
    run_act "$@"
    ;;
  *)
    echo "Usage: run.sh {android|ios} <action> [args] | run.sh build | run.sh act <workflow> [args]" >&2
    exit 1
    ;;
esac
