#!/usr/bin/env bash
set -euo pipefail

project_root="${PROJECT_ROOT:-}"
if [ -z "$project_root" ] && command -v git >/dev/null 2>&1; then
  project_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$project_root" ]; then
  project_root="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/../../.." && pwd)"
fi
export PROJECT_ROOT="$project_root"
export DEVBOX_PROJECT_ROOT="$project_root"

# Use the device helper to set SDK + PATH without starting anything.
if [ -f "$project_root/scripts/android.sh" ]; then
  # shellcheck disable=SC1091
  . "$project_root/scripts/android.sh"
fi

if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  if [ -z "${ANDROID_AVD_HOME:-}" ]; then
    avd_home="${FLOX_ENV_CACHE:-$HOME/.flox/cache}/android/avd"
    mkdir -p "$avd_home"
    export ANDROID_AVD_HOME="$avd_home"
  fi
  if [ -z "${ANDROID_USER_HOME:-}" ]; then
    export ANDROID_USER_HOME="${ANDROID_AVD_HOME:-$HOME/.android}"
  fi
fi

# Default DETOX_AVD based on arch if not set.
if [ -z "${DETOX_AVD:-}" ]; then
  arch="$(uname -m)"
  if [ "$arch" = "arm64" ] || [ "$arch" = "aarch64" ]; then
    export DETOX_AVD="${ANDROID_AVD_MAX_ARM:-medium_phone_API33_arm64_v8a}"
  else
    export DETOX_AVD="${ANDROID_AVD_MAX_X86:-medium_phone_API33_x86_64}"
  fi
fi
