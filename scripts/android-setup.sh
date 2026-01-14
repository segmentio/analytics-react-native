#!/usr/bin/env bash
set -euo pipefail

# Creates AVDs using the Android SDK provided by devbox/flake (system images, emulator, NDK already installed).
# Run inside a devbox shell so SDK tools are available.
# Configurable via env:
#   AVD_API (default 21)
#   AVD_DEVICE (default "pixel")
#   AVD_TAG (default "google_apis")
#   AVD_ABI (preferred ABI; optional)
#   AVD_NAME (override final AVD name; otherwise computed)
# Secondary AVD (created in addition to the primary):
#   AVD_SECONDARY_API (default 33)
#   AVD_SECONDARY_DEVICE (default "medium_phone")
#   AVD_SECONDARY_TAG (default "google_apis")
#   AVD_SECONDARY_ABI (preferred ABI; optional)
#   AVD_SECONDARY_NAME (override final name)

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1. Ensure devbox shell is active and required packages are installed." >&2
    exit 1
  fi
}

detect_sdk_root() {
  if [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    echo "$ANDROID_SDK_ROOT"
    return
  fi

  local sm
  sm="$(command -v sdkmanager 2>/dev/null || true)"
  if [[ -z "$sm" ]]; then
    return
  fi
  sm="$(readlink -f "$sm")"
  local candidates=(
    "$(dirname "$sm")/.."
    "$(dirname "$sm")/../share/android-sdk"
    "$(dirname "$sm")/../libexec/android-sdk"
    "$(dirname "$sm")/../.."
  )
  for c in "${candidates[@]}"; do
    if [[ -d "$c/platform-tools" || -d "$c/platforms" || -d "$c/system-images" ]]; then
      echo "$c"
      return
    fi
  done
}

avd_exists() {
  local name="$1"
  avdmanager list avd | grep -q "Name: ${name}"
}

pick_image() {
  local api="$1" tag="$2" preferred_abi="$3"
  local host_arch
  host_arch="$(uname -m)"

  local candidates=()
  if [[ -n "${preferred_abi:-}" ]]; then
    candidates=("$preferred_abi")
  else
    case "$host_arch" in
      arm64|aarch64) candidates=("arm64-v8a" "x86_64" "x86") ;;
      *) candidates=("x86_64" "x86" "arm64-v8a") ;;
    esac
  fi

  for abi in "${candidates[@]}"; do
    local image="system-images;android-${api};${tag};${abi}"
    local path="${ANDROID_SDK_ROOT}/system-images/android-${api}/${tag}/${abi}"
    if [[ -d "$path" ]]; then
      echo "$image"
      return 0
    fi
  done

  return 1
}

create_avd() {
  local name="$1" device="$2" image="$3"
  local abi="${image##*;}"

  if avd_exists "$name"; then
    echo "AVD ${name} already exists."
    return 0
  fi

  echo "Creating AVD ${name} with ${image}..."
  avdmanager create avd --force --name "$name" --package "$image" --device "$device" --abi "$abi" --sdcard 512M
}

main() {
  local detected_sdk_root
  detected_sdk_root="$(detect_sdk_root)"

  if [[ -z "${ANDROID_SDK_ROOT:-}" && -n "$detected_sdk_root" ]]; then
    export ANDROID_SDK_ROOT="$detected_sdk_root"
  fi

  if [[ -z "${ANDROID_SDK_ROOT:-}" && -z "${ANDROID_HOME:-}" ]]; then
    echo "ANDROID_SDK_ROOT/ANDROID_HOME must be set. In a devbox shell, the flake-provided SDK should supply sdkmanager in PATH; if not, set ANDROID_SDK_ROOT to the flake's android-sdk path." >&2
    exit 1
  fi

  export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"

  require_tool avdmanager
  require_tool emulator

  local primary_api="${AVD_API:-21}"
  local primary_tag="${AVD_TAG:-google_apis}"
  local primary_device="${AVD_DEVICE:-pixel}"
  local primary_preferred_abi="${AVD_ABI:-}"

  local secondary_api="${AVD_SECONDARY_API:-33}"
  local secondary_tag="${AVD_SECONDARY_TAG:-google_apis}"
  local secondary_device="${AVD_SECONDARY_DEVICE:-medium_phone}"
  local secondary_preferred_abi="${AVD_SECONDARY_ABI:-}"

  local targets=(
    "$primary_api|$primary_tag|$primary_device|$primary_preferred_abi|${AVD_NAME:-}"
    "$secondary_api|$secondary_tag|$secondary_device|$secondary_preferred_abi|${AVD_SECONDARY_NAME:-}"
  )

  for target in "${targets[@]}"; do
    IFS="|" read -r api tag device preferred_abi name_override <<<"$target"

    local api_image
    if ! api_image="$(pick_image "$api" "$tag" "$preferred_abi")"; then
      echo "Expected API ${api} system image (${tag}; preferred ABI ${preferred_abi:-auto}) not found under ${ANDROID_SDK_ROOT}/system-images/android-${api}." >&2
      echo "Re-enter the devbox shell (flake should provide images) or rebuild Devbox to fetch them." >&2
      continue
    fi

    local abi="${api_image##*;}"
    local avd_name="${name_override:-$(printf '%s_API%s_%s' "$device" "$api" "${abi//-/_}")}"

    create_avd "$avd_name" "$device" "$api_image"
    if avd_exists "$avd_name"; then
      echo "AVD ready: ${avd_name} (${api_image})"
    fi
  done

  echo "AVDs ready. Boot with: emulator -avd <name> --netdelay none --netspeed full"
}

main "$@"
