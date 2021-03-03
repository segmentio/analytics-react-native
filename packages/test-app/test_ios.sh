#!/bin/bash

set -ex

cfg=""

pushd project/ios
    if [[ $COCOAPODS == "yes" ]]; then
        cp -r ../../patches/Podfile .
        yarn react-native link
        pod install --repo-update
        cfg="cocoapods"
    else
        echo "import {Analytics} from '@segment/analytics-react-native'" > ../integrations.gen.ts
        echo "export default [] as Analytics.Integration[]" >> ../integrations.gen.ts
        rm -rf TestApp.xcodeproj
        cp -r ../../patches/TestApp.xcodeproj .
        yarn remove $(cd ../../../integrations/build && echo @segment/*)
        yarn react-native link
        yarn add @segment/analytics-ios@github:segmentio/analytics-ios#3.6.10
        cfg="vanilla"
    fi
popd

yarn detox build --configuration ios-$cfg
yarn detox test --configuration ios-$cfg --loglevel trace
