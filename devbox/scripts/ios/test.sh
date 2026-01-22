#!/usr/bin/env bash
set -euo pipefail

devbox run setup-ios
yarn install
yarn e2e install
yarn e2e pods
yarn build
yarn e2e build:ios
yarn e2e test:ios
