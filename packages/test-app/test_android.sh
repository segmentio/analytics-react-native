#!/bin/bash

set -ex

pushd project
    yarn react-native link
popd

yarn detox build --configuration android

# Android E2E tests are not working yet
# yarn detox test --configuration android
