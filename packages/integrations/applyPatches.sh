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

### Adjust patch
#
# Q: Why?
#
# A: This is an adjust integration specific feature, and should not be replicated for
# another integration. Because of this, we copy in a version with the appropriate code
# applied to the Android file, IntegrationModule.kt

cp "./patches/@segment/analytics-react-native-adjust/android/src/main/java/com/segment/analytics/reactnative/integration/adjust/IntegrationModule.kt" "./build/@segment/analytics-react-native-adjust/android/src/main/java/com/segment/analytics/reactnative/integration/adjust/IntegrationModule.kt"

### Facebook App Events patch
#
# Q: Why?
#
# A: RN 0.62 changes how imports end up getting spit out and opts for static lib pods, which
#    Xcode then uses the directory name for rather than the module name, and thus it breaks. :(

cp "./patches/@segment/analytics-react-native-facebook-app-events-ios/ios/main.m" "./build/@segment/analytics-react-native-facebook-app-events-ios/ios/main.m"

