#!/bin/bash

set -ex

args="$@"

cp ../../README.md .
npm publish $args 
