#!/bin/bash

set -e

cfg=""

pushd project/ios
    if [[ $COCOAPODS == "yes" ]]; then
        cp ../../src/Podfile .
        yarn react-native link
        pod install
        cat ../requires.js >> ../App.tsx
        cfg="cocoapods"
    else
        rm -rf project.xcodeproj
        cp -r ../../src/project.xcodeproj project.xcodeproj
        yarn remove $(cd ../../../integrations/build && echo @segment/*)
        yarn add @segment/analytics-ios@github:segmentio/analytics-ios#3.6.10
        yarn react-native link
        cfg="vanilla"
    fi
popd

yarn detox build --configuration ios-$cfg
yarn detox test --configuration ios-$cfg --loglevel trace
