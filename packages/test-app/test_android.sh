#!/bin/bash

set -ex

pushd project
    yarn react-native link
popd

detox build --configuration android.emu.release

# CircleCI does not support running Android emulators: https://circleci.com/docs/2.0/language-android/
# An alternate solution will be required to run e2e tests for Android

# detox test --configuration android.emu.release