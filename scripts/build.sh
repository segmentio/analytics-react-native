#!/usr/bin/env bash
set -euo pipefail

yarn install --immutable
yarn build
yarn lint
