# Docker + Foundry VTT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Docker support for running Foundry VTT with the InSpectres system pre-installed, supporting both local development and self-hosted play.

**Architecture:** A `docker/` directory at the repo root contains a `docker-compose.yml` using `ghcr.io/felddy/foundryvtt:release`. The InSpectres system is installed via a read-only bind-mount of `foundry/dist/` into the container's systems path. The Foundry license key is passed as a Docker secret from a gitignored file. A `docker-compose.override.yml.example` documents the dev hot-reload workflow.

**Tech Stack:** Docker Compose v2, `ghcr.io/felddy/foundryvtt:release` (felddy/foundryvtt-docker), Docker secrets, Vite (for `npm run dev` watch mode in dev workflow)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `docker/docker-compose.yml` | Create | Primary compose file: Foundry service, secrets, volumes |
| `docker/docker-compose.override.yml.example` | Create | Dev hot-reload example (copy to activate) |
| `docker/data/.gitkeep` | Create | Ensures data bind-mount directory exists in repo |
| `docker/secrets/.gitignore` | Create | Gitignores `license_key.txt` |
| `docker/secrets/README.md` | Create | Instructions for creating the secret file |
| `.gitignore` (root) | Modify | Ignore `docker/docker-compose.override.yml` |
| `docs/docker.md` | Create | Full setup and usage documentation |
| `README.md` | Modify | Add Docker section linking to docs/docker.md |

---

## Task 1: Scaffold the `docker/` directory structure

**Files:**
- Create: `docker/data/.gitkeep`
- Create: `docker/secrets/.gitignore`
- Create: `docker/secrets/README.md`
- Modify: `.gitignore` (root)

- [ ] **Step 1: Create `docker/data/.gitkeep`**

```bash
mkdir -p docker/data docker/secrets
touch docker/data/.gitkeep
```

- [ ] **Step 2: Create `docker/secrets/.gitignore`**

Contents of `docker/secrets/.gitignore`:
```
license_key.txt
```

- [ ] **Step 3: Create `docker/secrets/README.md`**

Contents of `docker/secrets/README.md`:
```markdown
# Foundry License Key Secret

Create a file named `license_key.txt` in this directory containing your Foundry VTT license key:

```
XXXX-XXXX-XXXX-XXXX
```

Rules:
- One line, no trailing newline
- Do not commit this file — it is gitignored
- Docker Compose reads it as a secret and passes it to the container at runtime
- Never set the license key as a plain environment variable; Docker secrets keep it out of
  `docker inspect` output and shell history
```

- [ ] **Step 4: Add override file to root `.gitignore`**

Open `.gitignore` at the repo root. If it doesn't exist, create it. Add:
```
docker/docker-compose.override.yml
```

- [ ] **Step 5: Verify directory structure**

```bash
find docker/ -not -path "*/node_modules/*"
```

Expected output:
```
docker/
docker/data
docker/data/.gitkeep
docker/secrets
docker/secrets/.gitignore
docker/secrets/README.md
```

- [ ] **Step 6: Commit**

```bash
git add docker/ .gitignore
git commit -m "Add docker/ scaffold: data dir, secrets gitignore and README"
```

---

## Task 2: Write `docker-compose.yml`

**Files:**
- Create: `docker/docker-compose.yml`

- [ ] **Step 1: Create `docker/docker-compose.yml`**

```yaml
secrets:
  license_key:
    file: ./secrets/license_key.txt

services:
  foundry:
    image: ghcr.io/felddy/foundryvtt:release
    hostname: foundry
    ports:
      - "30000:30000"
    secrets:
      - license_key
    environment:
      FOUNDRY_LICENSE_KEY: "DOCKER-SECRET:license_key"
      FOUNDRY_HOSTNAME: foundry
      CONTAINER_PRESERVE_CONFIG: "true"
    volumes:
      - ./data:/data
      - ../foundry/dist:/data/Data/systems/inspectres:ro
```

**Why each setting:**
- `hostname: foundry` — Foundry binds its license to the container hostname. Without a fixed
  hostname, Docker assigns a random container ID on each restart, causing license verification
  to fail every time.
