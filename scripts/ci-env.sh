#!/usr/bin/env bash
set -euo pipefail

platform="${1:-}"
if [ -z "$platform" ]; then
  echo "Usage: scripts/ci-env.sh <android-min|android-max|ios-min|ios-max|fast> [output-dir]" >&2
  exit 1
fi

project_root="${PROJECT_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
templates_dir="${TEMPLATES_DIR:-$project_root/../templates}"
if [ ! -d "$templates_dir/env" ]; then
  echo "Templates repo not found at ${templates_dir}. Set TEMPLATES_DIR to the checkout path." >&2
  exit 1
fi

out_dir="${2:-${RUNNER_TEMP:-/tmp}/flox-ci-${platform}}"
mkdir -p "$out_dir/.flox/env"

cat > "$out_dir/.flox/env.json" <<JSON
{
  "name": "ci-${platform}",
  "version": 1
}
JSON

case "$platform" in
  fast)
    includes=(
      "$project_root/env/common"
      "$templates_dir/env/nodejs"
    )
    ;;
  android-min)
    includes=(
      "$project_root/env/common"
      "$templates_dir/env/android/common"
      "$templates_dir/env/android/min"
      "$templates_dir/env/nodejs"
    )
    ;;
  android-max)
    includes=(
      "$project_root/env/common"
      "$templates_dir/env/android/common"
      "$templates_dir/env/android/max"
      "$templates_dir/env/nodejs"
    )
    ;;
  ios-min)
    includes=(
      "$project_root/env/common"
      "$templates_dir/env/ios/common"
      "$templates_dir/env/ios/min"
      "$templates_dir/env/nodejs"
    )
    ;;
  ios-max)
    includes=(
      "$project_root/env/common"
      "$templates_dir/env/ios/common"
      "$templates_dir/env/ios/max"
      "$templates_dir/env/nodejs"
    )
    ;;
  *)
    echo "Unknown platform: $platform" >&2
    exit 1
    ;;
esac

{
  echo "version = 1"
  echo
  echo "[install]"
  echo
  echo "[vars]"
  echo
  echo "[hook]"
  echo " on-activate = ''"
  echo
  echo "[profile]"
  echo
  echo "[services]"
  echo
  echo "[include]"
  echo " environments = ["
  for dir in "${includes[@]}"; do
    echo "     { dir = \"$dir\" },"
  done
  echo " ]"
  echo
  echo "[build]"
  echo
  echo "[options]"
} > "$out_dir/.flox/env/manifest.toml"

echo "$out_dir"
