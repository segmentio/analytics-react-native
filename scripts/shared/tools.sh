#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/shared/tools.sh must be sourced." >&2
  exit 1
fi

require_tool() {
  tool="$1"
  message="${2:-Missing required tool: $tool. Ensure devbox shell is active and required packages are installed.}"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "$message" >&2
    exit 1
  fi
}
