#!/bin/bash

set -e

pwd=$(pwd)
install_command="file:$pwd/../core"
integrations_require=""

rm -rf project

yarn react-native init project --version=react-native@0.59.2

cp -r src/* project/
cd project
rm App.js

sed -i -e "s/SEGMENT_WRITE_TOKEN/$SEGMENT_WRITE_TOKEN/g" App.tsx
sed -i -e "s/CIRCLE_WORKFLOW_ID/$CIRCLE_WORKFLOW_ID/g" App.tsx

build_dir=$pwd/../integrations/build
counter=0

for integration in `cd $build_dir && echo @segment/*`; do
    counter=$((counter+1))
    install_command+=" file:$build_dir/$integration"
    integrations_require+="import integration_$counter from '$integration';"
    integrations_require+="SEGMENT_INTEGRATIONS.push(integration_$counter);"
done

echo -e $integrations_require >> requires.js

yarn add $install_command @babel/runtime
yarn add typescript react-native-typescript-transformer @types/{react,react-native} --dev
yarn tsc

../android-workaround.js
