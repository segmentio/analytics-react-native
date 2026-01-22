#!/usr/bin/env bash
set -euo pipefail

xcrun simctl shutdown all || true
xcrun simctl erase all || true
xcrun simctl delete all || true
xcrun simctl delete unavailable || true
killall -9 com.apple.CoreSimulatorService 2>/dev/null || true
echo "Simulators reset via simctl. Recreate via devbox run start-ios."
