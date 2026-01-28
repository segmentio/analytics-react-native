#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
project_root="$(cd "$script_dir/../.." && pwd)"
bash "$project_root/scripts/android/setup.sh"
yarn install
yarn e2e install
yarn build
yarn e2e build:android
yarn e2e test:android
