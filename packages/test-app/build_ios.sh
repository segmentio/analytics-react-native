#!/bin/bash

set -e

bundle install --path vendor/bundle

cd project/ios
cp ../../Podfile .

yarn react-native link
pod install
bundle exec fastlane scan --scheme project --build_for_testing
