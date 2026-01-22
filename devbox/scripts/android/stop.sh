#!/usr/bin/env bash
set -euo pipefail

if command -v adb >/dev/null 2>&1; then
  devices=$(adb devices -l 2>/dev/null | tail -n +2 | awk '{print $1}' | tr '\n' ' ')
  if [[ -n "$devices" ]]; then
    echo "Stopping Android emulators: $devices"
    for d in $devices; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
  else
    echo "No Android emulators detected via adb."
  fi
else
  echo "adb not found; skipping Android emulator shutdown."
fi
pkill -f "emulator@" >/dev/null 2>&1 || true
echo "Android emulators stopped (if any were running)."
