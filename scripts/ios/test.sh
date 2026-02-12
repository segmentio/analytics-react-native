#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"

if [ "$(uname -s)" = "Darwin" ]; then
  . "$SCRIPTS_DIR/ios/env.sh"
fi

echo "iOS test env"
echo "  PATH=$PATH"
echo "  CC=${CC:-}"
echo "  CXX=${CXX:-}"
echo "  SDKROOT=${SDKROOT:-}"
echo "  DEVELOPER_DIR=${DEVELOPER_DIR:-}"

bash "$SCRIPTS_DIR/ios/setup.sh"
yarn install
yarn e2e install
yarn e2e pods
yarn build
yarn e2e build:ios

# Start Metro bundler in background
echo "Starting Metro bundler..."
cd "$PROJECT_ROOT/examples/E2E"
yarn start > /tmp/metro-bundler.log 2>&1 &
METRO_PID=$!
echo "Metro bundler started (PID: $METRO_PID)"

# Wait for Metro to be ready
echo "Waiting for Metro bundler to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:8081/status | grep -q "packager-status:running"; then
    echo "Metro bundler is ready!"
    break
  fi
  sleep 1
done

# Run tests
cd "$PROJECT_ROOT"
yarn e2e test:ios

# Cleanup: kill Metro bundler
echo "Stopping Metro bundler..."
kill $METRO_PID 2>/dev/null || true
