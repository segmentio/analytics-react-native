#!/bin/bash
#
# Run E2E tests for analytics-react-native
#
# Prerequisites: Node.js 18+
#
# Usage:
#   ./run-e2e.sh [extra args passed to run-tests.sh]
#
# Override sdk-e2e-tests location:
#   E2E_TESTS_DIR=../my-e2e-tests ./run-e2e.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_ROOT="$SCRIPT_DIR/.."
E2E_DIR="${E2E_TESTS_DIR:-$SDK_ROOT/../sdk-e2e-tests}"

echo "=== Building analytics-react-native e2e-cli ==="

# Build e2e-cli
cd "$SCRIPT_DIR"
npm install
npm run build

echo ""

# Run tests
cd "$E2E_DIR"
./scripts/run-tests.sh \
    --sdk-dir "$SCRIPT_DIR" \
    --cli "node $SCRIPT_DIR/dist/cli.js" \
    "$@"
