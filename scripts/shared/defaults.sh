#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/shared/defaults.sh must be sourced." >&2
  exit 1
fi

if [ "${ENV_DEFAULTS_LOADED:-}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

if [ -n "${PROJECT_ROOT:-}" ]; then
  defaults_json="${ENV_DEFAULTS_JSON:-$PROJECT_ROOT/scripts/env-defaults.json}"
  jq_cmd=""
  if command -v jq >/dev/null 2>&1; then
    jq_cmd="jq"
  fi

  if [ -f "$defaults_json" ] && [ -n "$jq_cmd" ]; then
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
$($jq_cmd -r 'if has("defaults") then .defaults else . end | to_entries[] | "\(.key)\t\(.value)"' "$defaults_json")
EOF
  fi
fi

ENV_DEFAULTS_LOADED=1
export ENV_DEFAULTS_LOADED
