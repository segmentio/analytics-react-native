#!/usr/bin/env bash
set -euo pipefail

# Run GitHub Actions workflows locally via act.
# Usage: scripts/act-ci.sh [--job JOB] [--platform ubuntu-latest=node:20-bullseye]

JOB=""
PLATFORM="ubuntu-latest=node:20-bullseye"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -j|--job)
      JOB="$2"; shift 2 ;;
    -p|--platform)
      PLATFORM="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

CMD=(act)
CMD+=(--pull=false)
CMD+=(--platform "${PLATFORM}")
if [[ -n "$JOB" ]]; then
  CMD+=(--job "$JOB")
fi

printf 'Running: %s\n' "${CMD[*]}"
exec "${CMD[@]}"
