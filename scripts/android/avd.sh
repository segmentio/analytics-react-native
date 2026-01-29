#!/usr/bin/env sh
set -eu

# Android AVD setup + lifecycle helpers.

script_dir="$(cd "$(dirname "$0")" && pwd)"
if [ -z "${COMMON_SH_LOADED:-}" ]; then
  # shellcheck disable=SC1090
  . "$script_dir/../shared/common.sh"
fi
load_platform_versions "$script_dir"
debug_log_script "scripts/android/avd.sh"

detect_sdk_root() {
  if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
    printf '%s\n' "$ANDROID_SDK_ROOT"
    return 0
  fi

  sm=$(command -v sdkmanager 2>/dev/null || true)
  if [ -z "$sm" ]; then
    return 1
  fi
  if command -v readlink >/dev/null 2>&1; then
    sm="$(readlink "$sm" 2>/dev/null || printf '%s' "$sm")"
  fi
  sm_dir="$(cd "$(dirname "$sm")" && pwd)"
  candidates="${sm_dir}/.. ${sm_dir}/../share/android-sdk ${sm_dir}/../libexec/android-sdk ${sm_dir}/../.."
  for c in $candidates; do
    if [ -d "$c/platform-tools" ] || [ -d "$c/platforms" ] || [ -d "$c/system-images" ]; then
      printf '%s\n' "$c"
      return 0
    fi
  done
  return 1
}

avd_exists() {
  name="$1"
  avdmanager list avd | grep -q "Name: ${name}"
}

pick_image() {
  api="$1"
  tag="$2"
  preferred_abi="$3"
  host_arch="$(uname -m)"

  if [ -n "$preferred_abi" ]; then
    candidates="$preferred_abi"
  else
    case "$host_arch" in
      arm64 | aarch64) candidates="arm64-v8a x86_64 x86" ;;
      *) candidates="x86_64 x86 arm64-v8a" ;;
    esac
  fi

  ifs_backup="$IFS"
  IFS=' '
  for abi in $candidates; do
    image="system-images;android-${api};${tag};${abi}"
    path="${ANDROID_SDK_ROOT}/system-images/android-${api}/${tag}/${abi}"
    if [ -n "${ANDROID_SETUP_DEBUG:-}" ]; then
      if [ -d "$path" ]; then
        echo "Debug: found ABI path $path" >&2
      else
        echo "Debug: missing ABI path $path" >&2
      fi
    fi
    if [ -d "$path" ]; then
      printf '%s\n' "$image"
      IFS="$ifs_backup"
      return 0
    fi
  done
  IFS="$ifs_backup"

  return 1
}

create_avd() {
  name="$1"
  device="$2"
  image="$3"
  abi="${image##*;}"

  if avd_exists "$name"; then
    echo "AVD ${name} already exists."
    return 0
  fi

  echo "Creating AVD ${name} with ${image}..."
  avdmanager create avd --force --name "$name" --package "$image" --device "$device" --abi "$abi" --sdcard 512M
}

add_target() {
  target_line="$1"
  if [ -z "${TARGETS:-}" ]; then
    TARGETS="$target_line"
  else
    TARGETS="${TARGETS}
${target_line}"
  fi
}

