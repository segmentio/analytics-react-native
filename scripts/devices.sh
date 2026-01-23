#!/usr/bin/env bash
set -euo pipefail

action="${1:-start}"
target="${2:-all}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="${PROJECT_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$project_root"

start_android() { bash "${script_dir}/android.sh" start; }
stop_android() { bash "${script_dir}/android.sh" stop; }
reset_android() { bash "${script_dir}/android.sh" reset; }
setup_android() { bash "${script_dir}/android.sh" prepare; }

start_ios() { bash "${script_dir}/ios.sh" start; }
stop_ios() { bash "${script_dir}/ios.sh" stop; }
reset_ios() { bash "${script_dir}/ios.sh" reset; }
setup_ios() { bash "${script_dir}/ios.sh" prepare; }
setup_all() { setup_android; setup_ios; }

case "$action:$target" in
  start:android) start_android ;;
  start:ios) start_ios ;;
  start:all) start_android; start_ios ;;
  stop:android) stop_android ;;
  stop:ios) stop_ios ;;
  stop:all) stop_android; stop_ios ;;
  reset:android) reset_android ;;
  reset:ios) reset_ios ;;
  reset:all) reset_android; reset_ios ;;
  setup:android) setup_android ;;
  setup:ios) setup_ios ;;
  setup:all) setup_all ;;
  *)
    cat >&2 <<'EOF'
Usage: bash scripts/devices.sh [start|stop|reset|setup] [all|android|ios]
Starts/stops/resets/sets up the local Android emulator and iOS simulator using the helper scripts.
EOF
    exit 1
    ;;
esac

echo "$action ($target) complete."
