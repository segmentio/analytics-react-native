#!/usr/bin/env bash
set -euo pipefail

# Helpers for selecting an iOS runtime (uses whatever is installed).
latest_runtime() {
  local json
  json="$(xcrun simctl list runtimes -j)"
  echo "$json" | jq -r '.runtimes[] | select(.isAvailable and (.name|startswith("iOS "))) | "\(.version)|\(.identifier)|\(.name)"' \
    | sort -Vr | head -n1 | cut -d"|" -f2-
}

resolve_runtime() {
  local preferred="${1:-}"
  local json choice
  json="$(xcrun simctl list runtimes -j)"

  if [[ -n "$preferred" ]]; then
    # Normalize inputs like "iOS 26.2" or a full runtime identifier.
    if [[ "$preferred" =~ ^iOS[[:space:]]+ ]]; then
      preferred="${preferred#iOS }"
      preferred="${preferred# }"
    fi
    if [[ "$preferred" =~ ^com\.apple\.CoreSimulator\.SimRuntime\.iOS- ]]; then
      choice="$(echo "$json" | jq -r --arg v "$preferred" '.runtimes[] | select(.isAvailable and .identifier == $v) | "\(.identifier)|\(.name)"' | head -n1)"
      if [[ -n "$choice" && "$choice" != "null" ]]; then
        echo "$choice"
        return 0
      fi
      echo "Preferred runtime identifier ${preferred} not found. Install it in Xcode (Settings > Platforms) or update IOS_RUNTIME." >&2
      return 1
    fi

    choice="$(echo "$json" | jq -r --arg v "$preferred" '.runtimes[] | select(.isAvailable and (.name|startswith("iOS \($v)"))) | "\(.identifier)|\(.name)"' | head -n1)"
    if [[ -n "$choice" && "$choice" != "null" ]]; then
      echo "$choice"
      return 0
    fi

    if [[ "${IOS_DOWNLOAD_RUNTIME:-0}" != "0" ]] && command -v xcodebuild >/dev/null 2>&1; then
      local dl_target="iOS${preferred}"
      echo "Preferred runtime iOS ${preferred} not found. Attempting to download via xcodebuild -downloadPlatform ${dl_target}..." >&2
      if xcodebuild -downloadPlatform "${dl_target}" || xcodebuild -downloadPlatform iOS; then
        json="$(xcrun simctl list runtimes -j)"
        choice="$(echo "$json" | jq -r --arg v "$preferred" '.runtimes[] | select(.isAvailable and (.name|startswith("iOS \($v)"))) | "\(.identifier)|\(.name)"' | head -n1)"
        if [[ -n "$choice" && "$choice" != "null" ]]; then
          echo "$choice"
          return 0
        fi
      else
        echo "xcodebuild -downloadPlatform iOS failed." >&2
      fi
    fi

    echo "Preferred runtime iOS ${preferred} not found. Install the platform in Xcode (Settings > Platforms) or update IOS_RUNTIME." >&2
    return 1
  fi

  choice="$(latest_runtime)"
  if [[ -z "$choice" || "$choice" == "null" ]]; then
    echo "No available iOS simulator runtime found. Install one in Xcode (Settings > Platforms) and retry." >&2
    return 1
  fi

  echo "$choice"
}

