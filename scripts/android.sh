#!/usr/bin/env bash
set -euo pipefail

# Helper to set ANDROID_SDK_ROOT/ANDROID_HOME/PATH from the flake if not already set.
setup_android_env() {
  if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -z "${ANDROID_HOME:-}" ]; then
    project_root="${PROJECT_ROOT:-${PWD}}"
    sdk_out=$(
      nix --extra-experimental-features 'nix-command flakes' \
        eval --raw "path:${project_root}/env/android/latest#android-sdk-latest.outPath" 2>/dev/null || \
      nix --extra-experimental-features 'nix-command flakes' \
        eval --raw "path:${project_root}/env/android/min#android-sdk-min.outPath" 2>/dev/null || true
    )
    if [ -n "${sdk_out:-}" ] && [ -d "$sdk_out/libexec/android-sdk" ]; then
      ANDROID_SDK_ROOT="$sdk_out/libexec/android-sdk"
      ANDROID_HOME="$ANDROID_SDK_ROOT"
    fi
  fi

  if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -n "${ANDROID_HOME:-}" ]; then
    ANDROID_SDK_ROOT="$ANDROID_HOME"
  fi

  if [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -z "${ANDROID_HOME:-}" ]; then
    ANDROID_HOME="$ANDROID_SDK_ROOT"
  fi

  export ANDROID_SDK_ROOT ANDROID_HOME

  if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
    cmdline_tools_bin=""
    if [ -d "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin" ]; then
      cmdline_tools_bin="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"
    else
      cmdline_tools_dir=$(find "$ANDROID_SDK_ROOT/cmdline-tools" -maxdepth 1 -mindepth 1 -type d -not -name latest 2>/dev/null | sort -V | tail -n 1)
      if [ -n "${cmdline_tools_dir:-}" ] && [ -d "$cmdline_tools_dir/bin" ]; then
        cmdline_tools_bin="$cmdline_tools_dir/bin"
      fi
    fi

    new_path="$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools"

    if [ -n "${cmdline_tools_bin:-}" ]; then
      new_path="$new_path:$cmdline_tools_bin"
    fi

    new_path="$new_path:$ANDROID_SDK_ROOT/tools/bin:$PATH"
    PATH="$new_path"
    export PATH
  fi
}

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1. Ensure the Android SDK is available in PATH." >&2
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
  if command -v greadlink >/dev/null 2>&1; then
    sm="$(greadlink -f "$sm")"
  else
    sm="$(cd "$(dirname "$sm")" && pwd)/$(basename "$sm")"
  fi
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
  yes "" | avdmanager create avd --force --name "$name" --package "$image" --device "$device" --abi "$abi" --sdcard 512M
}

ensure_avd() {
  local name="$1" api="$2" device="$3" tag="$4" preferred_abi="$5"

  if avd_exists "$name"; then
    return 0
  fi

  local api_image
  if ! api_image="$(pick_image "$api" "$tag" "$preferred_abi")"; then
    echo "Expected API ${api} system image (${tag}; preferred ABI ${preferred_abi:-auto}) not found under ${ANDROID_SDK_ROOT}/system-images/android-${api}." >&2
    return 1
  fi

  create_avd "$name" "$device" "$api_image"
}

setup_android_env

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  # Only environment setup when sourced.
  return 0
fi

action="${1:-}"; shift || true

start_android() {
  local flavor="${AVD_FLAVOR:-minsdk}" headless="${EMU_HEADLESS:-}" port="${EMU_PORT:-5554}"
  local avd="${DETOX_AVD:-}"
  local host_arch
  host_arch="$(uname -m)"

  require_tool avdmanager
  require_tool emulator

  if [[ -z "$avd" ]]; then
    if [[ "$host_arch" == "arm64" || "$host_arch" == "aarch64" ]]; then
      avd="medium_phone_API33_arm64_v8a"
    else
      avd="medium_phone_API33_x86_64"
    fi
  fi

  local api_hint="" device_hint="" abi_hint=""
  if [[ "$avd" =~ _API([0-9]+)_ ]]; then
    api_hint="${BASH_REMATCH[1]}"
  fi
  if [[ "$avd" == medium_phone_* ]]; then
    device_hint="medium_phone"
  elif [[ "$avd" == pixel_* ]]; then
    device_hint="pixel"
  fi
  if [[ "$avd" =~ _API[0-9]+_(.+)$ ]]; then
    case "${BASH_REMATCH[1]}" in
      arm64_v8a) abi_hint="arm64-v8a" ;;
      armeabi_v7a) abi_hint="armeabi-v7a" ;;
      *) abi_hint="${BASH_REMATCH[1]}" ;;
    esac
  fi

  local target_serial="emulator-${port}"

  if ! avd_exists "${avd}"; then
    local env_args=(
      "$avd"
      "${api_hint:-33}"
      "${device_hint:-medium_phone}"
      "google_apis"
      "${abi_hint:-}"
    )
    if [[ -z "$abi_hint" && ( "$host_arch" == "arm64" || "$host_arch" == "aarch64" ) ]]; then
      env_args[4]="arm64-v8a"
    fi
    ensure_avd "${env_args[@]}" || true
  fi

  if ! avd_exists "${avd}"; then
    if avd_exists "medium_phone_API33_arm64_v8a"; then
      avd="medium_phone_API33_arm64_v8a"
    elif avd_exists "medium_phone_API33_x86_64"; then
      avd="medium_phone_API33_x86_64"
    else
      avd="$(avdmanager list avd | awk -F': ' '/Name:/ {print $2}' | head -n1)"
    fi
  fi

  if command -v adb >/dev/null 2>&1; then
    adb devices | awk 'NR>1 && $2=="offline" {print $1}' | while read -r d; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
  fi
  echo "Starting Android emulator: ${avd} (flavor ${flavor}, port ${port}, headless=${headless:-0})"
  emulator -avd "${avd}" ${headless:+-no-window} -port "${port}" -gpu swiftshader_indirect -noaudio -no-boot-anim -camera-back none -accel on -writable-system -no-snapshot-save &
  local emu_pid=$!
  adb -s "${target_serial}" wait-for-device
  local boot_completed=""
  until [ "$boot_completed" = "1" ]; do
    boot_completed=$(adb -s "${target_serial}" shell getprop sys.boot_completed 2>/dev/null | tr -d "\r")
    sleep 5
  done
  adb -s "${target_serial}" shell settings put global window_animation_scale 0
  adb -s "${target_serial}" shell settings put global transition_animation_scale 0
  adb -s "${target_serial}" shell settings put global animator_duration_scale 0

  if [[ "${EMU_FOREGROUND:-}" == "1" || "${EMU_FOREGROUND:-}" == "true" ]]; then
    wait "$emu_pid"
  fi
}

stop_android() {
  if command -v adb >/dev/null 2>&1; then
    adb devices -l 2>/dev/null | tail -n +2 | awk '{print $1}' | while read -r d; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
  fi
  pkill -f "emulator@" >/dev/null 2>&1 || true
}

reset_android() {
  rm -rf "${ANDROID_AVD_HOME:-$HOME/.android/avd}"
  rm -f "$HOME/.android/adbkey" "$HOME/.android/adbkey.pub"
  echo "AVDs and adb keys removed. Recreate via start."
}

case "$action" in
  start) start_android ;;
  stop) stop_android ;;
  reset) reset_android ;;
  *) echo "Usage: android.sh {start|stop|reset}" >&2; exit 1 ;;
esac
