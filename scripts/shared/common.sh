#!/usr/bin/env sh

require_tool() {
  tool="$1"
  message="${2:-Missing required tool: $tool. Ensure devbox shell is active and required packages are installed.}"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "$message" >&2
    exit 1
  fi
}

ensure_project_root() {
  if [ -n "${PROJECT_ROOT:-}" ]; then
    return 0
  fi

  base_dir="${1:-}"
  if [ -z "$base_dir" ]; then
    base_dir="$PWD"
  fi

  git_root=""
  if command -v git >/dev/null 2>&1; then
    git_root="$(git -C "$base_dir" rev-parse --show-toplevel 2>/dev/null || true)"
  fi

  if [ -n "$git_root" ]; then
    PROJECT_ROOT="$git_root"
  elif [ -f "$base_dir/../shared/common.sh" ] && [ -f "$base_dir/../run.sh" ]; then
    PROJECT_ROOT="$(cd "$base_dir/.." && pwd)"
  elif [ -f "$base_dir/shared/common.sh" ] && [ -f "$base_dir/run.sh" ]; then
    PROJECT_ROOT="$(cd "$base_dir" && pwd)"
  fi

  if [ -n "${PROJECT_ROOT:-}" ]; then
    export PROJECT_ROOT
  fi
}

ensure_project_root "${SCRIPT_DIR:-${script_dir:-${PWD}}}"

if [ -z "${SCRIPTS_DIR:-}" ] && [ -n "${PROJECT_ROOT:-}" ]; then
  SCRIPTS_DIR="$PROJECT_ROOT/scripts"
  export SCRIPTS_DIR
fi

if [ -f "${SCRIPTS_DIR:-}/shared/debug.sh" ]; then
  # shellcheck disable=SC1090
  . "$SCRIPTS_DIR/shared/debug.sh"
  debug_log_script "scripts/shared/common.sh"
fi

if [ -f "${SCRIPTS_DIR:-}/env-defaults.sh" ] && [ "${ENV_DEFAULTS_LOADED:-}" != "1" ]; then
  # shellcheck disable=SC1090
  . "$SCRIPTS_DIR/env-defaults.sh"
fi

COMMON_SH_LOADED=1
export COMMON_SH_LOADED
