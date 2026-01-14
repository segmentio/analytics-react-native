#!/usr/bin/env bash
set -euo pipefail

# Creates an AVD using the Android SDK provided by devbox/flake (system images, emulator, NDK already installed).
# Run inside a devbox shell so SDK tools are available.

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

  local api21_image="system-images;android-21;google_apis;x86_64"

  local image_path="${ANDROID_SDK_ROOT}/system-images/android-21/google_apis/x86_64"
  if [[ ! -d "$image_path" ]]; then
    echo "Expected system image not found at ${image_path}." >&2
    echo "Re-enter the devbox shell (flake should provide images) or rebuild Devbox to fetch them." >&2
    exit 1
  fi

  create_avd "Pixel_API21" "pixel" "$api21_image"

  echo "AVDs ready. Boot with: emulator -avd Pixel_API21 (or MediumPhone_Latest) --netdelay none --netspeed full"
}

main "$@"
