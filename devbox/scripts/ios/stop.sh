#!/usr/bin/env bash
set -euo pipefail

if command -v xcrun >/dev/null 2>&1 && xcrun -f simctl >/dev/null 2>&1; then
  if xcrun simctl list devices booted | grep -q "Booted"; then
    echo "Shutting down booted iOS simulators..."
    xcrun simctl shutdown all >/dev/null 2>&1 || true
  else
    echo "No booted iOS simulators detected."
  fi
else
  echo "simctl not available; skipping iOS shutdown."
fi
echo "iOS simulators shutdown (if any were running)."
