#!/usr/bin/env bash

green=`tput setaf 2`
reset=`tput sgr0`

display_usage() { 
  echo "This script executes commands for every plugin in packages/plugins"
  echo -e "\nUsage: \$0 [commands] \n" 
}

if [  $# -lt 1 ] 
then 
  display_usage
  exit 1
fi 

for d in packages/plugins/*/
do
  echo -e "\n${green}=> Plugin: $(basename -- $d) ${reset}"
  (cd "$d" && test -r package.json && "$@")
done
