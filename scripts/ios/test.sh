#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"

if [ "$(uname -s)" = "Darwin" ]; then
  . "$SCRIPTS_DIR/ios/env.sh"
fi

if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "iOS test env"
  echo "  PATH=$PATH"
  echo "  CC=${CC:-}"
  echo "  CXX=${CXX:-}"
  echo "  SDKROOT=${SDKROOT:-}"
  echo "  DEVELOPER_DIR=${DEVELOPER_DIR:-}"
else
  android_sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
  android_sdk_version="${ANDROID_BUILD_TOOLS_VERSION:-${ANDROID_CMDLINE_TOOLS_VERSION:-unknown}}"
  xcode_dir="${DEVELOPER_DIR:-$(xcode-select -p 2>/dev/null || true)}"
  xcode_version=""
  if command -v xcodebuild >/dev/null 2>&1; then
    xcode_version="$(xcodebuild -version 2>/dev/null | awk 'NR==1{print $2}')"
  fi

  echo "Resolved SDKs"
  echo "  Android SDK: ${android_sdk_root:-unknown} (tools: $android_sdk_version)"
  echo "  Xcode: ${xcode_version:-unknown}"
  echo "  Xcode Dir: ${xcode_dir:-unknown}"
fi

bash "$SCRIPTS_DIR/ios/setup.sh"
yarn install
yarn e2e install
yarn e2e pods
yarn build
yarn e2e build:ios
yarn e2e test:ios
