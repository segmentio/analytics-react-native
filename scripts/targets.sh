#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/targets.sh profile <ios-min|ios-max|android-min|android-max>
Prints env exports for the requested profile. Environment variables take precedence; otherwise values come from env/common/.flox/env/manifest.lock with sensible fallbacks.

Example:
  eval "$(scripts/targets.sh profile ios-min)"
  IOS_RUNTIME=17.0 scripts/targets.sh profile ios-max   # quick override
EOF
}

project_root="${PROJECT_ROOT:-}"
if [ -z "$project_root" ] && command -v git >/dev/null 2>&1; then
  project_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$project_root" ]; then
  project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

lock_path="$project_root/env/common/.flox/env/manifest.lock"
manifest_path="$project_root/env/common/.flox/env/manifest.toml"

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required to read flox manifests. Install jq and retry." >&2
    exit 1
  fi
}

lock_var() {
  local key="$1" default="${2:-}"
  if [ -n "${!key:-}" ]; then
    printf '%s' "${!key}"
    return
  fi
  if [ -f "$lock_path" ]; then
    require_jq
    local val
    val="$(jq -r --arg k "$key" '.manifest.vars[$k] // ""' "$lock_path")"
    if [ -n "$val" ] && [ "$val" != "null" ]; then
      printf '%s' "$val"
      return
    fi
  fi
  if [ -f "$manifest_path" ]; then
    local val
    val="$(python3 - <<'PY' "$manifest_path" "$key" 2>/dev/null || true)"
import sys
import tomllib

manifest_path = sys.argv[1]
key = sys.argv[2]
data = tomllib.load(open(manifest_path, "rb"))
print(data.get("vars", {}).get(key, ""))
PY
    )"
    if [ -n "$val" ]; then
      printf '%s' "$val"
      return
    fi
  fi
  printf '%s' "$default"
}

host_arch() {
  uname -m
}

infer_abi_from_avd() {
  case "$1" in
    *arm64* | *arm64-v8a* | *arm64_v8a*) echo "arm64-v8a" ;;
    *x86_64*) echo "x86_64" ;;
    *x86*) echo "x86" ;;
    *) echo "" ;;
  esac
}

ios_profile() {
  local tier="$1"
  local fallback_min_runtime="15.0"
  local fallback_max_runtime=""
  local fallback_min_device="iPhone 13"
  local fallback_max_device="iPhone 17"

  local runtime device
  if [ "$tier" = "min" ]; then
    runtime="${IOS_RUNTIME:-$(lock_var IOS_MIN_RUNTIME "$fallback_min_runtime")}"
    device="${IOS_DEVICE:-${IOS_DEVICE_NAMES:-$(lock_var IOS_MIN_DEVICE "$fallback_min_device")}}"
  else
    runtime="${IOS_RUNTIME:-$(lock_var IOS_MAX_RUNTIME "$fallback_max_runtime")}"
    device="${IOS_DEVICE:-${IOS_DEVICE_NAMES:-$(lock_var IOS_MAX_DEVICE "$fallback_max_device")}}"
  fi

  local device_names="${IOS_DEVICE_NAMES:-$device}"
  local detox_device="${DETOX_IOS_DEVICE:-$device}"

  echo "IOS_RUNTIME=${runtime}"
  echo "IOS_DEVICE_NAMES=${device_names}"
  echo "IOS_DEVICE=${device}"
  echo "DETOX_IOS_DEVICE=${detox_device}"
  if [ "$tier" = "min" ]; then
    echo "IOS_FLAVOR=minsdk"
    echo "IOS_TARGET=min"
  else
    echo "IOS_FLAVOR=max"
    echo "IOS_TARGET=max"
  fi
}

android_profile() {
  local tier="$1"
  local arch
  arch="$(host_arch)"

  local fallback_min_api="21"
  local fallback_max_api="33"
  local fallback_min_avd_x64="pixel_API21_x86_64"
  local fallback_min_avd_arm="pixel_API21_arm64_v8a"
  local fallback_max_avd_x64="medium_phone_API33_x86_64"
  local fallback_max_avd_arm="medium_phone_API33_arm64_v8a"

  local api avd
  if [ "$tier" = "min" ]; then
    api="${ANDROID_API:-${ANDROID_MIN_API:-$(lock_var ANDROID_MIN_API "$fallback_min_api")}}"
    if [ "$arch" = "arm64" ] || [ "$arch" = "aarch64" ]; then
      avd="${DETOX_AVD:-$(lock_var ANDROID_MIN_AVD_ARM "$fallback_min_avd_arm")}"
    else
      avd="${DETOX_AVD:-$(lock_var ANDROID_MIN_AVD "$fallback_min_avd_x64")}"
    fi
  else
    api="${ANDROID_API:-${ANDROID_MAX_API:-$(lock_var ANDROID_MAX_API "$fallback_max_api")}}"
    if [ "$arch" = "arm64" ] || [ "$arch" = "aarch64" ]; then
      avd="${DETOX_AVD:-$(lock_var ANDROID_MAX_AVD_ARM "$fallback_max_avd_arm")}"
    else
      avd="${DETOX_AVD:-$(lock_var ANDROID_MAX_AVD_X64 "$fallback_max_avd_x64")}"
    fi
  fi

  local abi
  abi="$(infer_abi_from_avd "$avd")"
  local system_image=""
  if [ -n "$abi" ]; then
    system_image="system-images;android-${api};google_apis;${abi}"
  fi

  echo "ANDROID_API=${api}"
  echo "DETOX_AVD=${avd}"
  [ -n "$system_image" ] && echo "ANDROID_SYSTEM_IMAGE=${system_image}"
  if [ "$tier" = "min" ]; then
    echo "AVD_FLAVOR=minsdk"
    echo "ANDROID_TARGET=min"
  else
    echo "AVD_FLAVOR=max"
    echo "ANDROID_TARGET=max"
  fi
}

cmd="${1:-}"
if [ "$cmd" != "profile" ] || [ $# -lt 2 ]; then
  usage
  exit 1
fi

case "$2" in
  ios-min) ios_profile min ;;
  ios-max) ios_profile max ;;
  android-min) android_profile min ;;
  android-max) android_profile max ;;
  *) usage; exit 1 ;;
esac
