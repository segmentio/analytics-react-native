#!/usr/bin/env sh
set -eu

action="${1:-}"
shift || true

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/env.sh"
debug_log_script "scripts/android/manager.sh"

start_android() {
  flavor="${AVD_FLAVOR:-latest}"
  headless="${EMU_HEADLESS:-}"
  port="${EMU_PORT:-5554}"
  avd="${DETOX_AVD:-}"

  if [ -z "$avd" ]; then
    if [ "$flavor" = "latest" ]; then
      host_arch="$(uname -m)"
      if [ "$host_arch" = "arm64" ] || [ "$host_arch" = "aarch64" ]; then
        abi="arm64_v8a"
      else
        abi="x86_64"
      fi
      avd="medium_phone_API33_${abi}"
    else
      if uname -m | grep -qi arm; then
        abi="arm64_v8a"
      else
        abi="x86_64"
      fi
      avd="pixel_API21_${abi}"
    fi
  fi

  sh "$SCRIPTS_DIR/android/setup.sh"
  target_serial="emulator-${port}"
  if command -v adb >/dev/null 2>&1; then
    adb devices | awk 'NR>1 && $2=="offline" {print $1}' | while read -r d; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
  fi
  echo "Starting Android emulator: ${avd} (flavor ${flavor}, port ${port}, headless=${headless:-0})"
  if [ -n "$headless" ]; then
    headless_flag="-no-window"
  else
    headless_flag=""
  fi
  emulator -avd "$avd" ${headless_flag:+$headless_flag} -port "$port" -gpu swiftshader_indirect -noaudio -no-boot-anim -camera-back none -accel on -writable-system -no-snapshot-save &
  adb -s "$target_serial" wait-for-device
  boot_completed=""
  until [ "$boot_completed" = "1" ]; do
    boot_completed=$(adb -s "$target_serial" shell getprop sys.boot_completed 2>/dev/null | tr -d "\r")
    sleep 5
  done
  adb -s "$target_serial" shell settings put global window_animation_scale 0
  adb -s "$target_serial" shell settings put global transition_animation_scale 0
  adb -s "$target_serial" shell settings put global animator_duration_scale 0
}

stop_android() {
  if command -v adb >/dev/null 2>&1; then
    adb devices | awk 'NR>1 && $2=="offline" {print $1}' | while read -r d; do adb -s "$d" emu kill >/dev/null 2>&1 || true; done
    devices="$(adb devices -l 2>/dev/null | awk 'NR>1{print $1}' | tr '\n' ' ')"
    if [ -n "$devices" ]; then
      echo "Stopping Android emulators: $devices"
      for d in $devices; do
        adb -s "$d" emu kill >/dev/null 2>&1 || true
      done
    else
      echo "No Android emulators detected via adb."
    fi
  else
    echo "adb not found; skipping Android emulator shutdown."
  fi
  pkill -f "emulator@" >/dev/null 2>&1 || true
  echo "Android emulators stopped (if any were running)."
}

reset_android() {
  rm -rf "$HOME/.android/avd"
  rm -f "$HOME/.android/adbkey" "$HOME/.android/adbkey.pub"
  echo "AVDs and adb keys removed. Recreate via start-android* as needed."
}

case "$action" in
  start) start_android ;;
  stop) stop_android ;;
  reset) reset_android ;;
  *)
    echo "Usage: manager.sh {start|stop|reset}" >&2
    exit 1
    ;;
 esac
