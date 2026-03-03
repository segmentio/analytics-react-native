#!/usr/bin/env bash
set -euo pipefail

# Syncs package.json version fields with the latest published npm versions.
# Run via: devbox run sync-versions

PROJECT_ROOT="${PROJECT_ROOT:-$(git rev-parse --show-toplevel)}"

updated=0
skipped=0

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
  else
    jq --arg v "$latest" '.version = $v' "$pkg_json" > "$pkg_json.tmp" && mv "$pkg_json.tmp" "$pkg_json"
    echo "  bump $name $current -> $latest"
    updated=$((updated + 1))
  fi
done

echo ""
echo "Done: $updated updated, $skipped unchanged/skipped"
