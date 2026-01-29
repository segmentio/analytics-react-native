#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/android/lib.sh must be sourced." >&2
  exit 1
fi

android_normalize_name() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]'
}

android_sanitize_avd_name() {
  raw="$1"
  if [ -z "$raw" ]; then
    return 1
  fi
  cleaned="$(printf '%s' "$raw" | tr ' ' '_' | tr -cd 'A-Za-z0-9._-')"
  if [ -z "$cleaned" ]; then
    return 1
  fi
  printf '%s\n' "$cleaned"
}

android_resolve_target() {
  platform_min_api="${ANDROID_MIN_API:-21}"
  platform_max_api="${ANDROID_MAX_API:-33}"
  platform_min_device="${ANDROID_MIN_DEVICE:-pixel}"
  platform_max_device="${ANDROID_MAX_DEVICE:-medium_phone}"
  platform_image_tag="${ANDROID_SYSTEM_IMAGE_TAG:-google_apis}"

  target_sdk="${TARGET_SDK:-max}"
  case "$target_sdk" in
    min)
      target_api="$platform_min_api"
      target_device="$platform_min_device"
      ;;
    max)
      target_api="$platform_max_api"
      target_device="$platform_max_device"
      ;;
    custom)
      target_api="${ANDROID_CUSTOM_API:-}"
      target_device="${ANDROID_CUSTOM_DEVICE:-}"
      if [ -z "$target_api" ]; then
        echo "TARGET_SDK=custom requires ANDROID_CUSTOM_API to be set." >&2
        exit 1
      fi
      if [ -z "$target_device" ]; then
        echo "TARGET_SDK=custom requires ANDROID_CUSTOM_DEVICE to be set." >&2
        exit 1
      fi
      ;;
    *)
      target_api="$platform_max_api"
      target_device="$platform_max_device"
      ;;
  esac

  target_api="${AVD_API:-${ANDROID_TARGET_API:-$target_api}}"
  target_tag="${AVD_TAG:-${ANDROID_CUSTOM_SYSTEM_IMAGE_TAG:-${ANDROID_SYSTEM_IMAGE_TAG:-$platform_image_tag}}}"
  if [ -n "${AVD_DEVICE:-}" ]; then
    target_device="$AVD_DEVICE"
  fi
  target_preferred_abi="${AVD_ABI:-}"

  printf '%s|%s|%s|%s\n' "$target_api" "$target_device" "$target_tag" "$target_preferred_abi"
}
