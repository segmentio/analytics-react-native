#!/usr/bin/env bash
set -euo pipefail

# Syncs package.json version fields with the latest published npm versions.
#
# Usage:
#   devbox run sync-versions              # update version fields in place
#   devbox run sync-versions-check        # check only, fail if out of sync
#
# If the CI check fails, run `devbox run sync-versions` locally and commit.

CHECK_ONLY=false
if [ "${1:-}" = "--check" ]; then
  CHECK_ONLY=true
fi

PROJECT_ROOT="${PROJECT_ROOT:-$(git rev-parse --show-toplevel)}"

updated=0
skipped=0
drift=0

for pkg_json in "$PROJECT_ROOT"/packages/*/package.json "$PROJECT_ROOT"/packages/plugins/*/package.json; do
  [ -f "$pkg_json" ] || continue

  name=$(jq -r '.name' "$pkg_json")
  private=$(jq -r '.private // false' "$pkg_json")
  current=$(jq -r '.version' "$pkg_json")

  if [ "$private" = "true" ]; then
    echo "  skip $name (private)"
    skipped=$((skipped + 1))
    continue
  fi

  latest=$(npm view "$name" version 2>/dev/null || echo "")
  if [ -z "$latest" ]; then
    echo "  skip $name (not on npm)"
    skipped=$((skipped + 1))
    continue
  fi

  if [ "$current" = "$latest" ]; then
    echo "  ok   $name@$current"
    skipped=$((skipped + 1))
  elif [ "$CHECK_ONLY" = true ]; then
    echo "  drift $name $current (local) != $latest (npm)"
    drift=$((drift + 1))
  else
    jq --arg v "$latest" '.version = $v' "$pkg_json" >"$pkg_json.tmp" && mv "$pkg_json.tmp" "$pkg_json"
    echo "  bump $name $current -> $latest"
    updated=$((updated + 1))
  fi
done

echo ""
if [ "$CHECK_ONLY" = true ]; then
  if [ "$drift" -gt 0 ]; then
    echo "Error: $drift package(s) out of sync with npm."
    echo "Run 'devbox run sync-versions' locally and commit the result."
    exit 1
  fi
  echo "All $skipped package(s) in sync with npm."
else
  echo "Done: $updated updated, $skipped unchanged/skipped"
fi
