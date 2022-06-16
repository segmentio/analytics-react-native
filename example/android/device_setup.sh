#!/usr/bin/env bash

avdmanager=$ANDROID_HOME/tools/bin/avdmanager
sdkmanager=$ANDROID_HOME/tools/bin/sdkmanager
emulator=$ANDROID_HOME/emulator/emulator
green=`tput setaf 2`
reset=`tput sgr0`

if ! $avdmanager list avd -c | grep -q 'Pixel_API_21_AOSP';
then
  echo "${green}=> Installing emulator ${reset}"
  $sdkmanager --install emulator
  
  echo "${green}=> Adding SDK 21 x86_64${reset}"
  $sdkmanager "system-images;android-21;default;x86_64"
  
  echo "${green}=> Creating Pixel_API_21_AOSP emulator${reset}"
  $avdmanager create avd -n Pixel_API_21_AOSP -d pixel_xl --package "system-images;android-21;default;x86_64" 
fi

$emulator -avd Pixel_API_21_AOSP -no-snapshot -noaudio -no-boot-anim &

echo "${green}📱  Pixel_API_21_AOSP emulator ready!${reset}"