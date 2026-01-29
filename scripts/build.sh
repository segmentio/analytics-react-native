#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/shared/common.sh"
debug_log_script "scripts/build.sh"

yarn install --immutable
yarn build
yarn lint
