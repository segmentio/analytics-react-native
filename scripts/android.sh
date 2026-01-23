#!/usr/bin/env bash
set -euo pipefail

# Helper to set ANDROID_SDK_ROOT/ANDROID_HOME/PATH from the flake if not already set.
setup_android_env() {
  local tools_root=""
  local flavor="${ANDROID_SDK_FLAVOR:-${AVD_FLAVOR:-${ANDROID_TARGET:-max}}}"

  if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -z "${ANDROID_HOME:-}" ]; then
    project_root="${PROJECT_ROOT:-${PWD}}"
    local lock_path="$project_root/env/android/max/.flox/env/manifest.lock"
    if [[ "$flavor" == "minsdk" || "$flavor" == "min" ]]; then
      lock_path="$project_root/env/android/min/.flox/env/manifest.lock"
    fi
    if [ ! -f "$lock_path" ]; then
      echo "Android flox manifest lock not found at $lock_path; set ANDROID_SDK_ROOT/ANDROID_HOME explicitly." >&2
      exit 1
    fi
    if ! command -v jq >/dev/null 2>&1; then
      echo "jq is required to read $lock_path; install jq or set ANDROID_SDK_ROOT/ANDROID_HOME explicitly." >&2
      exit 1
    fi
    local desired_api
    if [[ "$flavor" == "minsdk" || "$flavor" == "min" ]]; then
      desired_api="${ANDROID_MIN_API:-21}"
    else
      desired_api="${ANDROID_MAX_API:-33}"
    fi
    local host_arch
    host_arch="$(uname -m)"

    sdk_candidates=()
    while IFS= read -r line; do
      [ -n "$line" ] && sdk_candidates+=("$line")
    done < <(jq -r '.packages[] | select(.name|test(\"androidsdk\")) | .outputs.out // empty' "$lock_path" 2>/dev/null)

    if [ "${#sdk_candidates[@]}" -eq 0 ]; then
      # Fallback to any androidsdk in the store (last resort).
      while IFS= read -r cand; do
        [ -n "$cand" ] && sdk_candidates+=("$cand")
      done < <(find /nix/store -maxdepth 1 -type d -name "*-androidsdk" 2>/dev/null | sort)
    fi

    if [ "${#sdk_candidates[@]}" -eq 0 ]; then
      echo "No androidsdk output found in $lock_path (or /nix/store); set ANDROID_SDK_ROOT/ANDROID_HOME explicitly." >&2
      exit 1
    fi

    for cand in "${sdk_candidates[@]}"; do
      [ -z "$cand" ] && continue
      local sdk_path="$cand/libexec/android-sdk"
      if [ ! -d "$sdk_path/system-images" ]; then
        continue
      fi
      # Prefer a candidate that already contains the desired system image and ABI for this host.
      local abi_pref=""
      if [[ "$host_arch" == "arm64" || "$host_arch" == "aarch64" ]]; then
        abi_pref="arm64-v8a"
      else
        abi_pref="x86_64"
      fi
      local image_path="$sdk_path/system-images/android-${desired_api}/google_apis/${abi_pref}"
      if [ -d "$image_path" ]; then
        tools_root="$sdk_path"
        break
      fi
    done

    if [ -z "${tools_root:-}" ]; then
      # Fall back to the first candidate if none matched our preferred image.
      tools_root="${sdk_candidates[0]}/libexec/android-sdk"
    fi

    if [ -z "${tools_root:-}" ] || [ "$tools_root" = "null" ] || [ ! -d "$tools_root" ]; then
      echo "No usable androidsdk output found in $lock_path; set ANDROID_SDK_ROOT/ANDROID_HOME explicitly." >&2
      exit 1
    fi

    ANDROID_SDK_ROOT="$tools_root"
    ANDROID_HOME="$tools_root"
  fi

  if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -n "${ANDROID_HOME:-}" ]; then
    ANDROID_SDK_ROOT="$ANDROID_HOME"
  fi

  if [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -z "${ANDROID_HOME:-}" ]; then
    ANDROID_HOME="$ANDROID_SDK_ROOT"
  fi

  if [ -z "$tools_root" ]; then
    tools_root="$ANDROID_SDK_ROOT"
  fi

  export ANDROID_SDK_ROOT ANDROID_HOME ANDROID_SDK_TOOLS_ROOT="$tools_root"

  if [ -n "${tools_root:-}" ]; then
    cmdline_tools_bin=""
    if [ -d "$tools_root/cmdline-tools/latest/bin" ]; then
      cmdline_tools_bin="$tools_root/cmdline-tools/latest/bin"
    else
      cmdline_tools_dir=$(find "$tools_root/cmdline-tools" -maxdepth 1 -mindepth 1 -type d -not -name latest 2>/dev/null | sort -V | tail -n 1)
      if [ -n "${cmdline_tools_dir:-}" ] && [ -d "$cmdline_tools_dir/bin" ]; then
        cmdline_tools_bin="$cmdline_tools_dir/bin"
      fi
    fi

    new_path="$tools_root/emulator:$tools_root/platform-tools"

    if [ -n "${cmdline_tools_bin:-}" ]; then
      new_path="$new_path:$cmdline_tools_bin"
    fi

    new_path="$new_path:$tools_root/tools/bin:$PATH"
    PATH="$new_path"
    export PATH
  fi

  if [ -z "${ANDROID_ENV_INFO_PRINTED:-}" ]; then
    local host_arch flavor_api flavor_avd flavor_sysimg
    host_arch="$(uname -m)"
    if [[ "$flavor" == "minsdk" || "$flavor" == "min" ]]; then
      flavor_api="${ANDROID_MIN_API:-${ANDROID_API:-unknown}}"
      if [[ "$host_arch" == "arm64" || "$host_arch" == "aarch64" ]]; then
        flavor_avd="${ANDROID_MIN_AVD_ARM:-${ANDROID_MIN_AVD:-unknown}}"
        flavor_sysimg="${ANDROID_SYSTEM_IMAGE_MIN_ARM:-${ANDROID_SYSTEM_IMAGE_MIN:-unknown}}"
      else
        flavor_avd="${ANDROID_MIN_AVD:-${ANDROID_MIN_AVD_ARM:-unknown}}"
        flavor_sysimg="${ANDROID_SYSTEM_IMAGE_MIN:-${ANDROID_SYSTEM_IMAGE_MIN_ARM:-unknown}}"
      fi
    else
      flavor_api="${ANDROID_MAX_API:-${ANDROID_API:-unknown}}"
      if [[ "$host_arch" == "arm64" || "$host_arch" == "aarch64" ]]; then
        flavor_avd="${ANDROID_AVD_MAX_ARM:-${ANDROID_MAX_AVD_ARM:-${ANDROID_AVD_MAX:-${ANDROID_MAX_AVD:-medium_phone_API33_arm64_v8a}}}}"
        flavor_sysimg="${ANDROID_SYSTEM_IMAGE_MAX_ARM:-${ANDROID_SYSTEM_IMAGE_LATEST_ARM:-unknown}}"
      else
        flavor_avd="${ANDROID_AVD_MAX_X64:-${ANDROID_MAX_AVD_X64:-${ANDROID_AVD_MAX:-${ANDROID_MAX_AVD:-medium_phone_API33_x86_64}}}}"
        flavor_sysimg="${ANDROID_SYSTEM_IMAGE_MAX_X86:-${ANDROID_SYSTEM_IMAGE_LATEST_X86:-unknown}}"
      fi
    fi
    local effective_flavor="${flavor:-maxsdk}"
    local effective_avd="${DETOX_AVD:-${flavor_avd}}"
    local effective_sysimg="${ANDROID_SYSTEM_IMAGE:-${flavor_sysimg:-unknown}}"
    echo
    echo "Android env:"
    echo "  ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT}"
    echo "  AVD_FLAVOR=${AVD_FLAVOR:-${ANDROID_TARGET:-maxsdk}} (resolved ${effective_flavor}, API ${flavor_api}, host ${host_arch})"
    echo "  DETOX_AVD=${effective_avd}"
    echo "  ANDROID_SYSTEM_IMAGE=${effective_sysimg}"
    echo "  Overrides: see wiki/ci.md#knobs"
    echo
    ANDROID_ENV_INFO_PRINTED=1
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

  # Prefer an explicit system image override if present.
  if [[ -n "${ANDROID_SYSTEM_IMAGE:-}" ]]; then
    local override_path="${ANDROID_SYSTEM_IMAGE/system-images;/system-images/}"
    override_path="${override_path//;/\/}"
    if [[ -d "${ANDROID_SDK_ROOT}/${override_path}" ]]; then
      echo "${ANDROID_SYSTEM_IMAGE}"
      return 0
    fi
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

