#!/usr/bin/env sh
set -euo pipefail

if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  exit 0
fi

if [ -n "${DEVBOX_SDK_SUMMARY_PRINTED:-}" ]; then
  exit 0
fi

DEVBOX_SDK_SUMMARY_PRINTED=1
export DEVBOX_SDK_SUMMARY_PRINTED

android_sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
android_sdk_version="${ANDROID_BUILD_TOOLS_VERSION:-${ANDROID_CMDLINE_TOOLS_VERSION:-unknown}}"
android_min_api="${ANDROID_MIN_API:-${PLATFORM_ANDROID_MIN_API:-unknown}}"
android_max_api="${ANDROID_MAX_API:-${PLATFORM_ANDROID_MAX_API:-unknown}}"
android_system_image_tag="${ANDROID_SYSTEM_IMAGE_TAG:-${PLATFORM_ANDROID_SYSTEM_IMAGE_TAG:-unknown}}"

ios_min_runtime="${IOS_MIN_RUNTIME:-${PLATFORM_IOS_MIN_RUNTIME:-unknown}}"
ios_max_runtime="${IOS_MAX_RUNTIME:-${PLATFORM_IOS_MAX_RUNTIME:-latest}}"

xcode_dir="${DEVELOPER_DIR:-}"
if [ -z "$xcode_dir" ] && command -v xcode-select >/dev/null 2>&1; then
  xcode_dir="$(xcode-select -p 2>/dev/null || true)"
fi

xcode_version="unknown"
if command -v xcodebuild >/dev/null 2>&1; then
  xcode_version="$(xcodebuild -version 2>/dev/null | awk 'NR==1{print $2}')"
fi

echo "Resolved SDKs"
echo "  Android SDK: ${android_sdk_root:-unknown}"
echo "    Tools: ${android_sdk_version:-unknown}"
echo "    Min API: ${android_min_api:-unknown}"
echo "    Max API: ${android_max_api:-unknown}"
echo "    System Image: ${android_system_image_tag:-unknown}"
echo "  iOS Runtime:"
echo "    Min: ${ios_min_runtime:-unknown}"
echo "    Max: ${ios_max_runtime:-unknown}"
echo "  Xcode: ${xcode_version:-unknown}"
echo "  Xcode Dir: ${xcode_dir:-unknown}"