android_setup() {
  TARGETS=""
  detected_sdk_root="$(detect_sdk_root 2>/dev/null || true)"

  if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -n "$detected_sdk_root" ]; then
    ANDROID_SDK_ROOT="$detected_sdk_root"
    export ANDROID_SDK_ROOT
  fi

  if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -z "${ANDROID_HOME:-}" ]; then
    echo "ANDROID_SDK_ROOT/ANDROID_HOME must be set. In a devbox shell, the flake-provided SDK should supply sdkmanager in PATH; if not, set ANDROID_SDK_ROOT to the flake's android-sdk path." >&2
    exit 1
  fi

  ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
  export ANDROID_HOME

  require_tool avdmanager
  require_tool emulator

  platform_min_api="${PLATFORM_ANDROID_MIN_API:-21}"
  platform_max_api="${PLATFORM_ANDROID_MAX_API:-33}"
  platform_min_device="${PLATFORM_ANDROID_MIN_DEVICE:-pixel}"
  platform_max_device="${PLATFORM_ANDROID_MAX_DEVICE:-medium_phone}"
  platform_image_tag="${PLATFORM_ANDROID_SYSTEM_IMAGE_TAG:-google_apis}"

  primary_api="${AVD_API:-${ANDROID_TARGET_API:-${ANDROID_MAX_API:-${platform_max_api:-${ANDROID_MIN_API:-$platform_min_api}}}}}"
  primary_tag="${AVD_TAG:-${ANDROID_SYSTEM_IMAGE_TAG:-$platform_image_tag}}"
  if [ -n "${AVD_DEVICE:-}" ]; then
    primary_device="$AVD_DEVICE"
  elif [ -n "$primary_api" ] && [ "$primary_api" = "$platform_min_api" ]; then
    primary_device="$platform_min_device"
  elif [ -n "$primary_api" ] && [ "$primary_api" = "$platform_max_api" ]; then
    primary_device="$platform_max_device"
  else
    primary_device="pixel"
  fi
  primary_preferred_abi="${AVD_ABI:-}"

  if debug_enabled; then
    debug_log "primary_api=${primary_api} primary_device=${primary_device} primary_tag=${primary_tag} primary_preferred_abi=${primary_preferred_abi:-auto}"
  fi

  secondary_api="${AVD_SECONDARY_API:-${ANDROID_MAX_API:-${PLATFORM_ANDROID_MAX_API:-33}}}"
  secondary_tag="${AVD_SECONDARY_TAG:-${ANDROID_SYSTEM_IMAGE_TAG:-${PLATFORM_ANDROID_SYSTEM_IMAGE_TAG:-google_apis}}}"
  secondary_device="${AVD_SECONDARY_DEVICE:-medium_phone}"
  secondary_preferred_abi="${AVD_SECONDARY_ABI:-}"

  if debug_enabled; then
    debug_log "secondary_api=${secondary_api} secondary_device=${secondary_device} secondary_tag=${secondary_tag} secondary_preferred_abi=${secondary_preferred_abi:-auto}"
  fi

  primary_required=0
  if [ -n "${AVD_API:-}" ] || [ -n "${AVD_TAG:-}" ] || [ -n "${AVD_DEVICE:-}" ] || [ -n "${AVD_ABI:-}" ] || [ -n "${AVD_NAME:-}" ]; then
    primary_required=1
  fi

  secondary_required=0
  if [ -n "${AVD_SECONDARY_API:-}" ] || [ -n "${AVD_SECONDARY_TAG:-}" ] || [ -n "${AVD_SECONDARY_DEVICE:-}" ] || [ -n "${AVD_SECONDARY_ABI:-}" ] || [ -n "${AVD_SECONDARY_NAME:-}" ]; then
    secondary_required=1
  fi

  primary_dir="$ANDROID_SDK_ROOT/system-images/android-${primary_api}/${primary_tag}"
  if [ -d "$primary_dir" ]; then
    add_target "${primary_api}|${primary_tag}|${primary_device}|${primary_preferred_abi}|${AVD_NAME:-}"
  elif [ "$primary_required" = "1" ]; then
    echo "Expected API ${primary_api} system image (${primary_tag}) not found under ${primary_dir}." >&2
    echo "Re-enter the devbox shell (flake should provide images) or rebuild Devbox to fetch them." >&2
    exit 1
  fi

  secondary_dir="$ANDROID_SDK_ROOT/system-images/android-${secondary_api}/${secondary_tag}"
  if [ -n "$secondary_api" ] && [ "$secondary_api" != "$primary_api" ]; then
    if [ -d "$secondary_dir" ]; then
      add_target "${secondary_api}|${secondary_tag}|${secondary_device}|${secondary_preferred_abi}|${AVD_SECONDARY_NAME:-}"
    elif [ "$secondary_required" = "1" ]; then
      echo "Expected API ${secondary_api} system image (${secondary_tag}) not found under ${secondary_dir}." >&2
      echo "Re-enter the devbox shell (flake should provide images) or rebuild Devbox to fetch them." >&2
      exit 1
    elif [ -d "$primary_dir" ]; then
      echo "Warning: API ${secondary_api} system image (${secondary_tag}) not found; continuing with API ${primary_api} only." >&2
    fi
  fi

  if [ -z "$TARGETS" ]; then
    echo "No compatible Android system images found under ${ANDROID_SDK_ROOT}/system-images for configured APIs." >&2
    exit 1
  fi

  ifs_backup="$IFS"
  IFS='\n'
  for target in $TARGETS; do
    IFS='|' read -r api tag device preferred_abi name_override <<TARGET_EOF
