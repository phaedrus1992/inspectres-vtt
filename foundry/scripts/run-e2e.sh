#!/usr/bin/env bash
# Run Playwright E2E tests against a fresh Foundry instance.
#
# Steps:
#   1. Stop any running Foundry container
#   2. Wipe the Foundry data directory (preserving Config/license.json)
#   3. Build the latest dist/ (npm run build)
#   4. Start docker compose
#   5. Wait for Foundry to be reachable
#   6. Run Playwright tests (globalSetup creates the world + stores session)
#   7. Always shut down the container on exit, regardless of test outcome
#
# Designed to also work in CI: only env it needs is FOUNDRY_LICENSE / admin
# config provided via docker/secrets/config.json (already required for local).
#
# Usage:
#   scripts/run-e2e.sh                 # full run, fresh data
#   scripts/run-e2e.sh -- --grep foo   # forward args to playwright
#   KEEP_DATA=1 scripts/run-e2e.sh     # skip data wipe (faster local iteration)
#   KEEP_RUNNING=1 scripts/run-e2e.sh  # leave container running on exit (debug)

set -euo pipefail

cd "$(dirname "$0")/.."
FOUNDRY_DIR="$(pwd)"
REPO_ROOT="$(cd .. && pwd)"
DOCKER_DIR="${REPO_ROOT}/docker"
DATA_DIR="${DOCKER_DIR}/data"
URL="http://localhost:30000"

log() { echo "[run-e2e] $*"; }

cleanup() {
  if [[ "${KEEP_RUNNING:-0}" == "1" ]]; then
    log "KEEP_RUNNING=1 — leaving container up"
    return
  fi
  log "stopping docker compose"
  (cd "$DOCKER_DIR" && docker compose down --remove-orphans) >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "stopping any running Foundry container"
(cd "$DOCKER_DIR" && docker compose down --remove-orphans) >/dev/null 2>&1 || true

# Foundry holds an exclusive lock while running; if a previous run was killed
# uncleanly the lock remains and prevents the next container from starting.
rm -rf "${DATA_DIR}/Config/options.json.lock"

if [[ "${KEEP_DATA:-0}" != "1" ]]; then
  log "wiping Foundry data (preserving Config/license.json)"
  if [[ -f "${DATA_DIR}/Config/license.json" ]]; then
    LICENSE_BACKUP="$(mktemp)"
    cp "${DATA_DIR}/Config/license.json" "$LICENSE_BACKUP"
  else
    LICENSE_BACKUP=""
  fi
  rm -rf "${DATA_DIR:?}/Data" "${DATA_DIR}/Logs" "${DATA_DIR}/Config/options.json" "${DATA_DIR}/Config/options.json.lock"
  if [[ -n "$LICENSE_BACKUP" ]]; then
    mkdir -p "${DATA_DIR}/Config"
    cp "$LICENSE_BACKUP" "${DATA_DIR}/Config/license.json"
    rm -f "$LICENSE_BACKUP"
  fi
else
  log "KEEP_DATA=1 — skipping data wipe"
fi

log "building system dist/"
npm run build

log "starting docker compose"
(cd "$DOCKER_DIR" && docker compose up -d)

log "waiting for Foundry at ${URL}"
for i in $(seq 1 60); do
  if curl -sf -o /dev/null "$URL"; then
    log "Foundry is up (after ${i}s)"
    break
  fi
  if [[ "$i" == "60" ]]; then
    log "ERROR: Foundry did not start within 60s"
    (cd "$DOCKER_DIR" && docker compose logs --tail=80 foundry) || true
    exit 1
  fi
  sleep 1
done

# Clear stale Playwright storage state so global-setup re-runs from scratch.
rm -f "${FOUNDRY_DIR}/.tmp/playwright-storage-state.json"

log "running Playwright tests"
# Forward all args after `--` to playwright
ARGS=()
if [[ "${1:-}" == "--" ]]; then shift; ARGS=("$@"); fi
npx playwright test "${ARGS[@]}"
