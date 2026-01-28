#!/usr/bin/env sh
# Load shared platform version defaults from JSON for a single source of truth.

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
versions_json="${PLATFORM_VERSIONS_JSON:-$repo_root/nix/platform-versions.json}"

if [ -f "$versions_json" ] && command -v jq >/dev/null 2>&1; then
  eval "$(
    jq -r 'to_entries[] | "\(.key)=\(.value|@sh)"' "$versions_json"
  )"
fi
