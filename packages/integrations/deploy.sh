#!/bin/bash

set -ex
args="$@"

for module in build/@segment/*; do
    pushd $module
        npm publish $args
    popd
done
