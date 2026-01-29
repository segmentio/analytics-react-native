#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/platforms/ios/env.sh must be sourced via scripts/run.sh or scripts/bootstrap/env.sh." >&2
  exit 1
fi
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
if [ "${SHARED_LOADED:-}" != "1" ] || [ "${SHARED_LOADED_PID:-}" != "$$" ]; then
  init_path="$script_dir/../../bootstrap/env.sh"
  if [ ! -f "$init_path" ]; then
    repo_root=""
    if command -v git >/dev/null 2>&1; then
      repo_root="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || true)"
    fi
    if [ -n "$repo_root" ] && [ -f "$repo_root/scripts/bootstrap/env.sh" ]; then
      init_path="$repo_root/scripts/bootstrap/env.sh"
    fi
  fi
  # shellcheck disable=SC1090
  . "$init_path"
fi
debug_log_script "scripts/platforms/ios/env.sh"

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

IOS_ENV_LOADED=1
IOS_ENV_LOADED_PID="$$"

if debug_enabled; then
  if [ "${IOS_ENV_DEBUG_PRINTED:-}" != "1" ]; then
    IOS_ENV_DEBUG_PRINTED=1
    export IOS_ENV_DEBUG_PRINTED
    debug_dump_vars \
      IOS_RUNTIME \
      IOS_RUNTIME_MIN \
      IOS_RUNTIME_MAX \
      IOS_RUNTIME_CUSTOM \
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

if [ -n "${INIT_IOS:-}" ] && [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ] && [ -z "${IOS_SDK_SUMMARY_PRINTED:-}" ]; then
  IOS_SDK_SUMMARY_PRINTED=1
  export IOS_SDK_SUMMARY_PRINTED

  repo_root="${PROJECT_ROOT:-${DEVBOX_PROJECT_ROOT:-}}"
  if [ -z "$repo_root" ] && [ -n "${SCRIPTS_DIR:-}" ]; then
    repo_root="$(cd "$SCRIPTS_DIR/.." && pwd)"
  fi
  if [ -z "$repo_root" ]; then
    repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
  fi

  ios_runtime="${IOS_RUNTIME_MAX:-}"
  if [ -z "$ios_runtime" ] && command -v xcrun >/dev/null 2>&1; then
    ios_runtime="$(xcrun --sdk iphonesimulator --show-sdk-version 2>/dev/null || true)"
  fi

  xcode_dir="${DEVELOPER_DIR:-}"
  if [ -z "$xcode_dir" ] && command -v xcode-select >/dev/null 2>&1; then
    xcode_dir="$(xcode-select -p 2>/dev/null || true)"
  fi

  xcode_version="unknown"
  if command -v xcodebuild >/dev/null 2>&1; then
    xcode_version="$(xcodebuild -version 2>/dev/null | awk 'NR==1{print $2}')"
  fi

  ios_target_device="${DETOX_IOS_DEVICE:-}"
  if [ -z "$ios_target_device" ]; then
    if [ -n "${IOS_DEVICE_NAMES:-}" ]; then
      ios_target_device="$(printf '%s' "$IOS_DEVICE_NAMES" | cut -d',' -f1 | xargs)"
    else
      case "${TARGET_SDK:-max}" in
        min) ios_target_device="${IOS_MIN_DEVICE:-}" ;;
        max) ios_target_device="${IOS_MAX_DEVICE:-}" ;;
        custom) ios_target_device="${IOS_CUSTOM_DEVICE:-}" ;;
        *) ios_target_device="${IOS_MAX_DEVICE:-}" ;;
      esac
    fi
  fi
  ios_target_runtime="${IOS_RUNTIME:-$ios_runtime}"

  echo "Resolved iOS SDK"
  echo "  DEVELOPER_DIR: ${xcode_dir:-not set}"
  echo "  XCODE_VERSION: ${xcode_version:-unknown}"
  echo "  IOS_RUNTIME: ${ios_runtime:-not set}"
  echo "  IOS_SIM_TARGET: device=${ios_target_device:-unknown} runtime=${ios_target_runtime:-not set}"
fi
