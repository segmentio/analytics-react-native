#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"
debug_log_script "scripts/ios/env.sh"
load_platform_versions "$script_dir"

devbox_omit_nix_env() {
  if [ "${DEVBOX_OMIT_NIX_ENV_APPLIED:-}" = "1" ]; then
    return 0
  fi

  export DEVBOX_OMIT_NIX_ENV_APPLIED=1

  dump_env() {
    if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
      if ! debug_enabled; then
        return 0
      fi
      echo "devbox omit-nix-env $1"
      echo "  PATH=$PATH"
      echo "  CC=${CC:-}"
      echo "  CXX=${CXX:-}"
      echo "  LD=${LD:-}"
      echo "  CPP=${CPP:-}"
      echo "  AR=${AR:-}"
      echo "  SDKROOT=${SDKROOT:-}"
      echo "  DEVELOPER_DIR=${DEVELOPER_DIR:-}"
    fi
  }

  dump_env "before"

  devbox_config_path=""
  if [ -n "${DEVBOX_CONFIG:-}" ] && [ -f "$DEVBOX_CONFIG" ]; then
    devbox_config_path="$DEVBOX_CONFIG"
  elif [ -n "${DEVBOX_CONFIG_PATH:-}" ] && [ -f "$DEVBOX_CONFIG_PATH" ]; then
    devbox_config_path="$DEVBOX_CONFIG_PATH"
  elif [ -n "${DEVBOX_CONFIG_DIR:-}" ] && [ -f "${DEVBOX_CONFIG_DIR%/}/devbox.json" ]; then
    devbox_config_path="${DEVBOX_CONFIG_DIR%/}/devbox.json"
  fi

  if [ -n "$devbox_config_path" ]; then
    eval "$(devbox --config "$devbox_config_path" shellenv --install --no-refresh-alias --omit-nix-env=true)"
  else
    eval "$(devbox shellenv --install --no-refresh-alias --omit-nix-env=true)"
  fi

  if [ "$(uname -s)" = "Darwin" ]; then
    PATH="$(printf '%s' "$PATH" | tr ':' '\n' | awk '!/^\/nix\/store\//{print}' | paste -sd ':' -)"

    for var in CC CXX LD CPP AR AS NM RANLIB STRIP OBJC OBJCXX SDKROOT DEVELOPER_DIR; do
      value="$(eval "printf '%s' \"\${$var-}\"")"
      if [ -n "$value" ] && [ "${value#/nix/store/}" != "$value" ]; then
        eval "unset $var"
      fi
    done

    if [ -x /usr/bin/clang ]; then
      CC=/usr/bin/clang
      CXX=/usr/bin/clang++
      export CC CXX
    fi

    if command -v xcode-select >/dev/null 2>&1; then
      dev_dir="$(xcode-select -p 2>/dev/null || true)"
      if [ -n "$dev_dir" ]; then
        DEVELOPER_DIR="$dev_dir"
        export DEVELOPER_DIR
      fi
    fi

    unset SDKROOT
  fi

  dump_env "after"

}

devbox_omit_nix_env

if debug_enabled; then
  if [ "${IOS_ENV_DEBUG_PRINTED:-}" != "1" ]; then
    IOS_ENV_DEBUG_PRINTED=1
    export IOS_ENV_DEBUG_PRINTED
    debug_dump_vars \
      IOS_RUNTIME \
      IOS_MIN_VERSION \
      IOS_MAX_VERSION \
      IOS_DEVICE_NAMES \
      DETOX_IOS_DEVICE \
      IOS_DEVELOPER_DIR \
      IOS_DOWNLOAD_RUNTIME \
      DEVELOPER_DIR \
      SDKROOT \
      CC \
      CXX
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
fi

if [ -n "${DEVBOX_INIT_IOS:-}" ] && [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ] && [ -z "${DEVBOX_IOS_SDK_SUMMARY_PRINTED:-}" ]; then
  DEVBOX_IOS_SDK_SUMMARY_PRINTED=1
  export DEVBOX_IOS_SDK_SUMMARY_PRINTED

  repo_root="${PROJECT_ROOT:-${DEVBOX_PROJECT_ROOT:-}}"
  if [ -z "$repo_root" ] && [ -n "${SCRIPTS_DIR:-}" ]; then
    repo_root="$(cd "$SCRIPTS_DIR/.." && pwd)"
  fi
  if [ -z "$repo_root" ]; then
    repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
  fi

  if [ -z "${PLATFORM_IOS_MIN_VERSION:-}" ] || [ -z "${PLATFORM_ANDROID_MIN_API:-}" ]; then
    if ! command -v jq >/dev/null 2>&1; then
      if [ -n "${DEVBOX_PACKAGES_DIR:-}" ] && [ -x "$DEVBOX_PACKAGES_DIR/bin/jq" ]; then
        PATH="$DEVBOX_PACKAGES_DIR/bin:$PATH"
      fi
    fi
    # shellcheck disable=SC1090
    . "$repo_root/scripts/platform-versions.sh"
  fi

  ios_min_version="${IOS_MIN_VERSION:-${PLATFORM_IOS_MIN_VERSION:-}}"
  ios_max_version="${IOS_MAX_VERSION:-${PLATFORM_IOS_MAX_VERSION:-}}"
  ios_runtime="${IOS_RUNTIME:-}"
  if [ -z "$ios_runtime" ] && command -v xcrun >/dev/null 2>&1; then
    ios_runtime="$(xcrun --sdk iphonesimulator --show-sdk-version 2>/dev/null || true)"
  fi
  if [ -z "$ios_max_version" ]; then
    ios_max_version="$ios_runtime"
  fi

  xcode_dir="${DEVELOPER_DIR:-}"
  if [ -z "$xcode_dir" ] && command -v xcode-select >/dev/null 2>&1; then
    xcode_dir="$(xcode-select -p 2>/dev/null || true)"
  fi

  xcode_version="unknown"
  if command -v xcodebuild >/dev/null 2>&1; then
    xcode_version="$(xcodebuild -version 2>/dev/null | awk 'NR==1{print $2}')"
  fi

  echo "Resolved iOS SDK"
  echo "  IOS_MIN_VERSION: ${ios_min_version:-not set}"
  echo "  IOS_MAX_VERSION: ${ios_max_version:-not set}"
  echo "  IOS_RUNTIME: ${ios_runtime:-not set}"
  echo "  xcodebuild: ${xcode_version:-unknown}"
  echo "  DEVELOPER_DIR: ${xcode_dir:-not set}"
fi
