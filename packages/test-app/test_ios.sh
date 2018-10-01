#!/bin/bash

set -e

pushd project/ios
    cp ../../Podfile .
    yarn react-native link
    pod install
popd

yarn detox build --configuration ios
yarn detox test --configuration ios
