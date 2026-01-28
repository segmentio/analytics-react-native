#!/usr/bin/env bash
set -euo pipefail

action="${1:-}"
shift || true

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/android-env.sh"

start_android() {
  local flavor="${AVD_FLAVOR:-minsdk}" headless="${EMU_HEADLESS:-}" port="${EMU_PORT:-5554}"
  local avd="${DETOX_AVD:-}"

  if [[ -z $avd ]]; then
    if [[ $flavor == "latest" ]]; then
      local host_arch
      host_arch="$(uname -m)"
      avd="medium_phone_API33_$([[ $host_arch == "arm64" || $host_arch == "aarch64" ]] && echo arm64_v8a || echo x86_64)"
    else
      avd="pixel_API21_$(uname -m | grep -qi arm && echo arm64_v8a || echo x86_64)"
    fi
  fi

  devbox run setup-android
  local target_serial="emulator-${port}"
  if command -v adb >/dev/null 2>&1; then
    adb devices | awk 'NR>1 && $2=="offline" {print $1}' | while read -r d; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
  fi
  echo "Starting Android emulator: ${avd} (flavor ${flavor}, port ${port}, headless=${headless:-0})"
  emulator -avd "${avd}" ${headless:+-no-window} -port "${port}" -gpu swiftshader_indirect -noaudio -no-boot-anim -camera-back none -accel on -writable-system -no-snapshot-save &
  adb -s "${target_serial}" wait-for-device
  local boot_completed=""
  until [ "$boot_completed" = "1" ]; do
    boot_completed=$(adb -s "${target_serial}" shell getprop sys.boot_completed 2>/dev/null | tr -d "\r")
    sleep 5
  done
  adb -s "${target_serial}" shell settings put global window_animation_scale 0
  adb -s "${target_serial}" shell settings put global transition_animation_scale 0
  adb -s "${target_serial}" shell settings put global animator_duration_scale 0
}

stop_android() {
  devbox run stop-android
}

reset_android() {
  devbox run reset-android
}

case "$action" in
start) start_android ;;
stop) stop_android ;;
reset) reset_android ;;
*)
  echo "Usage: android-manager.sh {start|stop|reset}" >&2
  exit 1
  ;;
esac
