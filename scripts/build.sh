#!/usr/bin/env bash
set -euo pipefail

target="${1:-libs}"

project_root="${PROJECT_ROOT:-${DEVBOX_PROJECT_ROOT:-}}"
if [ -z "$project_root" ]; then
  project_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi
cd "$project_root"

yarn install --immutable

build_libs() {
  local since_flags=()
  if [[ -n "${BUILD_SINCE_REF:-}" ]]; then
    since_flags=(--since "${BUILD_SINCE_REF}")
  fi
  if [[ ${#since_flags[@]} -gt 0 ]]; then
    yarn workspaces foreach -A --topological-dev -p "${since_flags[@]}" run build
  else
    yarn workspaces foreach -A --topological-dev -p run build
  fi
}

case "$target" in
  libs|workspaces|default) build_libs ;;
  fast) build_libs ;;
  full)
    build_libs
    yarn lint
    yarn test --coverage
    ;;
  *)
    echo "Unknown build target: $target"
    echo "Valid targets: libs (default), fast, full"
    exit 1
    ;;
esac

echo "Build ($target) complete."
