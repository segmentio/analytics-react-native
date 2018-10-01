#!/bin/bash

set -e

pushd project
    # rm -rf node_modules
    # yarn

    pushd android
        export GRADLE_OPTS="-Xmx1024m"

        # Upgrade the build tools to 3.1.4 and Gradle to 4.4
        ./gradlew wrapper --gradle-version=4.4
        sed -i.bak s/tools.build:gradle:2.2.3/tools.build:gradle:3.1.4/g build.gradle

        yarn react-native link
    popd
popd

yarn detox build --configuration android

# Android E2E tests are not working yet
# yarn detox test --configuration android