$target
TARGET_EOF
    IFS='\n'
    api="${api-}"
    tag="${tag-}"
    device="${device-}"
    preferred_abi="${preferred_abi-}"
    name_override="${name_override-}"

    if [ -n "${ANDROID_SETUP_DEBUG:-}" ]; then
      api_image="$(pick_image "$api" "$tag" "$preferred_abi" || true)"
    else
      api_image="$(pick_image "$api" "$tag" "$preferred_abi" 2>/dev/null || true)"
    fi
    if [ -z "$api_image" ]; then
      base_dir="${ANDROID_SDK_ROOT}/system-images/android-${api}/${tag}"
      if [ -d "$base_dir" ]; then
        available_abis="$(ls -1 "$base_dir" 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
        if [ -n "$available_abis" ]; then
          host_arch="$(uname -m)"
          if [ -n "$preferred_abi" ]; then
            candidates="$preferred_abi"
          else
            case "$host_arch" in
              arm64 | aarch64) candidates="arm64-v8a x86_64 x86" ;;
              *) candidates="x86_64 x86 arm64-v8a" ;;
            esac
          fi
          echo "Debug: host_arch=${host_arch} candidates=${candidates} base_dir=${base_dir}" >&2
          echo "API ${api} system image tag '${tag}' found, but no compatible ABI (preferred ${preferred_abi:-auto}). Available: ${available_abis}." >&2
        else
          echo "API ${api} system image tag '${tag}' exists but has no ABI directories under ${base_dir}." >&2
        fi
      else
        echo "Expected API ${api} system image (${tag}; preferred ABI ${preferred_abi:-auto}) not found under ${ANDROID_SDK_ROOT}/system-images/android-${api}." >&2
      fi
      echo "Re-enter the devbox shell (flake should provide images) or rebuild Devbox to fetch them." >&2
      continue
    fi

    abi="${api_image##*;}"
    abi_safe="$(printf '%s' "$abi" | tr '-' '_')"
    if [ -n "$name_override" ]; then
      avd_name="$name_override"
    else
      avd_name="$(printf '%s_API%s_%s' "$device" "$api" "$abi_safe")"
    fi

    create_avd "$avd_name" "$device" "$api_image"
    if avd_exists "$avd_name"; then
      echo "AVD ready: ${avd_name} (${api_image})"
    fi
  done
  IFS="$ifs_backup"

  echo "AVDs ready. Boot with: emulator -avd <name> --netdelay none --netspeed full"
}

android_start() {
  flavor="${AVD_FLAVOR:-latest}"
  headless="${EMU_HEADLESS:-}"
  port="${EMU_PORT:-5554}"
  avd="${DETOX_AVD:-}"

  if [ -z "$avd" ]; then
    if [ "$flavor" = "latest" ]; then
      host_arch="$(uname -m)"
      if [ "$host_arch" = "arm64" ] || [ "$host_arch" = "aarch64" ]; then
        abi="arm64_v8a"
      else
        abi="x86_64"
      fi
      avd="medium_phone_API33_${abi}"
    else
      if uname -m | grep -qi arm; then
        abi="arm64_v8a"
      else
        abi="x86_64"
      fi
      avd="pixel_API21_${abi}"
    fi
  fi

  android_setup

  target_serial="emulator-${port}"
  if command -v adb >/dev/null 2>&1; then
    adb devices | awk 'NR>1 && $2=="offline" {print $1}' | while read -r d; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
  fi
  echo "Starting Android emulator: ${avd} (flavor ${flavor}, port ${port}, headless=${headless:-0})"
  if [ -n "$headless" ]; then
    headless_flag="-no-window"
  else
    headless_flag=""
  fi
  emulator -avd "$avd" ${headless_flag:+$headless_flag} -port "$port" -gpu swiftshader_indirect -noaudio -no-boot-anim -camera-back none -accel on -writable-system -no-snapshot-save &
  adb -s "$target_serial" wait-for-device
  boot_completed=""
  until [ "$boot_completed" = "1" ]; do
    boot_completed=$(adb -s "$target_serial" shell getprop sys.boot_completed 2>/dev/null | tr -d "\r")
    sleep 5
  done
  adb -s "$target_serial" shell settings put global window_animation_scale 0
  adb -s "$target_serial" shell settings put global transition_animation_scale 0
  adb -s "$target_serial" shell settings put global animator_duration_scale 0
}

android_stop() {
  if command -v adb >/dev/null 2>&1; then
    adb devices | awk 'NR>1 && $2=="offline" {print $1}' | while read -r d; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
    devices="$(adb devices -l 2>/dev/null | awk 'NR>1{print $1}' | tr '\n' ' ')"
    if [ -n "$devices" ]; then
      echo "Stopping Android emulators: $devices"
      for d in $devices; do
        adb -s "$d" emu kill >/dev/null 2>&1 || true
      done
    else
      echo "No Android emulators detected via adb."
    fi
  else
    echo "adb not found; skipping Android emulator shutdown."
  fi
  pkill -f "emulator@" >/dev/null 2>&1 || true
  echo "Android emulators stopped (if any were running)."
}

android_reset() {
  rm -rf "$HOME/.android/avd"
  rm -f "$HOME/.android/adbkey" "$HOME/.android/adbkey.pub"
  echo "AVDs and adb keys removed. Recreate via start-android* as needed."
}

if [ "${RUN_MAIN:-1}" = "1" ]; then
  action="${1:-}"
  shift || true
  case "$action" in
    start) android_start "$@" ;;
    stop) android_stop "$@" ;;
    reset) android_reset "$@" ;;
    setup) android_setup "$@" ;;
    *)
      echo "Usage: avd.sh {start|stop|reset|setup}" >&2
      exit 1
      ;;
  esac
fi
