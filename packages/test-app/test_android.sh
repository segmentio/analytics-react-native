#!/bin/bash

set -e

pushd project
    pushd android
        export GRADLE_OPTS="-Xmx1024m"

        yarn react-native link
    popd
popd

yarn detox build --configuration android

# Android E2E tests are not working yet
# yarn detox test --configuration android
