#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"

if [ "$(uname -s)" = "Darwin" ]; then
  . "$SCRIPTS_DIR/ios/env.sh"
fi

if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "iOS test env"
  echo "  PATH=$PATH"
  echo "  CC=${CC:-}"
  echo "  CXX=${CXX:-}"
  echo "  SDKROOT=${SDKROOT:-}"
  echo "  DEVELOPER_DIR=${DEVELOPER_DIR:-}"
fi

sh "$SCRIPTS_DIR/ios/setup.sh"
yarn install
yarn e2e install
yarn e2e pods
yarn build
yarn e2e build:ios
yarn e2e test:ios
