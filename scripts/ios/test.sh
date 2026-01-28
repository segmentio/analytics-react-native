#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
project_root="$(cd "$script_dir/../.." && pwd)"

if [ "$(uname -s)" = "Darwin" ]; then
  . "$project_root/scripts/ios/env.sh"
fi

echo "iOS test env"
echo "  PATH=$PATH"
echo "  CC=${CC:-}"
echo "  CXX=${CXX:-}"
echo "  SDKROOT=${SDKROOT:-}"
echo "  DEVELOPER_DIR=${DEVELOPER_DIR:-}"

bash "$project_root/scripts/ios/setup.sh"
yarn install
yarn e2e install
yarn e2e pods
yarn build
yarn e2e build:ios
yarn e2e test:ios
