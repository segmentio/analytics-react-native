#!/usr/bin/env sh
set -e

# Resolve repository root for environment setup.
if command -v git >/dev/null 2>&1; then
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "${repo_root:-}" ]; then
  repo_root="$(cd "$(dirname "$0")/.." && pwd)"
fi

export PROJECT_ROOT="$repo_root"
# Backwards compat for scripts that still read these names.
export DEVBOX_REPO_ROOT="$repo_root"
export DEVBOX_PROJECT_ROOT="$repo_root"

. "$PROJECT_ROOT/flox/scripts/android-env.sh"
