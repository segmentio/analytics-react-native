#!/usr/bin/env bash
set -euo pipefail

# Installs required Android system images and creates AVDs for Pixel (API 21) and medium_phone (latest).
# Run inside a devbox shell so SDK tools are available.

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1. Ensure devbox shell is active and required packages are installed." >&2
    exit 1
  fi
}

accept_licenses() {
  yes | sdkmanager --licenses >/dev/null
}

install_package() {
  local pkg="$1"
  echo "Installing ${pkg} (if needed)..."
  yes | sdkmanager "$pkg" >/dev/null
}

latest_google_apis_image() {
  sdkmanager --list | tr -d '\r' | grep -o 'system-images;android-[0-9][0-9]*;google_apis;[^ ]*' | sort -t'-' -k2,2n | tail -n1
}

avd_exists() {
  local name="$1"
  avdmanager list avd | grep -q "Name: ${name}"
}

ensure_cmdline_tools() {
  if command -v avdmanager >/dev/null 2>&1; then
    return 0
  fi
  echo "Installing Android cmdline-tools (required for avdmanager)..."
  yes | sdkmanager "cmdline-tools;latest" >/dev/null
  export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$PATH"
  if ! command -v avdmanager >/dev/null 2>&1; then
    echo "avdmanager still unavailable after installing cmdline-tools. Check ANDROID_SDK_ROOT and sdkmanager output." >&2
    exit 1
  fi
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
  if [[ -z "${ANDROID_SDK_ROOT:-}" && -z "${ANDROID_HOME:-}" ]]; then
    echo "ANDROID_SDK_ROOT/ANDROID_HOME must be set (devbox shell init sets these)." >&2
    exit 1
  fi
  require_tool sdkmanager

  ensure_cmdline_tools
  install_package "platform-tools"
  install_package "emulator"
  accept_licenses

  local api21_image="system-images;android-21;google_apis;x86_64"
  install_package "platforms;android-21"
  install_package "$api21_image"
  create_avd "Pixel_API21" "pixel" "$api21_image"

  if latest_image=$(latest_google_apis_image); then
    install_package "$latest_image"
    create_avd "MediumPhone_Latest" "medium_phone" "$latest_image"
  else
    echo "Could not determine latest google_apis system image. Check sdkmanager --list output." >&2
  fi

  echo "AVDs ready. Boot with: emulator -avd Pixel_API21 (or MediumPhone_Latest) --netdelay none --netspeed full"
}

main "$@"