- `FOUNDRY_LICENSE_KEY: "DOCKER-SECRET:license_key"` — The `felddy/foundryvtt` image supports
  this special syntax to read a Docker secret by name. The value is never exposed in environment
  variable listings.
- `CONTAINER_PRESERVE_CONFIG: "true"` — Tells the felddy image not to reset Foundry's
  `options.json` on each restart.
- `./data:/data` — Persists worlds, assets, and Foundry config on the host for easy backup.
- `../foundry/dist:/data/Data/systems/inspectres:ro` — Installs the InSpectres system into
  Foundry's systems directory. Read-only in production.

- [ ] **Step 2: Validate the compose file parses correctly**

```bash
docker compose -f docker/docker-compose.yml config
```

Expected: YAML output with the service definition (no errors). If Docker complains about the
missing secret file, that's expected — it only matters at runtime.

- [ ] **Step 3: Commit**

```bash
git add docker/docker-compose.yml
git commit -m "Add docker-compose.yml for Foundry VTT with InSpectres system"
```

---

## Task 3: Write `docker-compose.override.yml.example`

**Files:**
- Create: `docker/docker-compose.override.yml.example`

- [ ] **Step 1: Create `docker/docker-compose.override.yml.example`**

```yaml
# Dev hot-reload override
#
# To use:
#   1. Copy this file to docker-compose.override.yml (gitignored)
#   2. In one terminal: cd foundry && npm run dev
#   3. In another terminal: docker compose -f docker/docker-compose.yml up
#
# Vite rebuilds on save. The bind-mount (without :ro) means changes appear
# in Foundry on browser reload without restarting the container.
#
# Do NOT run this alongside a separate production container — Foundry licenses
# are single-instance and will conflict.

services:
  foundry:
    volumes:
      - ../foundry/dist:/data/Data/systems/inspectres
```

- [ ] **Step 2: Verify the example file is not gitignored itself**

```bash
git check-ignore -v docker/docker-compose.override.yml.example
```

Expected: no output (the file is not ignored — it should be committed).

- [ ] **Step 3: Commit**

```bash
git add docker/docker-compose.override.yml.example
git commit -m "Add docker-compose.override.yml.example for dev hot-reload workflow"
```

---

## Task 4: Write `docs/docker.md`

**Files:**
- Create: `docs/docker.md`

- [ ] **Step 1: Create `docs/docker.md`**

