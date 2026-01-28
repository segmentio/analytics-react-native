#!/usr/bin/env bash
set -euo pipefail

ensure_core_sim_service() {
  local output status
  output="$(xcrun simctl list devices -j 2>&1)" || status=$?
  if [[ -n ${status:-} ]]; then
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
  local preferred="$1"
  local json choice
  json="$(xcrun simctl list runtimes -j)"
  choice="$(echo "$json" | jq -r --arg v "$preferred" '.runtimes[] | select(.isAvailable and (.name|startswith("iOS \($v)"))) | "\(.identifier)|\(.name)"' | head -n1)"
  if [[ -z $choice || $choice == "null" ]]; then
    choice="$(echo "$json" | jq -r '.runtimes[] | select(.isAvailable and (.name|startswith("iOS "))) | "\(.version)|\(.identifier)|\(.name)"' | sort -Vr | head -n1 | cut -d"|" -f2-)"
  fi
  [[ -n $choice && $choice != "null" ]] || return 1
  echo "$choice"
}

resolve_runtime() {
  local preferred="$1"
  if choice=$(pick_runtime "$preferred"); then
    echo "$choice"
    return 0
  fi

  if [[ ${IOS_DOWNLOAD_RUNTIME:-1} != "0" ]] && command -v xcodebuild >/dev/null 2>&1; then
    echo "Preferred runtime iOS ${preferred} not found. Attempting to download via xcodebuild -downloadPlatform iOS..." >&2
    if xcodebuild -downloadPlatform iOS; then
      if choice=$(pick_runtime "$preferred"); then
        echo "$choice"
        return 0
      fi
    else
      echo "xcodebuild -downloadPlatform iOS failed; continuing with available runtimes." >&2
    fi
  fi

  pick_runtime "$preferred"
}

existing_device_udid_any_runtime() {
  local name="$1"
  xcrun simctl list devices -j | jq -r --arg name "$name" '.devices[]?[]? | select(.name == $name) | .udid' | head -n1
}

device_data_dir_exists() {
  local udid="${1:-}"
  [[ -n $udid ]] || return 1
  local dir="$HOME/Library/Developer/CoreSimulator/Devices/$udid"
  [[ -d $dir ]]
}

devicetype_id_for_name() {
  local name="$1"
  xcrun simctl list devicetypes -j | jq -r --arg name "$name" '.devicetypes[] | select((.name|ascii_downcase) == ($name|ascii_downcase)) | .identifier' | head -n1
}

ensure_device() {
  local base_name="$1" preferred_runtime="$2"

  # If a device with this name already exists anywhere, reuse it.
  if
    existing_udid=$(existing_device_udid_any_runtime "$base_name")
    [[ -n ${existing_udid} ]]
  then
    if device_data_dir_exists "$existing_udid"; then
      echo "Found existing ${base_name}: ${existing_udid}"
      return 0
    fi
    echo "Existing ${base_name} (${existing_udid}) is missing its data directory. Deleting stale simulator..."
    xcrun simctl delete "$existing_udid" || true
  fi

  local choice runtime_id runtime_name
  if ! choice=$(resolve_runtime "$preferred_runtime"); then
    echo "No available iOS simulator runtime found. Install one in Xcode (Settings > Platforms) and retry." >&2
    return 1
  fi
  runtime_id="$(echo "$choice" | cut -d'|' -f1)"
  runtime_name="$(echo "$choice" | cut -d'|' -f2)"

  local display_name="${base_name} (${runtime_name})"

  if ! device_type=$(devicetype_id_for_name "$base_name"); then
    echo "Device type '${base_name}' is unavailable in this Xcode install. Skipping ${display_name}." >&2
    return 0
  fi

  # Also check for an existing device with the runtime-qualified display name.
  if
    existing_udid=$(existing_device_udid_any_runtime "$display_name")
    [[ -n ${existing_udid} ]]
  then
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
