#!/usr/bin/env bash
set -euo pipefail

# Regenerate flox lockfiles in dependency-safe order.
# Ensures flake path resolution and Nix flake features are available.

export NIX_CONFIG="${NIX_CONFIG:-experimental-features = nix-command flakes}"

project_root="${PROJECT_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

update_env() {
  local dir="$1"
  echo "Updating flox environment: $dir"
  if ! flox include upgrade -d "$dir"; then
    echo "include upgrade failed for $dir; trying flox list to resync lock..."
    flox list -d "$dir" >/dev/null
    flox include upgrade -d "$dir"
  fi
}

pushd "$project_root" >/dev/null

update_env "env/android/min"
update_env "env/android/latest"
update_env "env/ios"
update_env "env/ios/min"
update_env "env/ios/latest"
update_env "."

popd >/dev/null

echo "Flox lockfiles refreshed."
