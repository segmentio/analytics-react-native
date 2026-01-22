#!/usr/bin/env bash
set -euo pipefail

root="${DEVBOX_PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

rm -rf "$root/examples/E2E/ios/Podfile.lock"
rm -rf "$root/examples/E2E/ios/Pods"
(cd "$root/examples/E2E/android" && gradle clean)
yarn cache clean
find "$root" -type d -name node_modules -exec rmdir {} \; || true
