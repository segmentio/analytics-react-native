#!/bin/bash

set -ex

pushd project
    yarn react-native link
popd

detox build --configuration android

# Android E2E tests are not working yet
# detox test --configuration android
