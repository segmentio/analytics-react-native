#!/usr/bin/env bash
set -euo pipefail

project_root="${PROJECT_ROOT:-}"
if [[ -z "$project_root" ]]; then
  project_root="$(cd "$(dirname "$0")/../.." && pwd)"
fi

bash "$project_root/flox/scripts/ios-setup.sh"
yarn install
yarn e2e install
yarn e2e pods
yarn build
yarn e2e build:ios
yarn e2e test:ios
