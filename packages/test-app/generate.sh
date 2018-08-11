#!/bin/bash

set -e

pwd=$(pwd)
install_command="file:$pwd/../core"
integrations_require=""

rm -rf project
yarn react-native init project

cp App.js project/
cd project

build_dir=$pwd/../integrations/build

for integration in `cd $build_dir && echo @segment/*`; do
    install_command+=" file:$build_dir/$integration"
    integrations_require+="require('$integration'),"
done

yarn add $install_command

write_key="qGHfVyLQjydiD6A3dipTZqbHvhlYJKFC"

js="
analytics
  .configure()
    .using($integrations_require)
    .recordScreenViews()
    .debug()
  .setup('$write_key')
    .then(() => {
      analytics.track('Test', {
        with: {
          some: ['prop', 'erties']
        }
      });
      console.log('Analytics ready')
    })
    .catch(err => {
      console.error('Analytics error', err);
      throw err
    })
"

echo $js >> App.js
