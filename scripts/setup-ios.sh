#!/usr/bin/env bash
set -euo pipefail

# Creates local iOS simulators for common targets. Requires Xcode command-line tools and jq.

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1. Install Xcode CLI tools before running." >&2
    exit 1
  fi
}

require_tool xcrun
require_tool jq

runtime_info_for_version() {
  local version="$1"
  local json runtime_id runtime_name
  json="$(xcrun simctl list runtimes -j)"
  runtime_id="$(echo "$json" | jq -r --arg v "$version" '.runtimes[] | select(.isAvailable and (.name|startswith("iOS \($v)"))) | .identifier' | head -n1)"
  runtime_name="$(echo "$json" | jq -r --arg v "$version" '.runtimes[] | select(.isAvailable and (.name|startswith("iOS \($v)"))) | .name' | head -n1)"

  if [[ -z "$runtime_id" || "$runtime_id" == "null" ]]; then
    return 1
  fi
  printf "match|%s|%s\n" "$runtime_id" "$runtime_name"
}

existing_device_udid_any_runtime() {
  local name="$1"
  xcrun simctl list devices -j | jq -r --arg name "$name" '.devices[]?[]? | select(.name == $name) | .udid' | head -n1
}

devicetype_id_for_name() {
  local name="$1"
  xcrun simctl list devicetypes -j | jq -r --arg name "$name" '.devicetypes[] | select((.name|ascii_downcase) == ($name|ascii_downcase)) | .identifier' | head -n1
}

ensure_device() {
  local base_name="$1" os_version="$2"

  # If a device with this name already exists anywhere, reuse it.
  if existing_udid=$(existing_device_udid_any_runtime "$base_name"); [[ -n "${existing_udid}" ]]; then
    echo "Found existing ${base_name}: ${existing_udid}"
    return 0
  fi

  local info status runtime_id runtime_name
  if ! info=$(runtime_info_for_version "$os_version"); then
    echo "Required runtime iOS ${os_version} not found. Install it in Xcode (Preferences > Platforms) and retry." >&2
    return 0
  fi
  IFS="|" read -r status runtime_id runtime_name <<<"$info"

  local display_name="${base_name} (${runtime_name})"

  if ! device_type=$(devicetype_id_for_name "$base_name"); then
    echo "Device type '${base_name}' is unavailable in this Xcode install. Skipping ${display_name}." >&2
    return 0
  fi

  if ! device_type=$(devicetype_id_for_name "$base_name"); then
    echo "Device type '${base_name}' is unavailable in this Xcode install. Skipping ${display_name}." >&2
    return 0
  fi

  # Also check for an existing device with the runtime-qualified display name.
  if existing_udid=$(existing_device_udid_any_runtime "$display_name"); [[ -n "${existing_udid}" ]]; then
    echo "Found existing ${display_name}: ${existing_udid}"
    return 0
  fi

  echo "Creating ${display_name}..."
  xcrun simctl create "$display_name" "$device_type" "$runtime_id"
}

main() {
  ensure_device "iPhone 14" "16"
  ensure_device "iPhone 17" "26.1.1"
  echo "Done. Launch via Xcode > Devices or 'xcrun simctl boot \"<name>\"' then 'open -a Simulator'."
}

main "$@"
