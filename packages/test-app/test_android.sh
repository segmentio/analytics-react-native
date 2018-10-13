#!/bin/bash

set -e

pushd project
    pushd android
        export GRADLE_OPTS="-Xmx1024m"

        # Upgrade the Gradle wrapper to 4.6
        ./gradlew wrapper --gradle-version=4.6

        yarn react-native link
    popd
popd

yarn detox build --configuration android

# Android E2E tests are not working yet
# yarn detox test --configuration android
