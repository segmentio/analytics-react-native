#!/usr/bin/env bash
set -euo pipefail

project_root="${PROJECT_ROOT:-}"
if [[ -z "$project_root" ]]; then
  project_root="$(cd "$(dirname "$0")/../.." && pwd)"
fi

bash "$project_root/flox/scripts/android-setup.sh"
yarn install
yarn e2e install
yarn build
yarn e2e build:android
yarn e2e test:android