```markdown
# Running Foundry VTT with Docker

This repository includes Docker support for running Foundry VTT with the InSpectres system
pre-installed. It uses the community-standard
[felddy/foundryvtt](https://github.com/felddy/foundryvtt-docker) image.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2 (`docker compose version`)
- A [Foundry VTT](https://foundryvtt.com/) license key
- The InSpectres system built locally — run this first:

  ```bash
  cd foundry
  npm install
  npm run prod
  cd ..
  ```

## License Key Setup

Foundry requires a license key to run. Pass it via Docker secret so it never appears in
environment variable listings or shell history.

1. Create the secret file:

   ```bash
   echo -n "YOUR-LICENSE-KEY-HERE" > docker/secrets/license_key.txt
   ```

   Replace `YOUR-LICENSE-KEY-HERE` with your actual license key. The `-n` flag omits the
   trailing newline.

2. Verify the file is gitignored:

   ```bash
   git check-ignore -v docker/secrets/license_key.txt
   ```

   Expected output: `docker/secrets/.gitignore:1:license_key.txt  docker/secrets/license_key.txt`

   If it's not ignored, do not proceed — do not commit your license key.

## Starting Foundry

```bash
docker compose -f docker/docker-compose.yml up -d
```

Then open [http://localhost:30000](http://localhost:30000) in your browser.

On first run, Foundry will prompt you to enter the license key. Enter it once through the UI —
it is then stored in `docker/data/` and reused on subsequent starts.

## Stopping Foundry

```bash
docker compose -f docker/docker-compose.yml down
```

World data, assets, and config persist in `docker/data/` between restarts.

## Updating the InSpectres System

After making changes to the system:

1. Rebuild the system:

   ```bash
   cd foundry && npm run prod && cd ..
   ```

2. Restart the container:

   ```bash
   docker compose -f docker/docker-compose.yml restart
   ```

The bind-mount picks up the new build automatically on restart.

## Dev Workflow (Hot Reload)

For active system development, use the override file to enable live reloading:

1. Copy the override example:

   ```bash
   cp docker/docker-compose.override.yml.example docker/docker-compose.override.yml
   ```

2. In one terminal, start Vite in watch mode:

   ```bash
   cd foundry && npm run dev
   ```

3. In another terminal, start the container:

   ```bash
   docker compose -f docker/docker-compose.yml up
   ```

Vite rebuilds the system on every file save. The bind-mount (without `:ro`) means the updated
files are immediately visible in the container. Reload the browser tab in Foundry to pick up
JavaScript/CSS changes; for template changes you may need to restart the container.

> **Note:** Do not run a dev container and a separate production container simultaneously.
> Foundry licenses are single-instance — running two at once will cause one to fail license
> verification.

## What Persists in `docker/data/`

Everything under `docker/data/` persists across container restarts:

| Path | Contents |
|------|----------|
| `docker/data/Config/` | Foundry server config (`options.json`) |
| `docker/data/Data/worlds/` | Campaign worlds and all scene/actor/item data |
| `docker/data/Data/assets/` | Uploaded images, audio, and other media |
| `docker/data/Data/systems/` | Installed game systems (other than InSpectres, which is bind-mounted) |

Back up `docker/data/` regularly, especially before updating Foundry.

## Self-Hosting Notes

To expose Foundry on the internet (for remote players):

- **Fixed hostname:** The compose file sets `hostname: foundry` — required for license
  stability. Do not remove it.
- **Reverse proxy:** Put nginx or Caddy in front of Foundry. Foundry should not be exposed
  directly on port 80/443. See the
  [Foundry community wiki — Reverse Proxy](https://foundryvtt.wiki/en/setup/hosting/Reverse-Proxy)
  for configuration examples.
- **SSL:** Required for WebRTC (voice/video) features. Caddy handles SSL automatically via
  Let's Encrypt.
- **Port:** The default is 30000. Change the left side of `"30000:30000"` in
  `docker-compose.yml` to use a different host port.
- **Full hosting guide:** See the
  [Foundry community wiki — Docker](https://foundryvtt.wiki/en/setup/hosting/Docker) for
  additional options including environment variables, update strategies, and health checks.
```

- [ ] **Step 2: Verify the file was written correctly**

```bash
wc -l docs/docker.md
```

Expected: 120+ lines (the full document).

- [ ] **Step 3: Commit**

```bash
git add docs/docker.md
git commit -m "Add docs/docker.md: full Docker setup and usage guide"
```

---

## Task 5: Update `README.md` with Docker section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the current README**

```bash
cat README.md
```

- [ ] **Step 2: Add a Docker section**

Add the following after the existing content (before any trailing sections, or at the end):

```markdown
# Running with Docker

Foundry VTT can be run locally or self-hosted using Docker. The InSpectres system is
pre-installed automatically.

See [docs/docker.md](docs/docker.md) for full setup instructions including license key
configuration, dev workflow, and self-hosting notes.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Add Docker section to README"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `docker/docker-compose.yml` with felddy image | Task 2 |
| Fixed hostname | Task 2 |
| Docker secret for license key | Task 1 (secrets dir) + Task 2 (compose) |
| Bind-mount `foundry/dist/` → `/data/Data/systems/inspectres` | Task 2 |
| Bind-mount `./data` for world data | Task 2 |
| `docker-compose.override.yml.example` for dev hot-reload | Task 3 |
| `docker/data/.gitkeep` | Task 1 |
| `docker/secrets/.gitignore` | Task 1 |
| `docker/secrets/README.md` | Task 1 |
| Root `.gitignore` ignores override file | Task 1 |
| `docs/docker.md` with all 8 sections | Task 4 |
| `README.md` Docker section | Task 5 |

All spec requirements are covered. No placeholders. No TBDs.
