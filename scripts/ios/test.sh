#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"
debug_log_script "scripts/ios/test.sh"

if [ "$(uname -s)" = "Darwin" ]; then
  . "$SCRIPTS_DIR/ios/env.sh"
fi

sh "$SCRIPTS_DIR/ios/setup.sh"
yarn install
yarn e2e install
yarn e2e pods
yarn build
yarn e2e build:ios
yarn e2e test:ios
