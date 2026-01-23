#!/usr/bin/env bash
set -euo pipefail

target="${1:-all}"
export NIX_CONFIG="${NIX_CONFIG:-experimental-features = nix-command flakes}"

project_root="${PROJECT_ROOT:-}"
if [ -z "$project_root" ]; then
  project_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi
cd "$project_root"

update_flox_envs() {
  update_env() {
    local dir="$1"
    local abs="$project_root/$dir"
    local manifest="$abs/.flox/env/manifest.toml"
    local has_includes=false

    if [ -f "$manifest" ] && grep -q "environments" "$manifest"; then
      has_includes=true
    fi

    echo "Updating flox environment: $abs"
    flox update -d "$abs"
    if "$has_includes"; then
      if ! flox include upgrade -d "$abs"; then
        flox list -d "$abs" >/dev/null || true
        flox include upgrade -d "$abs"
      fi
    fi
    # Ensure manifest/lock are in sync (regenerate lock if hooks changed)
    flox list -d "$abs" >/dev/null || true
  }

  # Update base envs first (no includes), then include-aware envs in dependency order.
  update_env "env/common"
  update_env "env/nodejs"
  update_env "env/android/android-common"
  update_env "env/android/min"
  update_env "env/android/latest"
  update_env "env/ios"
  update_env "env/ios/min"
  update_env "env/ios/latest"
  update_env "."
}

update_yarn() {
  yarn install --immutable || yarn install --check-cache
}

update_gradle() {
  if [ -d examples/E2E/android ]; then
    (cd examples/E2E/android && ./gradlew --refresh-dependencies) || true
  fi
}

update_pods() {
  if [ -d examples/E2E ]; then
    (cd examples/E2E && yarn e2e pods) || true
  fi
}

update_nix() {
  nix --extra-experimental-features "nix-command flakes" flake update env/android/min || true
  nix --extra-experimental-features "nix-command flakes" flake update env/android/latest || true
}

case "$target" in
  flox) update_flox_envs ;;
  yarn) update_yarn ;;
  gradle) update_gradle ;;
  pods|cocoapods) update_pods ;;
  nix) update_nix ;;
  all)
    update_flox_envs
    update_yarn
    update_gradle
    update_pods
    update_nix
    ;;
  *)
    echo "Unknown update target: $target"
    echo "Valid targets: all, flox, yarn, gradle, pods, nix"
    exit 1
    ;;
esac

echo "Update ($target) complete."
