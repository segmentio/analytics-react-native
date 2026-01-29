#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/bootstrap/env.sh must be sourced." >&2
  exit 1
fi

if [ "${ENV_SH_LOADED:-}" = "1" ] && [ "${ENV_SH_LOADED_PID:-}" = "$$" ]; then
  return 0 2>/dev/null || exit 0
fi
ENV_SH_LOADED=1
ENV_SH_LOADED_PID="$$"

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root=""
if [ -n "${DEVBOX_PROJECT_ROOT:-}" ] && [ -d "$DEVBOX_PROJECT_ROOT" ]; then
  repo_root="$DEVBOX_PROJECT_ROOT"
elif [ -n "${DEVBOX_PROJECT_DIR:-}" ] && [ -d "$DEVBOX_PROJECT_DIR" ]; then
  repo_root="$DEVBOX_PROJECT_DIR"
elif command -v git >/dev/null 2>&1; then
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

if [ -z "${IOS_NODE_BINARY:-}" ] && command -v node >/dev/null 2>&1; then
  IOS_NODE_BINARY="$(command -v node)"
  export IOS_NODE_BINARY
fi

if [ -z "${IOS_XCODE_ENV_PATH:-}" ] && [ -n "${PROJECT_ROOT:-}" ]; then
  xcode_env_path="$PROJECT_ROOT/examples/E2E/ios/.xcode.env"
  if [ -d "$PROJECT_ROOT/examples/E2E/ios" ]; then
    IOS_XCODE_ENV_PATH="$xcode_env_path"
    export IOS_XCODE_ENV_PATH
  fi
fi

if [ "${INIT_ANDROID:-}" = "1" ]; then
  # shellcheck disable=SC1090
  . "$SCRIPTS_DIR/platforms/android/env.sh"
fi

if [ "${INIT_IOS:-}" = "1" ] && [ "$(uname -s)" = "Darwin" ]; then
  # shellcheck disable=SC1090
  . "$SCRIPTS_DIR/platforms/ios/env.sh"
fi

SHARED_LOADED=1
SHARED_LOADED_PID="$$"
