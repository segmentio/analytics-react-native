#!/bin/bash

set -ex
args="$@"

for module in build/@uswitch/*; do
    pushd $module
        npm publish $args
    popd
done
