# Typos Spell Check

This project uses [typos-cli](https://github.com/crate-ci/typos) to catch spelling errors in code, comments, docs, and configuration.

## Running typos locally

```bash
# Basic check
typos --config .typos.toml

# Check with excluded directories (recommended)
typos \
  --config .typos.toml \
  --exclude "*semgrep-results*" \
  --exclude "*node_modules*" \
  --exclude "*dist*" \
  --exclude "*packs-compiled*"

# Fix errors automatically (use with caution, review changes)
typos --config .typos.toml --write
```

## Installing typos

```bash
# macOS (via Homebrew)
brew install typos-cli

# Other platforms: https://github.com/crate-ci/typos#install
```

## Pre-push hook setup

Typos is automatically run in GitHub Actions CI on every PR. To enable local pre-push checks:

```bash
# Install prek (Rust-based pre-commit alternative)
cargo install prek

# Initialize prek in the repo
prek install

# Add typos to your pre-push hook configuration
```

Or manually add to `.git/hooks/pre-push` (but prek is preferred for consistency).

## Configuration

The `.typos.toml` file contains:
- Game-specific terms (e.g., `inspectres`, `vtt`, `hbs`)
- Project-specific acronyms and notations (e.g., `Nd6` for dice rolls)
- Directories to ignore (generated files, node_modules, etc.)

## Common false positives

If typos flags a legitimate term, add it to `.typos.toml` under `[default.extend-words]`:

```toml
[default.extend-words]
"myterm" = "myterm"
```

Then re-run to verify the fix.

## CI Integration

Typos runs in GitHub Actions on every PR via `.github/workflows/ci.yml` (`spell-check` job). This check must pass before merging.
