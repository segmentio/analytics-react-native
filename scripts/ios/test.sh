#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"

if [ "$(uname -s)" = "Darwin" ]; then
  . "$SCRIPTS_DIR/ios/env.sh"
fi

if [ "${ANALYTICS_CI_DEBUG:-}" = "1" ] || [ "${DEBUG:-}" = "1" ]; then
  echo "iOS test env"
  echo "  PATH=$PATH"
  echo "  CC=${CC:-}"
  echo "  CXX=${CXX:-}"
  echo "  SDKROOT=${SDKROOT:-}"
  echo "  DEVELOPER_DIR=${DEVELOPER_DIR:-}"
  echo "  IOS_RUNTIME=${IOS_RUNTIME:-}"
  echo "  IOS_MIN_RUNTIME=${IOS_MIN_RUNTIME:-}"
  echo "  IOS_MAX_RUNTIME=${IOS_MAX_RUNTIME:-}"
  echo "  DETOX_IOS_DEVICE=${DETOX_IOS_DEVICE:-}"
  echo "  IOS_DEVICE_NAMES=${IOS_DEVICE_NAMES:-}"
  echo "  IOS_DEVELOPER_DIR=${IOS_DEVELOPER_DIR:-}"
  echo "  IOS_DOWNLOAD_RUNTIME=${IOS_DOWNLOAD_RUNTIME:-}"
  if command -v sw_vers >/dev/null 2>&1; then
    sw_vers
  fi
  if command -v xcode-select >/dev/null 2>&1; then
    echo "xcode-select: $(xcode-select -p 2>/dev/null || true)"
  fi
  if command -v xcodebuild >/dev/null 2>&1; then
    xcodebuild -version 2>/dev/null || true
  fi
  if command -v swiftc >/dev/null 2>&1; then
    swiftc --version 2>/dev/null || true
  fi
  if command -v clang >/dev/null 2>&1; then
    clang --version 2>/dev/null | head -n 1 || true
  fi
fi

sh "$SCRIPTS_DIR/ios/setup.sh"
yarn install
yarn e2e install
yarn e2e pods
yarn build
yarn e2e build:ios
yarn e2e test:ios
