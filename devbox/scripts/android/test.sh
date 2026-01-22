#!/usr/bin/env bash
set -euo pipefail

devbox run setup-android
yarn install
yarn e2e install
yarn build
yarn e2e build:android
yarn e2e test:android
