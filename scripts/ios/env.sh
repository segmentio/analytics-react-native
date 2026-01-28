#!/usr/bin/env bash
set -euo pipefail

devbox_omit_nix_env() {
  if [ "${DEVBOX_OMIT_NIX_ENV_APPLIED:-}" = "1" ]; then
    return 0
  fi

  export DEVBOX_OMIT_NIX_ENV_APPLIED=1

  dump_env() {
    if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
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
      export CC=/usr/bin/clang
      export CXX=/usr/bin/clang++
    fi

    if command -v xcode-select >/dev/null 2>&1; then
      dev_dir="$(xcode-select -p 2>/dev/null || true)"
      if [ -n "$dev_dir" ]; then
        export DEVELOPER_DIR="$dev_dir"
      fi
    fi

    unset SDKROOT
  fi

  dump_env "after"

}

devbox_omit_nix_env

if [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ] && [ -z "${DEVBOX_IOS_SDK_SUMMARY_PRINTED:-}" ]; then
  DEVBOX_IOS_SDK_SUMMARY_PRINTED=1
  export DEVBOX_IOS_SDK_SUMMARY_PRINTED

  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
  repo_root="$(cd "$script_dir/../.." && pwd)"

  if [ -z "${PLATFORM_IOS_MIN_RUNTIME:-}" ] || [ -z "${PLATFORM_ANDROID_MIN_API:-}" ]; then
    if ! command -v jq >/dev/null 2>&1; then
      if [ -n "${DEVBOX_PACKAGES_DIR:-}" ] && [ -x "$DEVBOX_PACKAGES_DIR/bin/jq" ]; then
        PATH="$DEVBOX_PACKAGES_DIR/bin:$PATH"
      fi
    fi
    # shellcheck disable=SC1090
    . "$repo_root/scripts/platform-versions.sh"
  fi

  ios_min_runtime="${IOS_MIN_RUNTIME:-${PLATFORM_IOS_MIN_RUNTIME:-}}"
  ios_max_runtime="${IOS_MAX_RUNTIME:-${PLATFORM_IOS_MAX_RUNTIME:-}}"
  if [ -z "$ios_max_runtime" ] && command -v xcrun >/dev/null 2>&1; then
    ios_max_runtime="$(xcrun --sdk iphonesimulator --show-sdk-version 2>/dev/null || true)"
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
  echo "  Runtime Min: ${ios_min_runtime:-not set}"
  echo "  Runtime Max: ${ios_max_runtime:-not set}"
  echo "  Xcode: ${xcode_version:-unknown}"
  echo "  Xcode Dir: ${xcode_dir:-not set}"
fi
