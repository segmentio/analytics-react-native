#!/usr/bin/env bash
set -euo pipefail

project_root="${PROJECT_ROOT:-${DEVBOX_PROJECT_ROOT:-}}"
if [ -z "$project_root" ]; then
  project_root="$(cd "$(dirname "$0")/.." && pwd)"
fi

rm -rf "$project_root/examples/E2E/ios/Podfile.lock"
rm -rf "$project_root/examples/E2E/ios/Pods"
(cd "$project_root/examples/E2E/android" && gradle clean)
yarn cache clean
find "$project_root" -type d -name node_modules -exec rmdir {} \; || true
