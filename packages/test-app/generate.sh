#!/bin/bash

set -e

pwd=$(pwd)
install_command="file:$pwd/../core"
integrations_require=""

rm -rf project

yarn react-native init project

cp -r App.js calls.json project/
cd project

build_dir=$pwd/../integrations/build

for integration in `cd $build_dir && echo @segment/*`; do
    install_command+=" file:$build_dir/$integration"
    integrations_require+="require('$integration'),"
done

yarn add $install_command @babel/runtime

cat << EOF >> App.js
buildId = '$CIRCLE_WORKFLOW_ID'

analytics
  .setup('$SEGMENT_WRITE_TOKEN', {
    using: [$integrations_require],
    debug: true
  })
  .then(() => console.log('Analytics ready'))
  .catch(err => console.error('Analytics error', err))
EOF

../android-workaround.js
