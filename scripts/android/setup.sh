#!/usr/bin/env sh
set -eu

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

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"
load_platform_versions "$script_dir"

detect_sdk_root() {
  if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
    printf '%s\n' "$ANDROID_SDK_ROOT"
    return 0
  fi

  sm=$(command -v sdkmanager 2>/dev/null || true)
  if [ -z "$sm" ]; then
    return 1
  fi
  sm=$(readlink -f "$sm")
  candidates="$(dirname "$sm")/.. $(dirname "$sm")/../share/android-sdk $(dirname "$sm")/../libexec/android-sdk $(dirname "$sm")/../.."
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

main() {
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

  primary_api="${AVD_API:-${ANDROID_TARGET_API:-${ANDROID_MAX_API:-${ANDROID_MIN_API:-${PLATFORM_ANDROID_MIN_API:-21}}}}}"
  primary_tag="${AVD_TAG:-${ANDROID_SYSTEM_IMAGE_TAG:-${PLATFORM_ANDROID_SYSTEM_IMAGE_TAG:-google_apis}}}"
  primary_device="${AVD_DEVICE:-pixel}"
  primary_preferred_abi="${AVD_ABI:-}"

  secondary_api="${AVD_SECONDARY_API:-${ANDROID_MAX_API:-${PLATFORM_ANDROID_MAX_API:-33}}}"
  secondary_tag="${AVD_SECONDARY_TAG:-${ANDROID_SYSTEM_IMAGE_TAG:-${PLATFORM_ANDROID_SYSTEM_IMAGE_TAG:-google_apis}}}"
  secondary_device="${AVD_SECONDARY_DEVICE:-medium_phone}"
  secondary_preferred_abi="${AVD_SECONDARY_ABI:-}"

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
  IFS='
'
  for target in $TARGETS; do
    IFS='|' read -r api tag device preferred_abi name_override <<EOF
$target
EOF
    IFS='
'
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

main "$@"