init_ios_env() {
  if [[ -z "${PROJECT_ROOT:-}" ]] && command -v git >/dev/null 2>&1; then
    PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
    export PROJECT_ROOT
  fi

  if [[ -z "${DETOX_IOS_DEVICE:-}" ]]; then
    if [[ "${IOS_FLAVOR:-}" == "minsdk" || "${IOS_TARGET:-}" == "min" ]]; then
      DETOX_IOS_DEVICE="${IOS_DEVICE_NAMES:-${IOS_MIN_DEVICE:-${IOS_SIM_DEVICE:-${IOS_SIM_MAX_DEVICE:-iPhone 17}}}}"
    else
      DETOX_IOS_DEVICE="${IOS_DEVICE_NAMES:-${IOS_MAX_DEVICE:-${IOS_SIM_DEVICE:-${IOS_SIM_MAX_DEVICE:-iPhone 17}}}}"
    fi
    export DETOX_IOS_DEVICE
  fi

  if [[ -z "${IOS_ENV_INFO_PRINTED:-}" ]]; then
    local flavor="${IOS_FLAVOR:-max}" runtime_hint device_hint runtime_resolved runtime_id runtime_name dev_dir
    if [[ "$flavor" == "minsdk" || "$flavor" == "min" ]]; then
      runtime_hint="${IOS_RUNTIME:-${IOS_MIN_RUNTIME:-unknown}}"
      device_hint="${IOS_DEVICE_NAMES:-${IOS_MIN_DEVICE:-${IOS_SIM_DEVICE:-unknown}}}"
    else
      runtime_hint="${IOS_RUNTIME:-latest-installed}"
      device_hint="${IOS_DEVICE_NAMES:-${IOS_MAX_DEVICE:-${IOS_SIM_DEVICE:-unknown}}}"
    fi

    if command -v xcrun >/dev/null 2>&1; then
      runtime_resolved="$(resolve_runtime "${IOS_RUNTIME:-}")" || runtime_resolved=""
      runtime_id="$(echo "${runtime_resolved}" | cut -d'|' -f1)"
      runtime_name="$(echo "${runtime_resolved}" | cut -d'|' -f2)"
    fi

    if command -v xcode-select >/dev/null 2>&1; then
      dev_dir="$(xcode-select -p 2>/dev/null || true)"
    fi

    echo
    echo "iOS env:"
    echo "  IOS_FLAVOR=${IOS_FLAVOR:-${IOS_TARGET:-maxsdk}} (resolved ${flavor}, runtime ${runtime_hint})"
    if [[ -n "${runtime_name:-}" ]]; then
      echo "  IOS_RUNTIME_RESOLVED=${runtime_name} (${runtime_id})"
    fi
    if [[ -n "${dev_dir:-}" ]]; then
      echo "  DEVELOPER_DIR=${dev_dir}"
    fi
    echo "  IOS_DEVICE_NAMES=${IOS_DEVICE_NAMES:-unset} (comma-separated; defaults to DETOX_IOS_DEVICE)"
    echo "  DETOX_IOS_DEVICE=${DETOX_IOS_DEVICE:-${device_hint}}"
    echo "  Overrides: see wiki/ci.md#knobs"
    echo
    IOS_ENV_INFO_PRINTED=1
  fi
}

init_ios_env

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1. Install Xcode CLI tools before running (xcode-select --install or Xcode.app + xcode-select -s)." >&2
    exit 1
  fi
}

ensure_developer_dir() {
  local desired="${IOS_DEVELOPER_DIR:-}"
  if [[ -z "$desired" ]]; then
    if xcode-select -p >/dev/null 2>&1; then
      desired="$(xcode-select -p)"
    elif [[ -d /Applications/Xcode.app/Contents/Developer ]]; then
      desired="/Applications/Xcode.app/Contents/Developer"
    fi
  fi

  if [[ -n "$desired" && -d "$desired" ]]; then
    export DEVELOPER_DIR="$desired"
    export PATH="$DEVELOPER_DIR/usr/bin:$PATH"
    return 0
  fi

  echo "Xcode developer directory not found. Install Xcode/CLI tools or set IOS_DEVELOPER_DIR to an Xcode path (e.g., /Applications/Xcode.app/Contents/Developer)." >&2
  exit 1
}

ensure_simctl() {
  if xcrun -f simctl >/dev/null 2>&1; then
    return 0
  fi
  cat >&2 <<'EOF'
Missing simctl.
- The standalone Command Line Tools do NOT include simctl; you need full Xcode.
- Install/locate Xcode.app, then select it:
    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
- You can also set IOS_DEVELOPER_DIR to your Xcode path for this script.
EOF
  exit 1
}

