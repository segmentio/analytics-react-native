#!/bin/bash

set -e

cd project
rm -rf node_modules
yarn

cd android

# Upgrade the build tools to 3.1.4 and Gradle to 4.4
./gradlew --no-daemon --max-workers=1 -Dorg.gradle.jvmargs="-Xmx1024m -XX:+HeapDumpOnOutOfMemoryError" wrapper --gradle-version=4.4 --distribution-type=bin
sed -i.bak s/tools.build:gradle:2.3.3/tools.build:gradle:3.1.4/g build.gradle

yarn react-native link
./gradlew --no-daemon --max-workers=1 -Dorg.gradle.jvmargs="-Xmx1024m -XX:+HeapDumpOnOutOfMemoryError" build
