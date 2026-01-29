#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
if [ -z "${COMMON_SH_LOADED:-}" ]; then
  # shellcheck disable=SC1090
  . "$script_dir/shared/common.sh"
fi
debug_log_script "scripts/build.sh"

build_project() {
  yarn install --immutable
  yarn build
  yarn lint
}

if [ "${RUN_MAIN:-1}" = "1" ]; then
  build_project "$@"
fi