ensure_core_sim_service() {
  local output status
  output="$(xcrun simctl list devices -j 2>&1)" || status=$?
  if [[ -n "${status:-}" ]]; then
    echo "simctl failed while listing devices (status ${status}). CoreSimulatorService may be unhealthy." >&2
    echo "Try restarting it:" >&2
    echo "  killall -9 com.apple.CoreSimulatorService 2>/dev/null || true" >&2
    echo "  launchctl kickstart -k gui/$UID/com.apple.CoreSimulatorService" >&2
    echo "Then open Simulator once and rerun setup." >&2
    echo "simctl error output:" >&2
    echo "$output" >&2
    return 1
  fi

  if echo "$output" | grep -q "CoreSimulatorService connection became invalid"; then
    echo "CoreSimulatorService is not healthy. Try restarting it:" >&2
    echo "  killall -9 com.apple.CoreSimulatorService 2>/dev/null || true" >&2
    echo "  launchctl kickstart -k gui/$UID/com.apple.CoreSimulatorService" >&2
    echo "Then open Simulator once and rerun setup." >&2
    echo "simctl error output:" >&2
    echo "$output" >&2
    return 1
  fi
}

latest_runtime() {
  local json
  json="$(xcrun simctl list runtimes -j)"
  echo "$json" | jq -r '.runtimes[] | select(.isAvailable and (.name|startswith("iOS "))) | "\(.version)|\(.identifier)|\(.name)"' \
    | sort -Vr | head -n1 | cut -d"|" -f2-
}

resolve_runtime() {
  local preferred="${1:-}"
  local json choice
  json="$(xcrun simctl list runtimes -j)"

  if [[ -n "$preferred" ]]; then
    # Normalize inputs like "iOS 26.2" or a full runtime identifier.
    if [[ "$preferred" =~ ^iOS[[:space:]]+ ]]; then
      preferred="${preferred#iOS }"
      preferred="${preferred# }"
    fi
    if [[ "$preferred" =~ ^com\.apple\.CoreSimulator\.SimRuntime\.iOS- ]]; then
      choice="$(echo "$json" | jq -r --arg v "$preferred" '.runtimes[] | select(.isAvailable and .identifier == $v) | "\(.identifier)|\(.name)"' | head -n1)"
      if [[ -n "$choice" && "$choice" != "null" ]]; then
        echo "$choice"
        return 0
      fi
      echo "Preferred runtime identifier ${preferred} not found. Install it in Xcode (Settings > Platforms) or update IOS_RUNTIME." >&2
      return 1
    fi

    choice="$(echo "$json" | jq -r --arg v "$preferred" '.runtimes[] | select(.isAvailable and (.name|startswith("iOS \($v)"))) | "\(.identifier)|\(.name)"' | head -n1)"
    if [[ -n "$choice" && "$choice" != "null" ]]; then
      echo "$choice"
      return 0
    fi

    if [[ "${IOS_DOWNLOAD_RUNTIME:-0}" != "0" ]] && command -v xcodebuild >/dev/null 2>&1; then
      local dl_target="iOS${preferred}"
      echo "Preferred runtime iOS ${preferred} not found. Attempting to download via xcodebuild -downloadPlatform ${dl_target}..." >&2
      if xcodebuild -downloadPlatform "${dl_target}" || xcodebuild -downloadPlatform iOS; then
        json="$(xcrun simctl list runtimes -j)"
        choice="$(echo "$json" | jq -r --arg v "$preferred" '.runtimes[] | select(.isAvailable and (.name|startswith("iOS \($v)"))) | "\(.identifier)|\(.name)"' | head -n1)"
        if [[ -n "$choice" && "$choice" != "null" ]]; then
          echo "$choice"
          return 0
        fi
      else
        echo "xcodebuild -downloadPlatform iOS failed." >&2
      fi
    fi

    echo "Preferred runtime iOS ${preferred} not found. Install the platform in Xcode (Settings > Platforms) or update IOS_RUNTIME." >&2
    return 1
  fi

  choice="$(latest_runtime)"
  if [[ -z "$choice" || "$choice" == "null" ]]; then
    echo "No available iOS simulator runtime found. Install one in Xcode (Settings > Platforms) and retry." >&2
    return 1
  fi

  echo "$choice"
}

existing_device_udid_any_runtime() {
  local name="$1"
  xcrun simctl list devices -j | jq -r --arg name "$name" '.devices[]?[]? | select(.name == $name) | .udid' | head -n1
}

