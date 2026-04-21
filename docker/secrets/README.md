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
