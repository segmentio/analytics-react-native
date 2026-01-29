#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/shared/debug.sh must be sourced." >&2
  exit 1
fi

if [ "${DEBUG_SH_LOADED:-}" = "1" ] && [ "${DEBUG_SH_LOADED_PID:-}" = "$$" ]; then
  return 0 2>/dev/null || exit 0
fi
DEBUG_SH_LOADED=1
DEBUG_SH_LOADED_PID="$$"

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