download_system_image() {
  local api="$1" tag="$2" abi="$3"
  local pkg="system-images;android-${api};${tag};${abi}"
  echo "Required system image ${pkg} not found under ${ANDROID_SDK_ROOT}. Install it or update the target." >&2
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

  local api_image=""
  if ! api_image="$(pick_image "$api" "$tag" "$preferred_abi")"; then
    local abi_to_fetch="${preferred_abi:-}"
    if [[ -z "$abi_to_fetch" ]]; then
      case "$(uname -m)" in
        arm64|aarch64) abi_to_fetch="arm64-v8a" ;;
        *) abi_to_fetch="x86_64" ;;
      esac
    fi
    echo "Expected API ${api} system image (${tag}; ABI ${abi_to_fetch}) not found under ${ANDROID_SDK_ROOT}. Install it or adjust ANDROID_SYSTEM_IMAGE/AVD_FLAVOR." >&2
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

run_android() {
  local boot="${1:-boot}"
  local flavor="${AVD_FLAVOR:-max}" headless="${EMU_HEADLESS:-}" port="${EMU_PORT:-5554}"
  local avd="${DETOX_AVD:-}"
  local host_arch
  host_arch="$(uname -m)"
  local api_hint=""

  require_tool avdmanager
  require_tool emulator

  if [[ "$flavor" == "minsdk" ]]; then
    api_hint="${ANDROID_API:-${ANDROID_MIN_API:-21}}"
    if [[ -z "$avd" ]]; then
      if [[ "$host_arch" == "arm64" || "$host_arch" == "aarch64" ]]; then
        avd="${ANDROID_MIN_AVD_ARM:-pixel_API21_arm64_v8a}"
      else
        avd="${ANDROID_MIN_AVD:-pixel_API21_x86_64}"
      fi
    fi
  else
    api_hint="${ANDROID_API:-${ANDROID_MAX_API:-33}}"
    if [[ -z "$avd" ]]; then
      if [[ "$host_arch" == "arm64" || "$host_arch" == "aarch64" ]]; then
        avd="${ANDROID_AVD_MAX_ARM:-${ANDROID_MAX_AVD_ARM:-medium_phone_API33_arm64_v8a}}"
      else
        avd="${ANDROID_AVD_MAX_X64:-${ANDROID_MAX_AVD_X64:-medium_phone_API33_x86_64}}"
      fi
    fi
  fi

  local device_hint="" abi_hint=""
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
    if avd_exists "${ANDROID_AVD_MAX_ARM:-medium_phone_API33_arm64_v8a}"; then
      avd="${ANDROID_AVD_MAX_ARM:-medium_phone_API33_arm64_v8a}"
    elif avd_exists "${ANDROID_AVD_MAX_X64:-medium_phone_API33_x86_64}"; then
      avd="${ANDROID_AVD_MAX_X64:-medium_phone_API33_x86_64}"
    else
      avd="$(avdmanager list avd | awk -F': ' '/Name:/ {print $2}' | head -n1)"
    fi
  fi

  if command -v adb >/dev/null 2>&1; then
    adb devices | awk 'NR>1 && $2=="offline" {print $1}' | while read -r d; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
  fi
  if [[ "$boot" != "boot" ]]; then
    echo "Prepared Android AVD ${avd} (API ${api_hint:-unknown}); skipping boot."
    return 0
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
  start) run_android boot ;;
  prepare) run_android noboot ;;
  info) setup_android_env ;;
  stop) stop_android ;;
  reset) reset_android ;;
  *) echo "Usage: android.sh {start|prepare|stop|reset}" >&2; exit 1 ;;
esac
