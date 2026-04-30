#!/bin/bash
# E2E Test Benchmark Script
#
# Profiles E2E test execution locally without CI changes.
# Requires docker compose to be running and npm dev server.
#
# Usage:
#   ./foundry/scripts/benchmark-e2e.sh
#
# Output:
#   .tmp/e2e-benchmark-report.md
#   .tmp/e2e-benchmark-report.json

set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/../../" && pwd)
FOUNDRY_DIR="$REPO_ROOT/foundry"
TMP_DIR="$REPO_ROOT/.tmp"

mkdir -p "$TMP_DIR"

echo "=========================================="
echo "E2E Benchmark — Local Profile Run"
echo "=========================================="
echo ""

# Check prerequisites
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Install Docker to run E2E tests."
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm not found."
  exit 1
fi

# Ensure docker compose is running and ready
echo "📦 Checking Foundry container..."
if ! docker compose -f "$REPO_ROOT/docker/docker-compose.ci.yml" ps foundry &>/dev/null; then
  echo "⚠️  Foundry container not running. Start with:"
  echo "   cd docker && docker compose -f docker-compose.ci.yml up -d"
  echo "   Then run this script again."
  exit 1
fi

# Verify container is actually listening on port 30000 (not just running)
echo "📡 Waiting for Foundry to be ready..."
MAX_RETRIES=120
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if nc -z localhost 30000 2>/dev/null; then
    echo "✓ Foundry ready on http://localhost:30000"
    break
  fi
  RETRY=$((RETRY + 1))
  if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "❌ Foundry did not become ready after $((MAX_RETRIES / 2))s. Container may be crashing."
    echo "   Check container logs: docker compose -f docker/docker-compose.ci.yml logs foundry"
    exit 1
  fi
  sleep 0.5
done

echo ""

# Run E2E tests and capture output
echo "⏱️  Running E2E tests (may take 5-10 minutes)..."
LOG_FILE="$TMP_DIR/e2e-output.log"

cd "$FOUNDRY_DIR"

if npm run test:e2e 2>&1 | tee "$LOG_FILE"; then
  RESULT="✓ All tests passed"
else
  RESULT="⚠️  Some tests failed or were skipped"
fi

echo ""
echo "=========================================="
echo "Results"
echo "=========================================="
echo "$RESULT"
echo ""

# Parse log and generate report
REPORT_PATH="$TMP_DIR/e2e-benchmark-report.md"
if [ -f "$LOG_FILE" ]; then
  echo "📊 Generating benchmark report..."

  # Extract test metrics from Playwright JSON report for reliability
  # Playwright writes structured data to .json; grep is fragile and error-prone
  REPORT_JSON="$FOUNDRY_DIR/test-results/test-results.json"
  if [ -f "$REPORT_JSON" ]; then
    # Parse via jq if available, else parse manually
    if command -v jq &> /dev/null; then
      # Playwright JSON: { "tests": [ { "title": "...", "status": "passed|failed|skipped", ... } ], "startTime": 123, "endTime": 456 }
      TOTAL_TESTS=$(jq '.tests | length' "$REPORT_JSON" 2>/dev/null || echo "0")
      PASSED=$(jq '[.tests[] | select(.status=="passed")] | length' "$REPORT_JSON" 2>/dev/null || echo "0")
      FAILED=$(jq '[.tests[] | select(.status=="failed")] | length' "$REPORT_JSON" 2>/dev/null || echo "0")
      DURATION=$(jq '(.endTime - .startTime) as $ms | ($ms / 1000) | "\(.)s"' "$REPORT_JSON" 2>/dev/null || echo "unknown")
    else
      # Fallback: parse log but validate before using
      TOTAL_TESTS=$(grep -c "✓\|✕" "$LOG_FILE" 2>/dev/null || echo "0")
      PASSED=$(grep -c "✓" "$LOG_FILE" 2>/dev/null || echo "0")
      FAILED=$(grep -c "✕" "$LOG_FILE" 2>/dev/null || echo "0")
      DURATION=$(grep "Tests:" "$LOG_FILE" 2>/dev/null | grep -o "[0-9.]*ms" | head -1 || echo "unknown")
      if [ "$TOTAL_TESTS" = "0" ]; then
        echo "⚠️  Warning: Could not extract test metrics from log. Install jq for reliable parsing."
      fi
    fi
  else
    # Playwright JSON not available; try log parsing as last resort
    TOTAL_TESTS=$(grep -c "✓\|✕" "$LOG_FILE" 2>/dev/null || echo "0")
    PASSED=$(grep -c "✓" "$LOG_FILE" 2>/dev/null || echo "0")
    FAILED=$(grep -c "✕" "$LOG_FILE" 2>/dev/null || echo "0")
    DURATION="unknown"
    echo "⚠️  Warning: Playwright JSON report not found at $REPORT_JSON. Metric parsing is unreliable."
  fi

  cat > "$REPORT_PATH" << EOF
# E2E Test Benchmark Report

**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Test Summary

- **Total Tests:** $TOTAL_TESTS
- **Passed:** $PASSED
- **Failed:** $FAILED
- **Total Duration:** $DURATION

## Findings

Run \`npm run test:e2e\` and analyze:

1. **Per-test breakdown** from Playwright HTML report:
   - Open \`foundry/playwright-report/index.html\` in browser
   - Sort by duration to identify slowest tests
   - Check test timeline for parallel execution efficiency

2. **Timeout patterns**:
   - Search \`$LOG_FILE\` for "timeout" or "failed" to find flaky tests
   - Example: buttons.test.ts line 89 fails on retry 2 (issue #475)

3. **Fixture overhead**:
   - Game launch + sheet render takes ~60s per worker
   - Check if tests can be batched to reduce fixture setup iterations

## Next Steps

1. Profile fixture setup time separately
2. Identify non-deterministic waits or race conditions
3. Document which tests can be parallelized
4. Propose optimization strategy

---

Report generated by \`./foundry/scripts/benchmark-e2e.sh\`
EOF

  echo "✓ Report written to $REPORT_PATH"
  echo ""
  cat "$REPORT_PATH"
else
  echo "❌ E2E test log not found"
  exit 1
fi

echo ""
echo "💡 To view detailed test artifacts:"
echo "   - Playwright HTML report: foundry/playwright-report/index.html"
echo "   - Screenshots on failure: foundry/test-results/"