device_data_dir_exists() {
  local udid="${1:-}"
  [[ -n "$udid" ]] || return 1
  local dir="$HOME/Library/Developer/CoreSimulator/Devices/$udid"
  [[ -d "$dir" ]]
}

devicetype_id_for_name() {
  local name="$1"
  xcrun simctl list devicetypes -j | jq -r --arg name "$name" '.devicetypes[] | select((.name|ascii_downcase) == ($name|ascii_downcase)) | .identifier' | head -n1
}

ensure_device() {
  local base_name="$1" preferred_runtime="$2"

  if existing_udid=$(existing_device_udid_any_runtime "$base_name"); [[ -n "${existing_udid}" ]]; then
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

  if existing_udid=$(existing_device_udid_any_runtime "$display_name"); [[ -n "${existing_udid}" ]]; then
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

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  # Only env defaults when sourced.
  return 0
fi

action="${1:-}"
shift || true

run_ios() {
  local boot="${1:-boot}" flavor="${IOS_FLAVOR:-max}"
  if [[ "$flavor" == "minsdk" ]]; then
    local default_device="${IOS_MIN_DEVICE:-iPhone 13}"
    export IOS_DEVICE_NAMES="${IOS_DEVICE_NAMES:-$default_device}"
    export IOS_RUNTIME="${IOS_RUNTIME:-${IOS_MIN_RUNTIME:-15.0}}"
    export DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-$default_device}"
  else
    local default_device="${IOS_MAX_DEVICE:-${IOS_SIM_MAX_DEVICE:-iPhone 17}}"
    export IOS_DEVICE_NAMES="${IOS_DEVICE_NAMES:-$default_device}"
    # Default to latest installed runtime when not pinned.
    export IOS_RUNTIME="${IOS_RUNTIME:-${IOS_MAX_RUNTIME:-}}"
    export DETOX_IOS_DEVICE="${DETOX_IOS_DEVICE:-$default_device}"
  fi

  ensure_developer_dir
  require_tool xcrun
  require_tool jq
  ensure_simctl
  ensure_core_sim_service || return 1

  IFS=',' read -r -a devices <<<"${IOS_DEVICE_NAMES}"
  local runtime_choice runtime_id runtime_name
  runtime_choice="$(resolve_runtime "${IOS_RUNTIME:-}")"
  runtime_id="$(echo "${runtime_choice}" | cut -d'|' -f1)"
  runtime_name="$(echo "${runtime_choice}" | cut -d'|' -f2)"

  for device in "${devices[@]}"; do
    ensure_device "$(echo "$device" | xargs)" "$runtime_name"
  done

  local sim_device="${DETOX_IOS_DEVICE:-$(echo "${devices[0]}" | xargs)}"
  if [[ "$boot" != "boot" ]]; then
    echo "Prepared iOS simulators for ${sim_device}${runtime_name:+ (runtime ${runtime_name})}; skipping boot."
    return 0
  fi

  echo "Starting iOS simulator: ${sim_device}${runtime_name:+ (runtime ${runtime_name})}"
  xcrun simctl boot "$sim_device" >/dev/null 2>&1 || true
  open -a Simulator

  if [[ "${IOS_MANAGER_FOREGROUND:-}" == "1" || "${IOS_MANAGER_FOREGROUND:-}" == "true" ]]; then
    tail -f /dev/null
  fi
}

stop_ios() {
  require_tool xcrun
  echo "Shutting down all simulators..."
  xcrun simctl shutdown all >/dev/null 2>&1 || true
}

reset_ios() {
  require_tool xcrun
  echo "Erasing all simulators..."
  xcrun simctl erase all >/dev/null 2>&1 || true
}

case "$action" in
  start) run_ios boot ;;
  prepare) run_ios noboot ;;
  info)
    # Ensure env defaults and print the banner without starting anything.
    init_ios_env
    ;;
  stop) stop_ios ;;
  reset) reset_ios ;;
  *) echo "Usage: ios.sh {start|prepare|stop|reset}" >&2; exit 1 ;;
esac
