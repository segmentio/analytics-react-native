#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"
load_platform_versions "$script_dir"
debug_log_script "scripts/android/test.sh"

if [ -z "${ANDROID_MIN_API:-}" ] && [ -n "${PLATFORM_ANDROID_MIN_API:-}" ]; then
  ANDROID_MIN_API="$PLATFORM_ANDROID_MIN_API"
fi
if [ -z "${ANDROID_MAX_API:-}" ] && [ -n "${PLATFORM_ANDROID_MAX_API:-}" ]; then
  ANDROID_MAX_API="$PLATFORM_ANDROID_MAX_API"
fi
if [ -z "${ANDROID_SYSTEM_IMAGE_TAG:-}" ] && [ -n "${PLATFORM_ANDROID_SYSTEM_IMAGE_TAG:-}" ]; then
  ANDROID_SYSTEM_IMAGE_TAG="$PLATFORM_ANDROID_SYSTEM_IMAGE_TAG"
fi
if [ -z "${ANDROID_TARGET_API:-}" ] && [ -n "${ANDROID_MAX_API:-}" ]; then
  ANDROID_TARGET_API="$ANDROID_MAX_API"
fi
export ANDROID_MIN_API ANDROID_MAX_API ANDROID_SYSTEM_IMAGE_TAG ANDROID_TARGET_API

sh "$SCRIPTS_DIR/android/setup.sh"
yarn install
yarn e2e install
yarn build
yarn e2e build:android
yarn e2e test:android
