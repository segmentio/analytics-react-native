#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"

if [ "$(uname -s)" = "Darwin" ]; then
  . "$SCRIPTS_DIR/ios/env.sh"
fi

echo "iOS test env"
echo "  PATH=$PATH"
echo "  CC=${CC:-}"
echo "  CXX=${CXX:-}"
echo "  SDKROOT=${SDKROOT:-}"
echo "  DEVELOPER_DIR=${DEVELOPER_DIR:-}"

bash "$SCRIPTS_DIR/ios/setup.sh"
yarn install
yarn e2e install
yarn e2e pods
yarn build
yarn e2e build:ios
yarn e2e test:ios
