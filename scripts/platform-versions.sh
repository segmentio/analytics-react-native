#!/usr/bin/env sh
# Load shared platform version defaults from JSON for a single source of truth.

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
versions_json="${PLATFORM_VERSIONS_JSON:-$repo_root/nix/platform-versions.json}"

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
fi
