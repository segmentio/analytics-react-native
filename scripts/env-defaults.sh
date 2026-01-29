#!/usr/bin/env sh
# Load shared platform version defaults from JSON for a single source of truth.

if [ -n "${ENV_DEFAULTS_LOADING:-}" ] || [ "${ENV_DEFAULTS_LOADED:-}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

ENV_DEFAULTS_LOADING=1
export ENV_DEFAULTS_LOADING

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
versions_json="${ENV_DEFAULTS_JSON:-$repo_root/scripts/env-defaults.json}"

if ! command -v debug_log_script >/dev/null 2>&1; then
  if [ -f "$script_dir/shared/debug.sh" ]; then
    # shellcheck disable=SC1090
    . "$script_dir/shared/debug.sh"
  fi
fi

debug_log_script "scripts/env-defaults.sh"

jq_cmd=""
if command -v jq >/dev/null 2>&1; then
  jq_cmd="jq"
elif [ -n "${DEVBOX_PACKAGES_DIR:-}" ] && [ -x "$DEVBOX_PACKAGES_DIR/bin/jq" ]; then
  jq_cmd="$DEVBOX_PACKAGES_DIR/bin/jq"
fi

if [ -f "$versions_json" ] && [ -n "$jq_cmd" ]; then
  tab="$(printf '\t')"
  while IFS="$tab" read -r key value; do
    if [ -z "$key" ]; then
      continue
    fi
    current="$(eval "printf '%s' \"\${$key-}\"")"
    if [ -z "$current" ]; then
      eval "$key=\"\$value\""
      export "$key"
    fi
  done <<EOF
$("$jq_cmd" -r 'if has("defaults") then .defaults else . end | to_entries[] | "\(.key)\t\(.value)"' "$versions_json")
EOF
  if debug_enabled; then
    if [ "${ENV_DEFAULTS_DEBUG_PRINTED:-}" != "1" ]; then
      ENV_DEFAULTS_DEBUG_PRINTED=1
      export ENV_DEFAULTS_DEBUG_PRINTED
      for key in \
        ANDROID_MIN_API \
        ANDROID_MAX_API \
        ANDROID_BUILD_TOOLS_VERSION \
        ANDROID_CMDLINE_TOOLS_VERSION \
        ANDROID_SYSTEM_IMAGE_TAG \
        ANDROID_MIN_DEVICE \
        ANDROID_MAX_DEVICE \
        IOS_MIN_VERSION \
        IOS_MAX_VERSION \
        IOS_MIN_DEVICE \
        IOS_MAX_DEVICE; do
        value="$(eval "printf '%s' \"\${$key-}\"")"
        printf 'DEBUG: %s=%s\n' "$key" "$value"
      done
    fi
  fi
fi

if [ -z "${ENV_DEFAULTS_INIT_DONE:-}" ]; then
    if [ -n "${DEVBOX_INIT_ANDROID:-}" ] || [ -n "${DEVBOX_INIT_IOS:-}" ]; then
      ENV_DEFAULTS_INIT_DONE=1
      export ENV_DEFAULTS_INIT_DONE
    scripts_root="${SCRIPTS_DIR:-$repo_root/scripts}"

    if [ "${DEVBOX_INIT_IOS:-}" = "1" ] && [ "$(uname -s)" = "Darwin" ]; then
      # shellcheck disable=SC1090
      . "$scripts_root/ios/env.sh"
    fi

    if [ "${DEVBOX_INIT_ANDROID:-}" = "1" ]; then
      # shellcheck disable=SC1090
      . "$scripts_root/android/env.sh"
      if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
        echo "Android SDK env configured (details: wiki/devbox.md#devbox-android)."
      fi
    fi
  fi
fi

ENV_DEFAULTS_LOADED=1
export ENV_DEFAULTS_LOADED
unset ENV_DEFAULTS_LOADING
