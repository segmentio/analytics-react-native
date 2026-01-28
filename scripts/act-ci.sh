#!/usr/bin/env bash
set -euo pipefail

# Run GitHub Actions workflows locally via act.
# Usage: scripts/act-ci.sh [--job JOB] [--platform ubuntu-latest=IMAGE]

JOB=""
PLATFORMS=()

host_arch="$(uname -m)"
if [[ "$host_arch" == "arm64" || "$host_arch" == "aarch64" ]]; then
  PLATFORMS+=("ubuntu-24.04-arm=ghcr.io/catthehacker/ubuntu:act-24.04")
else
  PLATFORMS+=("ubuntu-24.04=ghcr.io/catthehacker/ubuntu:act-24.04")
fi
PLATFORMS+=("ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-24.04")

while [[ $# -gt 0 ]]; do
  case "$1" in
  -j | --job)
    JOB="$2"
    shift 2
    ;;
  -p | --platform)
    PLATFORMS+=("$2")
    shift 2
    ;;
  *)
    echo "Unknown option: $1" >&2
    exit 1
    ;;
  esac
done

CMD=(act)
CMD+=(--pull=false)
for platform in "${PLATFORMS[@]}"; do
  CMD+=(--platform "$platform")
done
CMD+=(--input ACT=true)
if [[ -n $JOB ]]; then
  CMD+=(--job "$JOB")
fi

printf 'Running: %s\n' "${CMD[*]}"
exec "${CMD[@]}"
