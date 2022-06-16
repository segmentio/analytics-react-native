#!/usr/bin/env bash

avdmanager=$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager
sdkmanager=$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager
emulator=$ANDROID_HOME/emulator/emulator
green=`tput setaf 2`
reset=`tput sgr0`

if ! $avdmanager list avd -c | grep -q 'Pixel_API_31_AOSP';
then
  echo "${green}=> Installing emulator ${reset}"
  $sdkmanager --install emulator
  
  echo "${green}=> Adding SDK 31 arm64-v8a${reset}"
  $sdkmanager "system-images;android-31;default;arm64-v8a"
  
  echo "${green}=> Creating Pixel_API_31_AOSP emulator${reset}"
  $avdmanager create avd -n Pixel_API_31_AOSP -d pixel_xl --package "system-images;android-31;default;arm64-v8a" 
fi

$emulator -avd Pixel_API_31_AOSP -no-snapshot -noaudio -no-boot-anim &

echo "${green}📱  Pixel_API_31_AOSP emulator ready!${reset}"