#!/usr/bin/env bash
set -euo pipefail

npm config set //registry.npmjs.org/:_authToken "${NPM_TOKEN:?NPM_TOKEN is required}"
yarn install --immutable
yarn build
yarn release
