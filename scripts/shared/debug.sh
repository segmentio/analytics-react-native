#!/usr/bin/env sh
set -eu

debug_enabled() {
  [ "${ANALYTICS_CI_DEBUG:-}" = "1" ] || [ "${DEBUG:-}" = "1" ]
}

debug_log() {
  if debug_enabled; then
    printf '%s\n' "DEBUG: $*"
  fi
}

debug_log_script() {
  if debug_enabled; then
    if (return 0 2>/dev/null); then
      context="sourced"
    else
      context="run"
    fi
    debug_log "$1 ($context)"
  fi
}

debug_dump_vars() {
  if debug_enabled; then
    for var in "$@"; do
      value="$(eval "printf '%s' \"\${$var-}\"")"
      printf 'DEBUG: %s=%s\n' "$var" "$value"
    done
  fi
}
