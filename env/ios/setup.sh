#!/usr/bin/env bash
set -euo pipefail

project_root="${PROJECT_ROOT:-}"
if [ -z "$project_root" ] && command -v git >/dev/null 2>&1; then
  project_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$project_root" ]; then
  project_root="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/../.." && pwd)"
fi
export PROJECT_ROOT="$project_root"

if [ -z "${DETOX_IOS_DEVICE:-}" ]; then
  if [ "${IOS_FLAVOR:-}" = "minsdk" ] || [ "${IOS_TARGET:-}" = "min" ]; then
    export DETOX_IOS_DEVICE="${IOS_DEVICE_NAMES:-${IOS_MIN_DEVICE:-${IOS_SIM_DEVICE:-${IOS_SIM_MAX_DEVICE:-iPhone 17}}}}"
  else
    export DETOX_IOS_DEVICE="${IOS_DEVICE_NAMES:-${IOS_MAX_DEVICE:-${IOS_SIM_DEVICE:-${IOS_SIM_MAX_DEVICE:-iPhone 17}}}}"
  fi
fi
