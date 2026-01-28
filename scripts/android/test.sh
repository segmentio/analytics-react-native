#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"

sh "$SCRIPTS_DIR/android/setup.sh"
yarn install
yarn e2e install
yarn build
yarn e2e build:android
yarn e2e test:android
