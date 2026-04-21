# Foundry Secrets

This directory holds secret files read by Docker Compose at runtime. All files listed here
are gitignored and must never be committed.

## Required: `config.json`

Create a file named `config.json` with your Foundry VTT account credentials and license key:

```json
{
  "foundry_username": "you@example.com",
  "foundry_password": "your-password",
  "foundry_license_key": "XXXX-XXXX-XXXX-XXXX"
}
```

Your username is the email address you use to log in to foundryvtt.com. Your license key is
found in your account page there.

Verify the file is gitignored before continuing:

```bash
git check-ignore -v docker/secrets/config.json
```

Expected: `docker/secrets/.gitignore:1:config.json  docker/secrets/config.json`

If it is not ignored, do not proceed — do not commit credentials.

## Notes

- The credentials are used only on first run to download Foundry from foundryvtt.com. Once
  downloaded and cached in `docker/data/`, they are not needed again unless you reset
  `docker/data/`.
- This file is mounted into the container as `/run/secrets/config.json` and read by the
  felddy/foundryvtt image's entrypoint.
