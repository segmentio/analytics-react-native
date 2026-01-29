#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

PROJECT_ROOT="$repo_root"
SCRIPTS_DIR="$repo_root/scripts"
export PROJECT_ROOT SCRIPTS_DIR

# shellcheck disable=SC1090
. "$repo_root/scripts/shared/common.sh"

if [ "${DEVBOX_INIT_IOS:-}" = "1" ] && [ "$(uname -s)" = "Darwin" ]; then
  # shellcheck disable=SC1090
  . "$SCRIPTS_DIR/ios/env.sh"
fi

if [ "${DEVBOX_INIT_ANDROID:-}" = "1" ]; then
  # shellcheck disable=SC1090
  . "$SCRIPTS_DIR/android/env.sh"
  if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "Android SDK env configured (details: wiki/devbox.md#devbox-android)."
  fi
fi
