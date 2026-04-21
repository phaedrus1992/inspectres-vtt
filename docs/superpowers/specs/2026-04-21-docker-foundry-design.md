# Docker + Foundry VTT Design

**Date:** 2026-04-21
**Status:** Approved

## Goal

Run Foundry VTT in Docker with the InSpectres system pre-installed, supporting both local
development and self-hosted play. The Foundry license key is passed via Docker secret.

## Approach

Single `docker-compose.yml` using the community-standard `felddy/foundryvtt` image. The
InSpectres system is installed by bind-mounting the pre-built `foundry/dist/` directory into
the container's systems path. World data persists in a host bind-mount. A committed
`docker-compose.override.yml.example` documents the dev hot-reload pattern without activating it
by default.

This matches established Foundry community practice: game systems are built locally and mounted
into the container; they are not built inside Docker.

## Repository Structure

```
docker/
  docker-compose.yml                    # primary compose file
  docker-compose.override.yml.example  # dev hot-reload example (copy to activate)
  secrets/
    .gitignore                          # ignores license_key.txt
    README.md                           # instructions for creating the secret
docs/
  docker.md                             # full setup and usage documentation
```

## docker-compose.yml

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

Key decisions:
- `hostname: foundry` — fixed hostname prevents license invalidation on container restart
- `CONTAINER_PRESERVE_CONFIG: "true"` — Foundry config survives restarts
- System mount is read-only (`:ro`) in production; the override example removes this for dev
- `./data` bind-mount keeps world data, assets, and config on the host for easy backup

## docker-compose.override.yml.example

```yaml
services:
  foundry:
    volumes:
      - ../foundry/dist:/data/Data/systems/inspectres  # writable for dev (no :ro)
```

To use: copy to `docker-compose.override.yml` (gitignored) and run `npm run dev` in `foundry/`
alongside `docker compose up`. Vite watch rebuilds on save; the bind-mount makes changes
visible on browser reload without restarting the container.

## secrets/README.md

Explains:
- Create `license_key.txt` with your Foundry license key as a single line (no trailing newline)
- The file is gitignored and must never be committed
- Docker Compose reads it as a secret and passes it to the container at runtime

## Documentation (docs/docker.md)

Sections:

1. **Prerequisites** — Docker, Docker Compose v2, and a built system (`npm run prod` in `foundry/`)
2. **License key setup** — create `docker/secrets/license_key.txt`; why a secret file, not env var
3. **Data directory** — create `docker/data/` before first run (`mkdir -p docker/data`); Docker bind-mounts require the host path to exist; explanation of what persists there
4. **Starting Foundry** — `docker compose -f docker/docker-compose.yml up -d`; open `http://localhost:30000`
5. **Stopping** — `docker compose -f docker/docker-compose.yml down`
6. **Updating the system** — `npm run prod` in `foundry/`, then restart; bind-mount picks up changes
7. **Dev workflow** — copy override example, run `npm run dev` + `docker compose up` in parallel
8. **Self-hosting notes** — fixed hostname requirement, reverse proxy (nginx/Caddy), SSL; link to Foundry community wiki Docker page

## Constraints and Notes

- **One instance at a time**: Foundry licenses are single-instance. Do not run dev and prod
  containers simultaneously with the same license.
- **Build before starting**: The `foundry/dist/` directory must exist before `docker compose up`.
  Run `npm run prod` in `foundry/` first.
- **Hostname stability**: The `hostname: foundry` setting in compose is required. A random
  container ID hostname causes license verification to fail on every restart.
- **No custom Dockerfile**: The `felddy/foundryvtt` image handles Foundry installation. A
  custom image would add complexity with no benefit for this use case.
