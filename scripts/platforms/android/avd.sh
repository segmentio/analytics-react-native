#!/usr/bin/env sh
set -eu

if ! (return 0 2>/dev/null); then
  echo "scripts/platforms/android/avd.sh must be sourced via scripts/run.sh." >&2
  exit 1
fi

scripts_root="${SCRIPTS_DIR:-$(cd "$(dirname "$0")" && pwd)}"
android_dir="$scripts_root/platforms/android"
if [ "${SHARED_LOADED:-}" != "1" ] || [ "${SHARED_LOADED_PID:-}" != "$$" ]; then
  # shellcheck disable=SC1090
  . "$scripts_root/bootstrap/init.sh"
  load_env "$scripts_root"
fi
debug_log_script "scripts/platforms/android/avd.sh"

# shellcheck disable=SC1090
. "$android_dir/lib.sh"

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

resolve_device() {
  desired="$1"
  if [ -z "$desired" ]; then
    return 1
  fi
  devices="$(avdmanager list device | awk -F': ' '
    /^id: /{
      id=$2
      if (index(id, "\"") > 0) {
        q=index(id, "\"")
        rest=substr(id, q + 1)
        q2=index(rest, "\"")
        if (q2 > 0) { id=substr(rest, 1, q2 - 1) }
      } else {
        split(id, parts, " ")
        id=parts[1]
      }
      next
    }
    /^[[:space:]]*Name: /{
      name=$2
      if (id != "") { print id "\t" name; id="" }
    }
  ')"
  if [ -z "$devices" ]; then
    return 1
  fi

  desired_norm="$(android_normalize_name "$desired")"
  desired_alt_norm="$(android_normalize_name "$(printf '%s' "$desired" | tr '_-' '  ')")"

  while IFS=$'\t' read -r id name; do
    id_norm="$(android_normalize_name "$id")"
    name_norm="$(android_normalize_name "$name")"
    if [ "$id_norm" = "$desired_norm" ] || [ "$id_norm" = "$desired_alt_norm" ] || \
      [ "$name_norm" = "$desired_norm" ] || [ "$name_norm" = "$desired_alt_norm" ]; then
      printf '%s\n' "$id"
      return 0
    fi
  done <<EOF
$devices
EOF

  return 1
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
    if debug_enabled; then
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
  resolved_avd_name=""
  detected_sdk_root="$(detect_sdk_root 2>/dev/null || true)"
  target_sdk="${TARGET_SDK:-max}"

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

  IFS='|' read -r target_api target_device target_tag target_preferred_abi <<TARGET_EOF
$(android_resolve_target)
TARGET_EOF
  resolved_device="$(resolve_device "$target_device" || true)"
  if [ -n "$resolved_device" ]; then
    target_device="$resolved_device"
  fi

  if debug_enabled; then
    debug_log "target_sdk=${target_sdk} target_api=${target_api} target_device=${target_device} target_tag=${target_tag} target_preferred_abi=${target_preferred_abi:-auto}"
  fi

  target_dir="$ANDROID_SDK_ROOT/system-images/android-${target_api}/${target_tag}"
  require_dir_contains "$ANDROID_SDK_ROOT" "system-images/android-${target_api}/${target_tag}" "Missing system image directory for API ${target_api} (${target_tag}) under ${ANDROID_SDK_ROOT}. Re-enter the devbox shell or rebuild Devbox to fetch images."
  if [ -d "$target_dir" ]; then
    add_target "${target_api}|${target_tag}|${target_device}|${target_preferred_abi}|${AVD_NAME:-}"
  else
    echo "Expected API ${target_api} system image (${target_tag}) not found under ${target_dir}." >&2
    echo "Re-enter the devbox shell (flake should provide images) or rebuild Devbox to fetch them." >&2
    exit 1
  fi


  if [ -z "$TARGETS" ]; then
    echo "No compatible Android system images found under ${ANDROID_SDK_ROOT}/system-images for configured APIs." >&2
    exit 1
  fi

  ifs_backup="$IFS"
  IFS="$(printf '\n')"
  for target in $TARGETS; do
    IFS='|' read -r api tag device preferred_abi name_override <<TARGET_EOF
$target
TARGET_EOF
    IFS="$(printf '\n')"
    api="${api-}"
    tag="${tag-}"
    device="${device-}"
    preferred_abi="${preferred_abi-}"
    name_override="${name_override-}"

    if debug_enabled; then
      api_image="$(pick_image "$api" "$tag" "$preferred_abi" || true)"
    else
      api_image="$(pick_image "$api" "$tag" "$preferred_abi" 2>/dev/null || true)"
    fi
    if [ -z "$api_image" ]; then
      if [ -n "$preferred_abi" ]; then
        require_dir_contains "$ANDROID_SDK_ROOT" "system-images/android-${api}/${tag}/${preferred_abi}" "Missing preferred ABI ${preferred_abi} for API ${api} (${tag}) under ${ANDROID_SDK_ROOT}."
      fi
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
      safe_device="$(android_sanitize_avd_name "$device" || true)"
      if [ -z "$safe_device" ]; then
        echo "Unable to derive a valid AVD name from device '${device}'." >&2
        exit 1
      fi
      avd_name="$(printf '%s_API%s_%s' "$safe_device" "$api" "$abi_safe")"
    fi
    if [ -z "$resolved_avd_name" ]; then
      resolved_avd_name="$avd_name"
    fi

    create_avd "$avd_name" "$device" "$api_image"
    if avd_exists "$avd_name"; then
      echo "AVD ready: ${avd_name} (${api_image})"
    fi
  done
  IFS="$ifs_backup"

  if [ -z "${DETOX_AVD:-}" ] && [ -n "$resolved_avd_name" ]; then
    DETOX_AVD="$resolved_avd_name"
    export DETOX_AVD
  fi
  echo "AVDs ready. Boot with: emulator -avd <name> --netdelay none --netspeed full"
}

