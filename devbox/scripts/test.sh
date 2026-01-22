#!/usr/bin/env bash
set -euo pipefail

devbox run test-android
devbox run test-ios
