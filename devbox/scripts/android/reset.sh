#!/usr/bin/env bash
set -euo pipefail

rm -rf ~/.android/avd
rm -f ~/.android/adbkey*
echo "AVDs and adb keys removed. Recreate via devbox run start-android* as needed."
