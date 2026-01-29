#!/usr/bin/env sh
# Load shared platform version defaults from JSON for a single source of truth.

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
versions_json="${PLATFORM_VERSIONS_JSON:-$repo_root/nix/platform-versions.json}"

if ! command -v debug_log_script >/dev/null 2>&1; then
  if [ -f "$script_dir/shared/debug.sh" ]; then
    # shellcheck disable=SC1090
    . "$script_dir/shared/debug.sh"
  fi
fi

debug_log_script "scripts/platform-versions.sh"

jq_cmd=""
if command -v jq >/dev/null 2>&1; then
  jq_cmd="jq"
elif [ -n "${DEVBOX_PACKAGES_DIR:-}" ] && [ -x "$DEVBOX_PACKAGES_DIR/bin/jq" ]; then
  jq_cmd="$DEVBOX_PACKAGES_DIR/bin/jq"
fi

if [ -f "$versions_json" ] && [ -n "$jq_cmd" ]; then
  eval "$(
    "$jq_cmd" -r 'to_entries[] | "\(.key)=\(.value|@sh)"' "$versions_json"
  )"
  if debug_enabled; then
    if [ "${PLATFORM_VERSIONS_DEBUG_PRINTED:-}" != "1" ]; then
      PLATFORM_VERSIONS_DEBUG_PRINTED=1
      export PLATFORM_VERSIONS_DEBUG_PRINTED
      for key in \
        PLATFORM_ANDROID_MIN_API \
        PLATFORM_ANDROID_MAX_API \
        PLATFORM_ANDROID_BUILD_TOOLS_VERSION \
        PLATFORM_ANDROID_CMDLINE_TOOLS_VERSION \
        PLATFORM_ANDROID_SYSTEM_IMAGE_TAG \
        PLATFORM_ANDROID_MIN_DEVICE \
        PLATFORM_ANDROID_MAX_DEVICE \
        PLATFORM_IOS_MIN_VERSION \
        PLATFORM_IOS_MAX_VERSION \
        PLATFORM_IOS_MIN_DEVICE \
        PLATFORM_IOS_MAX_DEVICE; do
        value="$(eval "printf '%s' \"\${$key-}\"")"
        printf 'DEBUG: %s=%s\n' "$key" "$value"
      done
    fi
  fi
fi
