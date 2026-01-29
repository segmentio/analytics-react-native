#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/shared/project.sh must be sourced." >&2
  exit 1
fi

if [ "${PROJECT_SH_LOADED:-}" = "1" ] && [ "${PROJECT_SH_LOADED_PID:-}" = "$$" ]; then
  return 0 2>/dev/null || exit 0
fi
PROJECT_SH_LOADED=1
PROJECT_SH_LOADED_PID="$$"

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
  elif [ -f "$base_dir/../shared/project.sh" ] && [ -f "$base_dir/../run.sh" ]; then
    PROJECT_ROOT="$(cd "$base_dir/.." && pwd)"
  elif [ -f "$base_dir/shared/project.sh" ] && [ -f "$base_dir/run.sh" ]; then
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
