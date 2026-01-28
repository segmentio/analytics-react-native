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
