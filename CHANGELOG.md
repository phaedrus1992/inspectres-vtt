# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-04-25

### Added

- **Weird Agent System**: New paranormal investigator archetypes with supernatural powers and special mechanics.
  - Four starter archetypes in compendium: Psychic (telepathy/precognition), Ghost (phase-through walls), Werewolf (keen senses/ferocity), Vampire (shapeshifting/mind control)
  - Power system with Cool cost mechanics, base skill associations, and dual-power support per archetype
  - Characteristic system for archetype-specific quirks and vulnerabilities
  - Full integration with existing stress, recovery, and franchise mechanics
- **Client Roll Table**: Randomized job generation for paranormal investigation scenarios. Roll 2d6 to determine client personality (Horny, Bored, Skeptical, Angry, Impatient, Weird, Frantic, Terrified, Calm, Enthusiastic, Blasé). Foundation for expanded four-field job generation system.

## [0.2.0] - 2026-04-23

### Added

- **Character Continuity**: Agents can now recover from injuries over multiple in-game days. The GM controls the global "in-game day" setting, allowing flexible pacing of recovery narratively rather than wall-clock time.
  - Agents become "out of action" and unable to roll when Maimed or Crippled (per Death & Dismemberment outcomes)
  - Recovery duration scales with injury severity (2 days for Maimed, 3 days for Crippled)
  - Agents auto-transition to "recovered and ready" when the recovery window expires
  - Recovery status displays on agent sheets with clear visual indicators (skull for dead, bed icon for recovering)
- **Death Mode**: New franchise setting that enables/disables death outcomes during stress rolls. When disabled, only Maimed/Crippled outcomes occur; when enabled, agents can be Killed.
- **Mission Mechanics Utilities**: Helper functions for mission requirements (minimum agent count), teamwork evaluation, and confessional handling. Enables scripted mission effects and event-driven resolution.
- **Foundry VTT System Scaffold**: TypeScript + Vite build pipeline with full type safety.
- **Agent and Franchise Actor Types**: Complete data models, character sheets, and UI for both actor types.
- **Roll System**: Skill, stress, bank, and client rolls with full dice resolution and chat output.
- **Mission Tracker**: Mission management app with franchise dice pool progress, GM distribution dialog, and mission-complete flow.
- **Tab Navigation**: Agent and franchise sheets support keyboard tab navigation with ARIA semantics for accessibility.
- **UI Polish**: Portrait editing with FilePicker, improved sheet styling and layout, cool pip toggle that deselects when clicking an already-selected pip.
- **Starter Compendium**: Blank Agent and Franchise actors plus four shortcut macros (Skill Roll, Stress Roll, Bank Roll, Client Roll).
- **CI and Release Workflows**: Type checking and production build on every push and PR; release workflow tags `v*.*.*` and publishes GitHub releases with `inspectres.zip` and `system.json`.

### Changed

- All sheets and the Mission Tracker app now use the Foundry V13 ApplicationV2 API, eliminating deprecation warnings for `ActorSheet` and `Application`. Requires Foundry V13 or later.
- Roll dialogs (skill roll, stress roll, distribute mission dice) use `DialogV2` — the new native browser `<dialog>` element — instead of the deprecated V1 `Dialog`.
- Create Actor dialog height is now fixed using the `renderDialogV2` hook (previously the hook targeted V1 dialogs and had no effect in V13+).
- Minimum supported Foundry version bumped from 12 to 13.
- In-game day tracking replaces wall-clock timestamps for recovery calculations, giving GMs narrative control over agent downtime pacing.

### Fixed

- Schema migration: `recoveryStartedAt` type changed from ISO string to in-game day number; legacy data automatically normalized.
- Recovery system properly blocks all rolls (skill and stress) when agents are dead or actively recovering.
- Uninitialized recovery edge case handled gracefully: agents with pending recovery but no start day are seeded to current day.
- Death outcome probabilities now correctly use stress level multipliers.
- Tab listener accumulation bug fixed: tab event listeners no longer stack on repeated sheet renders.
- Debt mode correctly blocks all rolls (skill and stress) when franchise is in debt.
- TypeScript strict mode compliance: all type errors resolved, no-unchecked-index-access enabled.

[Unreleased]: https://github.com/phaedrus1992/inspectres-vtt/compare/HEAD...HEAD
