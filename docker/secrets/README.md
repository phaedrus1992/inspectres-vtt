# Foundry Secrets

This directory holds secret files read by Docker Compose at runtime. All files listed here
are gitignored and must never be committed.

## Required files

### `foundry_username.txt`

Your Foundry VTT account username (email address):

```bash
echo -n "you@example.com" > docker/secrets/foundry_username.txt
```

### `foundry_password.txt`

Your Foundry VTT account password:

```bash
echo -n "your-password" > docker/secrets/foundry_password.txt
```

### `license_key.txt`

Your Foundry VTT license key (found in your account on foundryvtt.com):

```bash
echo -n "XXXX-XXXX-XXXX-XXXX" > docker/secrets/license_key.txt
```

## Rules

- One line per file, no trailing newline (the `-n` flag on `echo` handles this)
- Do not commit these files — they are gitignored
- Docker Compose reads them as secrets; values never appear in `docker inspect` output or
  shell history
- The username and password are used only on first run to download Foundry from foundryvtt.com.
  Once downloaded, they are not needed again unless you reset `docker/data/`.
