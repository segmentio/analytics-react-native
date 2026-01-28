#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"

if [ "${ANALYTICS_CI_DEBUG:-}" = "1" ] || [ "${DEBUG:-}" = "1" ]; then
  echo "Android test env"
  echo "  ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-}"
  echo "  ANDROID_HOME=${ANDROID_HOME:-}"
  echo "  ANDROID_SDK_USE_LOCAL=${ANDROID_SDK_USE_LOCAL:-}"
  echo "  ANDROID_TARGET_API=${ANDROID_TARGET_API:-}"
  echo "  ANDROID_MIN_API=${ANDROID_MIN_API:-}"
  echo "  ANDROID_MAX_API=${ANDROID_MAX_API:-}"
  echo "  ANDROID_SYSTEM_IMAGE_TAG=${ANDROID_SYSTEM_IMAGE_TAG:-}"
  echo "  ANDROID_BUILD_TOOLS_VERSION=${ANDROID_BUILD_TOOLS_VERSION:-}"
  echo "  ANDROID_CMDLINE_TOOLS_VERSION=${ANDROID_CMDLINE_TOOLS_VERSION:-}"
  echo "  AVD_API=${AVD_API:-}"
  echo "  AVD_ABI=${AVD_ABI:-}"
  echo "  AVD_DEVICE=${AVD_DEVICE:-}"
  echo "  AVD_TAG=${AVD_TAG:-}"
  echo "  AVD_NAME=${AVD_NAME:-}"
  echo "  AVD_SECONDARY_API=${AVD_SECONDARY_API:-}"
  echo "  AVD_SECONDARY_ABI=${AVD_SECONDARY_ABI:-}"
  echo "  AVD_SECONDARY_DEVICE=${AVD_SECONDARY_DEVICE:-}"
  echo "  AVD_SECONDARY_TAG=${AVD_SECONDARY_TAG:-}"
  echo "  AVD_SECONDARY_NAME=${AVD_SECONDARY_NAME:-}"
  echo "  EMU_HEADLESS=${EMU_HEADLESS:-}"
  echo "  EMU_PORT=${EMU_PORT:-}"
  echo "  DETOX_AVD=${DETOX_AVD:-}"
  if command -v uname >/dev/null 2>&1; then
    echo "  HOST_ARCH=$(uname -m)"
  fi
  if command -v sdkmanager >/dev/null 2>&1; then
    echo "  sdkmanager=$(command -v sdkmanager)"
  fi
  if command -v avdmanager >/dev/null 2>&1; then
    echo "  avdmanager=$(command -v avdmanager)"
  fi
  if command -v emulator >/dev/null 2>&1; then
    echo "  emulator=$(command -v emulator)"
  fi
fi

sh "$SCRIPTS_DIR/android/setup.sh"
yarn install
yarn e2e install
yarn build
yarn e2e build:android
yarn e2e test:android
