#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/bootstrap/init.sh must be sourced." >&2
  exit 1
fi

load_env() {
  script_dir="$1"
  init_path="$script_dir/bootstrap/env.sh"
  if [ -n "${DEVBOX_PROJECT_ROOT:-}" ] && [ -f "${DEVBOX_PROJECT_ROOT}/scripts/bootstrap/env.sh" ]; then
    init_path="${DEVBOX_PROJECT_ROOT}/scripts/bootstrap/env.sh"
  elif [ -n "${DEVBOX_PROJECT_DIR:-}" ] && [ -f "${DEVBOX_PROJECT_DIR}/scripts/bootstrap/env.sh" ]; then
    init_path="${DEVBOX_PROJECT_DIR}/scripts/bootstrap/env.sh"
  fi
  if [ ! -f "$init_path" ]; then
    repo_root=""
    if command -v git >/dev/null 2>&1; then
      repo_root="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || true)"
    fi
    if [ -n "$repo_root" ] && [ -f "$repo_root/scripts/bootstrap/env.sh" ]; then
      init_path="$repo_root/scripts/bootstrap/env.sh"
    fi
  fi
  # shellcheck disable=SC1090
  . "$init_path"
}