android_start() {
  target_sdk="${TARGET_SDK:-max}"
  headless="${EMU_HEADLESS:-}"
  port="${EMU_PORT:-5554}"
  avd="${DETOX_AVD:-}"

  android_setup

  if [ -z "$avd" ] && [ -n "${AVD_NAME:-}" ]; then
    avd="$AVD_NAME"
  fi

  if [ -z "$avd" ]; then
    IFS='|' read -r target_api target_device target_tag target_preferred_abi <<TARGET_EOF
$(android_resolve_target)
TARGET_EOF
    resolved_device="$(resolve_device "$target_device" || true)"
    if [ -n "$resolved_device" ]; then
      target_device="$resolved_device"
    fi

    api_image="$(pick_image "$target_api" "$target_tag" "$target_preferred_abi" 2>/dev/null || true)"
    if [ -n "$api_image" ]; then
      abi="${api_image##*;}"
      abi_safe="$(printf '%s' "$abi" | tr '-' '_')"
      safe_device="$(android_sanitize_avd_name "$target_device" || true)"
      if [ -n "$safe_device" ]; then
        avd="$(printf '%s_API%s_%s' "$safe_device" "$target_api" "$abi_safe")"
      fi
    fi
  fi

  if [ -z "$avd" ]; then
    echo "No AVD resolved; set DETOX_AVD or AVD_NAME explicitly." >&2
    exit 1
  fi

  target_serial="emulator-${port}"
  if command -v adb >/dev/null 2>&1; then
    adb devices | awk 'NR>1 && $2=="offline" {print $1}' | while read -r d; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
  fi
  echo "Starting Android emulator: ${avd} (target ${target_sdk}, port ${port}, headless=${headless:-0})"
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
  rm_bin="rm"
  if [ "$(uname -s)" = "Darwin" ] && [ -x /bin/rm ]; then
    rm_bin="/bin/rm"
  fi
  avd_dir="$HOME/.android/avd"
  if [ -d "$avd_dir" ]; then
    if command -v chflags >/dev/null 2>&1; then
      chflags -R nouchg "$avd_dir" >/dev/null 2>&1 || true
    fi
    chmod -R u+w "$avd_dir" >/dev/null 2>&1 || true
    if ! "$rm_bin" -rf "$avd_dir"; then
      echo "Failed to remove $avd_dir. Check permissions or Full Disk Access for your terminal." >&2
      return 1
    fi
  fi

  if ! "$rm_bin" -f "$HOME/.android/adbkey" "$HOME/.android/adbkey.pub"; then
    echo "Failed to remove adb keys under $HOME/.android. Check permissions." >&2
    return 1
  fi
  echo "AVDs and adb keys removed. Recreate via start-android* as needed."
}
