#!/bin/bash

set -ex

pwd=$(pwd)
install_command="file:$pwd/../core"

rm -rf project seed/node_modules
cp -r seed project
cd project

sed -i -e "s/SEGMENT_WRITE_TOKEN/$SEGMENT_WRITE_TOKEN/g" App.tsx
sed -i -e "s/CIRCLE_WORKFLOW_ID/$CIRCLE_WORKFLOW_ID/g" App.tsx

build_dir=$pwd/../integrations/build
counter=0

for integration in `cd $build_dir && echo @segment/*`; do
    counter=$((counter+1))
    install_command+=" file:$build_dir/$integration"
    echo "import integration_$counter from '$integration'" >> integrations.gen.ts
    echo -e "integrations.push(integration_$counter)\n" >> integrations.gen.ts
done

yarn add $install_command @babel/runtime
yarn add typescript react-native-typescript-transformer @types/{react,react-native} --dev
yarn tsc
