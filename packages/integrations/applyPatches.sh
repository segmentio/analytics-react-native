#!/bin/bash

# Apply Patches Script
#
# This necessary because Segment does not control all of the integrations that are being used.
# Some do not adhere to the project layout that this integration generation step depends on, one
# example is AppsFlyer.
#
# Patches that are applied below should have a comment explaining why the patch is necessary.
# The patch should also be very manual and targeted.  Any files needed for the patch should also
# mimic the `build` directory that gets generated.  This patch application script will be run 
# after the integration generation phase.
#
# Please discuss with @bsneed either in person or in github before adding patches.
#


### AppsFlyer patch
#
# Q: Why?
#
# A: We don't own this repo and it doesn't adhere to the structure that our integration template
#    expects. Because of this, we copy in a version with the appropriate header path applied to
#    the iOS file, main.m.

cp "./patches/@segment/analytics-react-native-appsflyer/ios/main.m" "./build/@segment/analytics-react-native-appsflyer/ios/main.m"