#!/usr/bin/env sh

require_tool() {
  tool="$1"
  message="${2:-Missing required tool: $tool. Ensure devbox shell is active and required packages are installed.}"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "$message" >&2
    exit 1
  fi
}

load_platform_versions() {
  base_dir="$1"
  platform_versions="${base_dir%/}/../platform-versions.sh"
  if [ -f "$platform_versions" ]; then
    # shellcheck disable=SC1090
    . "$platform_versions"
  fi
}
