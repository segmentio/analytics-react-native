#!/usr/bin/env sh
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd)"
if [ -z "${COMMON_SH_LOADED:-}" ]; then
  # shellcheck disable=SC1090
  . "$script_dir/../shared/common.sh"
fi
load_platform_versions "$script_dir"
debug_log_script "scripts/ios/simctl.sh"

ensure_core_sim_service() {
  status=0
  output="$(xcrun simctl list devices -j 2>&1)" || status=$?
  if [ "$status" -ne 0 ]; then
    echo "simctl failed while listing devices (status ${status}). CoreSimulatorService may be unhealthy." >&2
    echo "Try restarting it:" >&2
    echo "  killall -9 com.apple.CoreSimulatorService 2>/dev/null || true" >&2
    echo "  launchctl kickstart -k gui/$UID/com.apple.CoreSimulatorService" >&2
    echo "Then open Simulator once and rerun devbox run setup-ios." >&2
    echo "simctl error output:" >&2
    echo "$output" >&2
    return 1
  fi

  if echo "$output" | grep -q "CoreSimulatorService connection became invalid"; then
    echo "CoreSimulatorService is not healthy. Try restarting it:" >&2
    echo "  killall -9 com.apple.CoreSimulatorService 2>/dev/null || true" >&2
    echo "  launchctl kickstart -k gui/$UID/com.apple.CoreSimulatorService" >&2
    echo "Then open Simulator once and rerun devbox run setup-ios." >&2
    echo "simctl error output:" >&2
    echo "$output" >&2
    return 1
  fi
}

pick_runtime() {
  preferred="$1"
  json="$(xcrun simctl list runtimes -j)"
  choice="$(echo "$json" | jq -r --arg v "$preferred" '.runtimes[] | select(.isAvailable and (.name|startswith("iOS \($v)"))) | "\(.identifier)|\(.name)"' | head -n1)"
  if [ -z "$choice" ] || [ "$choice" = "null" ]; then
    choice="$(echo "$json" | jq -r '.runtimes[] | select(.isAvailable and (.name|startswith("iOS "))) | "\(.version)|\(.identifier)|\(.name)"' | sort -Vr | head -n1 | cut -d"|" -f2-)"
  fi
  if [ -n "$choice" ] && [ "$choice" != "null" ]; then
    printf '%s\n' "$choice"
    return 0
  fi
  return 1
}

resolve_runtime() {
  preferred="$1"
  if choice="$(pick_runtime "$preferred")"; then
    printf '%s\n' "$choice"
    return 0
  fi

  if [ "${IOS_DOWNLOAD_RUNTIME:-1}" != "0" ] && command -v xcodebuild >/dev/null 2>&1; then
    echo "Preferred runtime iOS ${preferred} not found. Attempting to download via xcodebuild -downloadPlatform iOS..." >&2
    if xcodebuild -downloadPlatform iOS; then
      if choice="$(pick_runtime "$preferred")"; then
        printf '%s\n' "$choice"
        return 0
      fi
    else
      echo "xcodebuild -downloadPlatform iOS failed; continuing with available runtimes." >&2
    fi
  fi

  pick_runtime "$preferred"
}

existing_device_udid_any_runtime() {
  name="$1"
  xcrun simctl list devices -j | jq -r --arg name "$name" '.devices[]?[]? | select(.name == $name) | .udid' | head -n1
}

device_data_dir_exists() {
  udid="${1:-}"
  if [ -z "$udid" ]; then
    return 1
  fi
  dir="$HOME/Library/Developer/CoreSimulator/Devices/$udid"
  [ -d "$dir" ]
}

devicetype_id_for_name() {
  name="$1"
  xcrun simctl list devicetypes -j | jq -r --arg name "$name" '.devicetypes[] | select((.name|ascii_downcase) == ($name|ascii_downcase)) | .identifier' | head -n1
}

