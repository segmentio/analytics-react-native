#!/usr/bin/env bash
set -euo pipefail

project_root="${PROJECT_ROOT:-}"
if [[ -z "$project_root" ]]; then
  project_root="$(cd "$(dirname "$0")/.." && pwd)"
fi

bash "$project_root/flox/scripts/android/stop.sh"
bash "$project_root/flox/scripts/ios/stop.sh"
