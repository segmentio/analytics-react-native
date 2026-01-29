#!/usr/bin/env sh
set -eu

# Run GitHub Actions workflows locally via act.
# Usage: scripts/act-ci.sh [--job JOB] [--platform ubuntu-latest=IMAGE]

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/shared/common.sh"
debug_log_script "scripts/act-ci.sh"

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
for platform in $PLATFORMS; do
  set -- "$@" --platform "$platform"
done
set -- "$@" --input ACT=true
if [ -n "$JOB" ]; then
  set -- "$@" --job "$JOB"
fi

printf 'Running: %s\n' "$*"
exec "$@"