ensure_device() {
  base_name="$1"
  preferred_runtime="$2"

  # If a device with this name already exists anywhere, reuse it.
  existing_udid="$(existing_device_udid_any_runtime "$base_name")"
  if [ -n "$existing_udid" ]; then
    if device_data_dir_exists "$existing_udid"; then
      echo "Found existing ${base_name}: ${existing_udid}"
      return 0
    fi
    echo "Existing ${base_name} (${existing_udid}) is missing its data directory. Deleting stale simulator..."
    xcrun simctl delete "$existing_udid" || true
  fi

  choice="$(resolve_runtime "$preferred_runtime" || true)"
  if [ -z "$choice" ]; then
    echo "No available iOS simulator runtime found. Install one in Xcode (Settings > Platforms) and retry." >&2
    return 1
  fi
  runtime_id="$(printf '%s' "$choice" | cut -d'|' -f1)"
  runtime_name="$(printf '%s' "$choice" | cut -d'|' -f2)"

  display_name="${base_name} (${runtime_name})"

  device_type="$(devicetype_id_for_name "$base_name" || true)"
  if [ -z "$device_type" ]; then
    echo "Device type '${base_name}' is unavailable in this Xcode install. Skipping ${display_name}." >&2
    return 0
  fi

  # Also check for an existing device with the runtime-qualified display name.
  existing_udid="$(existing_device_udid_any_runtime "$display_name")"
  if [ -n "$existing_udid" ]; then
    if device_data_dir_exists "$existing_udid"; then
      echo "Found existing ${display_name}: ${existing_udid}"
      return 0
    fi
    echo "Existing ${display_name} (${existing_udid}) is missing its data directory. Deleting stale simulator..."
    xcrun simctl delete "$existing_udid" || true
  fi

  echo "Creating ${display_name}..."
  xcrun simctl create "$display_name" "$device_type" "$runtime_id"
  echo "Created ${display_name}"
}

# Creates local iOS simulators for common targets. Requires Xcode command-line tools and jq.
# Env overrides:
#   IOS_DEVICE_NAMES="iPhone 15,iPhone 17" (comma-separated)
#   IOS_RUNTIME="26.1" (preferred runtime prefix; falls back to latest available)
#   IOS_DOWNLOAD_RUNTIME=1 to attempt xcodebuild -downloadPlatform iOS when the preferred runtime is missing
#   IOS_DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer" to override the Xcode path; defaults to xcode-select -p or the standard Xcode.app if found

ensure_developer_dir() {
  desired="${IOS_DEVELOPER_DIR:-}"
  if [ -z "$desired" ]; then
    if xcode-select -p >/dev/null 2>&1; then
      desired="$(xcode-select -p)"
    elif [ -d /Applications/Xcode.app/Contents/Developer ]; then
      desired="/Applications/Xcode.app/Contents/Developer"
    fi
  fi

  if [ -n "$desired" ] && [ -d "$desired" ]; then
    DEVELOPER_DIR="$desired"
    PATH="$DEVELOPER_DIR/usr/bin:$PATH"
    export DEVELOPER_DIR PATH
    return 0
  fi

  echo "Xcode developer directory not found. Install Xcode/CLI tools or set IOS_DEVELOPER_DIR to an Xcode path (e.g., /Applications/Xcode.app/Contents/Developer)." >&2
  exit 1
}

ensure_simctl() {
  if xcrun -f simctl >/dev/null 2>&1; then
    return 0
  fi
  cat >&2 <<'EOM'
Missing simctl.
- The standalone Command Line Tools do NOT include simctl; you need full Xcode.
- Install/locate Xcode.app, then select it:
    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
- You can also set IOS_DEVELOPER_DIR to your Xcode path for this script.
EOM
  exit 1
}

ios_setup() {
  ensure_developer_dir
  require_tool xcrun "Missing required tool: xcrun. Install Xcode CLI tools before running (xcode-select --install or Xcode.app + xcode-select -s)."
  require_tool jq
  ensure_simctl

  if ! ensure_core_sim_service; then
    return 1
  fi
  devices_list="${IOS_DEVICE_NAMES:-${IOS_MIN_DEVICE:-${PLATFORM_IOS_MIN_DEVICE:-iPhone 13}},${IOS_MAX_DEVICE:-${PLATFORM_IOS_MAX_DEVICE:-iPhone 17}}}"
  runtime="${IOS_RUNTIME:-}"
  if [ -z "$runtime" ] && command -v xcrun >/dev/null 2>&1; then
    runtime="$(xcrun --sdk iphonesimulator --show-sdk-version 2>/dev/null || true)"
  fi

  ifs_backup="$IFS"
  IFS=','
  for device in $devices_list; do
    device_trimmed="$(printf '%s' "$device" | xargs)"
    ensure_device "$device_trimmed" "$runtime"
  done
  IFS="$ifs_backup"
  echo "Done. Launch via Xcode > Devices or 'xcrun simctl boot \"<name>\"' then 'open -a Simulator'."
}

if [ "${RUN_MAIN:-1}" = "1" ]; then
  action="${1:-}"
  shift || true
  case "$action" in
    setup) ios_setup "$@" ;;
    *)
      echo "Usage: simctl.sh {setup}" >&2
      exit 1
      ;;
  esac
fi
