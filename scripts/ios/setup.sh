#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"
# shellcheck disable=SC1090
. "$script_dir/simctl.sh"
load_platform_versions "$script_dir"

# Creates local iOS simulators for common targets. Requires Xcode command-line tools and jq.
# Env overrides:
#   IOS_DEVICE_NAMES="iPhone 15,iPhone 17" (comma-separated)
#   IOS_RUNTIME="26.1" (preferred runtime prefix; falls back to latest available)
#   IOS_DOWNLOAD_RUNTIME=1 to attempt xcodebuild -downloadPlatform iOS when the preferred runtime is missing
#   IOS_DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer" to override the Xcode path; defaults to xcode-select -p or the standard Xcode.app if found

ensure_developer_dir() {
  local desired="${IOS_DEVELOPER_DIR:-}"
  if [[ -z $desired ]]; then
    if xcode-select -p >/dev/null 2>&1; then
      desired="$(xcode-select -p)"
    elif [[ -d /Applications/Xcode.app/Contents/Developer ]]; then
      desired="/Applications/Xcode.app/Contents/Developer"
    fi
  fi

  if [[ -n $desired && -d $desired ]]; then
    export DEVELOPER_DIR="$desired"
    export PATH="$DEVELOPER_DIR/usr/bin:$PATH"
    return 0
  fi

  echo "Xcode developer directory not found. Install Xcode/CLI tools or set IOS_DEVELOPER_DIR to an Xcode path (e.g., /Applications/Xcode.app/Contents/Developer)." >&2
  exit 1
}

ensure_developer_dir

require_tool xcrun "Missing required tool: xcrun. Install Xcode CLI tools before running (xcode-select --install or Xcode.app + xcode-select -s)."
require_tool jq

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

ensure_simctl

main() {
  ensure_core_sim_service || return 1
  IFS=',' read -r -a devices <<<"${IOS_DEVICE_NAMES:-${IOS_MIN_DEVICE:-${PLATFORM_IOS_MIN_DEVICE:-iPhone 13}},${IOS_MAX_DEVICE:-${PLATFORM_IOS_MAX_DEVICE:-iPhone 17}}}"
  local runtime="${IOS_RUNTIME:-${IOS_MIN_RUNTIME:-${PLATFORM_IOS_MIN_RUNTIME:-15.0}}}"
  for device in "${devices[@]}"; do
    ensure_device "$(echo "$device" | xargs)" "$runtime"
  done
  echo "Done. Launch via Xcode > Devices or 'xcrun simctl boot \"<name>\"' then 'open -a Simulator'."
}

main "$@"
