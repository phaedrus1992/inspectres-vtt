#!/usr/bin/env bash
# Run Playwright E2E tests against a fresh Foundry instance.
#
# Steps:
#   1. Stop any running Foundry container
#   2. Wipe the Foundry data directory (preserving Config/license.json)
#   3. Pre-extract Foundry binary from container_cache/ zip into foundry-data/
#      so the container skips auth+download on startup (no foundryvtt.com calls)
#   4. Build the latest dist/ (npm run build)
#   5. Start docker compose
#   6. Wait for Foundry to be reachable
#   7. Run Playwright tests (globalSetup creates the world + stores session)
#   8. Always shut down the container on exit, regardless of test outcome
#
# Designed to also work in CI: only env it needs is FOUNDRY_LICENSE / admin
# config provided via docker/secrets/config.json (already required for local).
#
# Usage:
#   scripts/run-e2e.sh                            # full run, fresh data
#   scripts/run-e2e.sh -- --grep "test name"      # filter by test name
#   scripts/run-e2e.sh -- agent-sheet.test.ts     # run one file
#   scripts/run-e2e.sh -- agent-sheet franchise   # run multiple files (substring match)
#   KEEP_DATA=1 scripts/run-e2e.sh                # skip data wipe (faster iteration)
#   KEEP_RUNNING=1 scripts/run-e2e.sh             # leave container running on exit
#   KEEP_CONTAINER=1 scripts/run-e2e.sh           # skip container restart (implies KEEP_DATA)

set -euo pipefail

cd "$(dirname "$0")/.."
FOUNDRY_DIR="$(pwd)"
REPO_ROOT="$(cd .. && pwd)"
DOCKER_DIR="${REPO_ROOT}/docker"
DATA_DIR="${DOCKER_DIR}/data"
FOUNDRY_INSTALL_DIR="${DOCKER_DIR}/foundry-data"
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

if [[ "${KEEP_CONTAINER:-0}" == "1" ]]; then
  log "KEEP_CONTAINER=1 — skipping container restart and data wipe"
else
  log "stopping any running Foundry container"
  (cd "$DOCKER_DIR" && docker compose down --remove-orphans) >/dev/null 2>&1 || true

  # Foundry holds an exclusive lock while running; if a previous run was killed
  # uncleanly the lock remains and prevents the next container from starting.
  rm -f "${DATA_DIR}/Config/options.json.lock"
fi

if [[ "${KEEP_CONTAINER:-0}" != "1" && "${KEEP_DATA:-0}" != "1" ]]; then
  log "wiping Foundry data (preserving Config/license.json, container_cache/, foundry-data/)"
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
elif [[ "${KEEP_CONTAINER:-0}" != "1" ]]; then
  log "KEEP_DATA=1 — skipping data wipe"
fi

# Pre-extract the Foundry binary from the cached zip so the container skips
# auth + download on startup. The felddy/foundryvtt entrypoint checks for
# resources/app/package.json (mapped to foundry-data/app/package.json via the
# volume mount) and skips installation if it already exists and the version matches.
#
# We extract the zip here instead of inside the container because macOS Docker
# Desktop bind mounts cause unzip to fail on setattr/utimes calls, making the
# entrypoint treat a successful extraction as fatal.
CACHE_DIR="${DATA_DIR}/container_cache"
INSTALL_PKG="${FOUNDRY_INSTALL_DIR}/app/package.json"
CACHED_ZIP=""
for zip_file in "${CACHE_DIR}"/foundryvtt-*.zip; do
  [[ -f "$zip_file" ]] && CACHED_ZIP="$zip_file" && break
done
if [[ -n "$CACHED_ZIP" ]]; then
  # Determine the version baked into the cached zip.
  CACHED_VERSION="$(unzip -p "${CACHED_ZIP}" package.json 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('release',{}).get('build',''))" \
    2>/dev/null)" || CACHED_VERSION=""
  INSTALLED_VERSION=""
  if [[ -f "$INSTALL_PKG" ]]; then
    INSTALLED_VERSION="$(python3 -c "import json; d=json.load(open('${INSTALL_PKG}')); print(d.get('release',{}).get('build',''))" 2>/dev/null)" || INSTALLED_VERSION=""
  fi
  if [[ -n "$CACHED_VERSION" && "$CACHED_VERSION" == "$INSTALLED_VERSION" ]]; then
    log "Foundry ${CACHED_VERSION} already extracted in foundry-data/ — skipping"
  else
    log "pre-extracting Foundry from $(basename "${CACHED_ZIP}") into foundry-data/"
    rm -rf "${FOUNDRY_INSTALL_DIR:?}/app"
    mkdir -p "${FOUNDRY_INSTALL_DIR}/app"
    # The zip contains flat files (no resources/app/ prefix); extract into app/
    # Ignore exit code — macOS unzip always exits non-zero due to setattr warnings
    unzip -q "${CACHED_ZIP}" -d "${FOUNDRY_INSTALL_DIR}/app" 2>/dev/null || true
    if [[ ! -f "$INSTALL_PKG" ]]; then
      log "WARNING: pre-extraction failed (no package.json found) — container will download"
    else
      log "pre-extraction complete ($(basename "${CACHED_ZIP}"))"
    fi
  fi
else
  log "no cached zip found in container_cache/ — container will download on first run"
fi

log "building system dist/"
npm run build

if [[ "${KEEP_CONTAINER:-0}" != "1" ]]; then
  log "starting docker compose"
  (cd "$DOCKER_DIR" && docker compose up -d)

  log "waiting for Foundry at ${URL}"
  for i in $(seq 1 120); do
    if curl -sf -o /dev/null "$URL"; then
      log "Foundry is up (after ${i}s)"
      break
    fi
    if [[ "$i" == "120" ]]; then
      log "ERROR: Foundry did not start within 120s"
      (cd "$DOCKER_DIR" && docker compose logs --tail=80 foundry) || true
      exit 1
    fi
    sleep 1
  done
else
  log "KEEP_CONTAINER=1 — using running container at ${URL}"
  curl -sf -o /dev/null "$URL" || { log "ERROR: KEEP_CONTAINER=1 but Foundry is not reachable at ${URL}"; exit 1; }
fi

# Clear stale Playwright storage state so global-setup re-runs from scratch.
rm -f "${FOUNDRY_DIR}/.tmp/playwright-storage-state.json"

log "running Playwright tests"
# Forward all args after `--` to playwright
ARGS=()
if [[ "${1:-}" == "--" ]]; then shift; ARGS=("$@"); fi
npx playwright test "${ARGS[@]}"
