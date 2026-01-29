#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/env.sh must be sourced." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root=""
if command -v git >/dev/null 2>&1; then
  repo_root="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$repo_root" ]; then
  repo_root="$(cd "$script_dir/.." && pwd)"
fi

if [ -z "${PROJECT_ROOT:-}" ]; then
  PROJECT_ROOT="$repo_root"
  export PROJECT_ROOT
fi

if [ -z "${SCRIPTS_DIR:-}" ]; then
  SCRIPTS_DIR="$repo_root/scripts"
  export SCRIPTS_DIR
fi

for shared_script in project.sh debug.sh tools.sh defaults.sh; do
  if [ -f "$SCRIPTS_DIR/shared/$shared_script" ]; then
    # shellcheck disable=SC1090
    . "$SCRIPTS_DIR/shared/$shared_script"
  fi
done

if [ "${INIT_ANDROID:-}" = "1" ]; then
  # shellcheck disable=SC1090
  . "$SCRIPTS_DIR/android/env.sh"
fi

if [ "${INIT_IOS:-}" = "1" ] && [ "$(uname -s)" = "Darwin" ]; then
  # shellcheck disable=SC1090
  . "$SCRIPTS_DIR/ios/env.sh"
fi

SHARED_LOADED=1
export SHARED_LOADED
