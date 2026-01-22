#!/usr/bin/env sh
set -e

# Resolve repository root even when using alternate Devbox configs.
if command -v git >/dev/null 2>&1; then
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "${repo_root:-}" ]; then
  repo_root="$(cd "$(dirname "$0")/.." && pwd)"
fi

export DEVBOX_REPO_ROOT="$repo_root"
export DEVBOX_PROJECT_ROOT="$repo_root"

echo 'Welcome to analytics-react-native devbox!' > /dev/null
. "$DEVBOX_PROJECT_ROOT/scripts/android-env.sh"
echo 'Android SDK env configured (details: wiki/devbox.md#devbox-android).' > /dev/null
