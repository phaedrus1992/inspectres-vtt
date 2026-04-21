# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Foundry VTT system scaffold with TypeScript + Vite build pipeline
- Agent and Franchise actor types with sheets and data models
- Skill, stress, bank, and client rolls with full dice resolution and chat output
- Mission Tracker app showing franchise dice pool progress, GM distribution dialog, and mission-complete flow
- Debt mode: franchise can enter debt, blocking all rolls until resolved
- Client rolls whispered to GM only
- Cool pip toggle correctly deselects when clicking an already-selected pip
- Starter compendium with blank Agent actor, blank Franchise actor, and four shortcut macros (Skill Roll, Stress Roll, Bank Roll, Client Roll)
- CI workflow: type checking and production build on every push and PR
- Release workflow: tags matching `v*.*.*` build and publish a GitHub release with `inspectres.zip` and `system.json`
- `.claude/rules/` for TypeScript and Foundry VTT development standards

[Unreleased]: https://github.com/phaedrus1992/inspectres-vtt/compare/HEAD...HEAD
