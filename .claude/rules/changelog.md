---
paths:
  - "CHANGELOG.md"
  - "system.json"
---

# Changelog and Versioning Rules

## Versioning

This project uses [Semantic Versioning](https://semver.org/). The version lives in
`foundry/system.json` under the `"version"` field.

| Change type | Version component |
|-------------|-------------------|
| Backwards-incompatible data model or API change | MAJOR |
| New functionality (new actor type, new sheet, new mechanic) | MINOR |
| Bug fixes, internal refactors, documentation, CI | PATCH |

## Changelog format

All notable changes are recorded in `CHANGELOG.md` at the repo root, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

- Keep an `[Unreleased]` section at the top for changes not yet tagged.
- Group entries under: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Every PR with a semver-worthy change **must** update `CHANGELOG.md` as part of the same commit.
- When a release is tagged, move `[Unreleased]` entries to a new `[x.y.z] - YYYY-MM-DD` section
  and bump `"version"` in `foundry/system.json`.
- Do not leave `CHANGELOG.md` with only a version bump and no entries — describe what changed.
- Write for the **end user** (GM or player using the system), not the developer. Describe what
  they can now do or what problem is fixed — not which file changed or how the code works.

  Bad: "Add `FranchiseDicePool` class wired into `AgentSheet.getData()`"
  Good: "Franchise dice pool displays on agent sheets."

## Per-PR checklist

Before opening a PR that changes game behaviour, data models, or user-facing features:

1. Add an entry under `[Unreleased]` in `CHANGELOG.md`.
2. If the change warrants a version bump (anything MINOR or MAJOR), bump `"version"` in
   `foundry/system.json` in the same commit.

Pure tooling, CI, or documentation PRs (no change to what a player or GM experiences) do not
require a changelog entry, but may include one under `Changed` if helpful.

## Cutting a release

1. Move `[Unreleased]` entries to `[x.y.z] - YYYY-MM-DD` in `CHANGELOG.md`.
2. Bump `"version"` in `foundry/system.json` to `x.y.z`.
3. Commit: `"Release x.y.z"`.
4. Tag: `git tag vx.y.z`.
5. Push commit and tag: `git push && git push --tags`.
