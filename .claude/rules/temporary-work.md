# Temporary Work

All temp work → `.tmp/` at project root: logs, reports, builds, scratch.

## Why `.tmp/`

- Project-scoped (not system `/tmp/`)
- Gitignored — no commits
- Unrestricted permissions in settings
- Easy clean/audit

## Structure

Flat or simple subdirs:

```
.tmp/
├── build/      # Build artifacts
├── reports/    # Scan output
├── logs/       # Debug logs
└── scratch/    # Exploration
```

## Examples

```bash
# Logs
npm run test 2>&1 | tee .tmp/logs/test.log

# Reports
semgrep --json > .tmp/reports/scan.json

# Build
cargo build --target-dir .tmp/build

# Scratch
# .tmp/test.js: node .tmp/test.js
```

## Permanent Files

Move out of `.tmp/` if lasting value:
- Test reports → `test-results/`
- Analysis → `.claude/scan-reports/`
- Docs → `docs/`

## Cleanup

```bash
rm -rf .tmp/*          # All
rm -rf .tmp/logs/*     # Specific
```
