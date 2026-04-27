---
paths:
  - "CHANGELOG.md"
  - "system.json"
---

# Changelog & Versioning

## Semver

| Change | Component |
|--------|-----------|
| Backwards-incompatible data/API | MAJOR |
| New actor/sheet/mechanic | MINOR |
| Bug fix, refactor, docs, CI | PATCH |

Version in `foundry/system.json`.

## Format

[Keep a Changelog](https://keepachangelog.com/) + [SemVer](https://semver.org/). Groups: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

Keep `[Unreleased]` at top. Write for end-user (GM/player), not dev. Only include changes that affect gameplay, mechanics, UI, or user-visible behavior.

Bad: "Add `FranchiseDicePool` class" or "Remove dead `missionPool` field from Agent schema"
Good: "Franchise dice pool on agent sheets"

**Internal refactoring, dead code removal, type safety improvements, build fixes belong in commit messages only, not CHANGELOG.**

## Per-PR

User-facing change:
1. Add entry under `[Unreleased]`
2. Bump version in `system.json` if MINOR/MAJOR

Tooling/CI/docs: skip unless helpful

## Release

1. Move `[Unreleased]` to `[x.y.z] - YYYY-MM-DD`
2. Bump `system.json` version
3. Commit `Release x.y.z`
4. Tag: `git tag vx.y.z`
5. Push: `git push && git push --tags`
