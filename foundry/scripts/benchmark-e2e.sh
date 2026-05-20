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
    # Parse via jq if available, else parse from log
    if command -v jq &> /dev/null; then
      # Playwright JSON structure: .suites[].specs[] contain tests; each spec has .tests[0].results[0] with duration
      # Use stats object for high-level counts
      PASSED=$(jq '.stats.expected // 0' "$REPORT_JSON" 2>/dev/null || echo "0")
      SKIPPED=$(jq '.stats.skipped // 0' "$REPORT_JSON" 2>/dev/null || echo "0")
      TOTAL_TESTS=$(jq '(.stats.expected // 0) + (.stats.skipped // 0)' "$REPORT_JSON" 2>/dev/null || echo "0")
      # Calculate total duration from all spec results
      DURATION=$(jq '
        [recurse | objects | select(.results?) | .results[] | .duration // 0] | add
      ' "$REPORT_JSON" 2>/dev/null | awk '{printf "%.1fs", $1 / 1000}')
      if [ -z "$DURATION" ] || [ "$DURATION" = "0.0s" ]; then
        DURATION="unknown"
      fi
    else
      # Fallback: parse log for test summary line
      PASSED=$(grep -o "[0-9]* passed" "$LOG_FILE" 2>/dev/null | grep -o "[0-9]*" || echo "0")
      SKIPPED=$(grep -o "[0-9]* skipped" "$LOG_FILE" 2>/dev/null | grep -o "[0-9]*" || echo "0")
      TOTAL_TESTS=$((PASSED + SKIPPED))
      DURATION=$(grep -o "([0-9.]*m)" "$LOG_FILE" 2>/dev/null | head -1 || echo "unknown")
      if [ "$TOTAL_TESTS" = "0" ]; then
        echo "⚠️  Warning: Could not extract test metrics from log. Install jq for reliable parsing."
      fi
    fi
  else
    # Playwright JSON not available; try log parsing as last resort
    PASSED=$(grep -o "[0-9]* passed" "$LOG_FILE" 2>/dev/null | grep -o "[0-9]*" || echo "0")
    SKIPPED=$(grep -o "[0-9]* skipped" "$LOG_FILE" 2>/dev/null | grep -o "[0-9]*" || echo "0")
    TOTAL_TESTS=$((PASSED + SKIPPED))
    DURATION="unknown"
    echo "⚠️  Warning: Playwright JSON report not found at $REPORT_JSON. Metric parsing is unreliable."
  fi

  cat > "$REPORT_PATH" << EOF
# E2E Test Benchmark Report

**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Test Summary

- **Total Tests:** $TOTAL_TESTS
- **Passed:** $PASSED
- **Skipped:** $SKIPPED
- **Total Duration:** $DURATION

## Analysis

### Per-Test Performance

Open the Playwright HTML report to view individual test durations:
\`\`\`bash
open foundry/playwright-report/index.html
\`\`\`

Sort tests by duration to identify bottlenecks. Expected ranges:
- **Fast** (< 8s): simple assertions, lightweight DOM queries
- **Typical** (8–12s): sheet interactions, form input, styling checks
- **Slow** (> 12s): tab transitions, multiple re-renders, complex selectors

### Fixture Overhead Analysis

Fixture setup (game launch + sheet render) runs once per worker at test start:
- Estimated cost: ~4–5s per worker
- With 2 workers in parallel: effective start cost is max(4–5s), not sum

Optimization impact:
- Reduce per-test time by 1s → ~20s saved (2 workers × 10 tests)
- Combine slow tests → fewer fixture iterations → net ~30s saved

### Common Bottlenecks

1. **Tab switching tests** — ApplicationV2 re-render overhead, check for animation delays
2. **Form field tests** — Multiple \`querySelector\` calls, batch assertions
3. **Styling/focus tests** — Repeated \`getComputedStyle\` calls, consider caching

### Validation

To verify metrics are accurate:
\`\`\`bash
# View raw JSON (structured test data)
jq '.stats' foundry/test-results/test-results.json

# Check test timeline for parallel efficiency
jq '.suites[].specs[] | {title, duration: .tests[0].results[0].duration}' foundry/test-results/test-results.json | jq -s 'sort_by(.duration) | reverse | .[0:5]'
\`\`\`

## Next Steps

1. Review slowest tests (> 12s) in HTML report
2. Profile fixture setup time in isolation
3. Consider test consolidation (combine related assertions)
4. Identify non-deterministic waits or race conditions
5. Document optimization opportunities

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
