# Running Foundry VTT with Docker

This repository includes Docker support for running Foundry VTT with the InSpectres system
pre-installed. It uses the community-standard
[felddy/foundryvtt](https://github.com/felddy/foundryvtt-docker) image.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2 (`docker compose version`)
- A [Foundry VTT](https://foundryvtt.com/) account with a license key
- The InSpectres system built locally — run this first:

  ```bash
  cd foundry
  npm install
  npm run prod
  cd ..
  ```

## Secrets Setup

The container needs your Foundry account credentials to download Foundry on first run, plus
your license key. These are passed as a single Docker secret file — values never appear in
environment variable listings or `docker inspect` output.

Create `docker/secrets/config.json`:

```json
{
  "foundry_username": "you@example.com",
  "foundry_password": "your-password",
  "foundry_license_key": "XXXX-XXXX-XXXX-XXXX"
}
```

Your username is the email address for your foundryvtt.com account. Your license key is on
your account page there.

Verify the file is gitignored before continuing:

```bash
git check-ignore -v docker/secrets/config.json
```

Expected: `docker/secrets/.gitignore:1:config.json  docker/secrets/config.json`

If it is not ignored, do not proceed — do not commit credentials.

> **Note:** The username and password are used only on first run to download Foundry from
> foundryvtt.com. Once the download is cached in `docker/data/`, they are not needed again
> unless you reset `docker/data/`.

## User ID Setup

The container runs as the UID/GID you specify so it can write to bind-mounted files in
`foundry/dist/packs/` (Foundry needs write access to open LevelDB compendium packs).

Copy the example file and fill in your values:

```bash
cp docker/.env.example docker/.env
```

Then edit `docker/.env`:

```bash
# Run `id -u` and `id -g` to get your values
FOUNDRY_UID=501
FOUNDRY_GID=20
```

To find your values:

```bash
id -u   # UID
id -g   # GID
```

The file is gitignored. Do not commit it.

## Starting Foundry

```bash
docker compose -f docker/docker-compose.yml up -d
```

Then open [http://localhost:30000](http://localhost:30000) in your browser.

On first run, the container downloads Foundry using your account credentials and applies the
license key automatically. This takes a minute or two — watch `docker compose logs -f` to
follow progress. Once you see `Server started`, the UI is ready.

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
