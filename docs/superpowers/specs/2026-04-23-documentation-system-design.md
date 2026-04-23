---
name: InSpectres Documentation System Design
description: Two-tier documentation with README quickstart and Docusaurus site for comprehensive, versioned docs
type: spec
---

# InSpectres Documentation System Design

**Date:** 2026-04-23  
**Status:** Approved  
**Audience:** End users (GMs/players) primary; developers secondary (getting-started section)

## Overview

A two-tier documentation approach:

1. **README.md** — Self-contained quickstart. Users can install and run from the README alone.
2. **Docusaurus site** (`/docs` folder) — Comprehensive, versioned documentation hosted on GitHub Pages.

This design prioritizes end users while providing a clear pathway for developers to contribute.

## Part 1: README Structure (Updated)

### Content Sections

- **What is InSpectres** — 2-3 sentence intro explaining the project (paranormal investigation RPG system for Foundry VTT)
- **Quick Start** — Two installation paths:
  - From release: Download link + manual steps (unzip, place in Foundry data)
  - From source: Clone, npm install, build, symlink
- **First Run** — Launch Foundry, activate the InSpectres system, create an agent character
- **Next Steps** — Links to docs site for gameplay mechanics, rules, and development guides

### Scope

The README is self-sufficient for getting running. Detailed/advanced content (mechanics deep-dives, architecture, contributing) lives in the docs site, but the README links point readers there naturally.

## Part 2: Docusaurus Site Structure

### Directory Layout

```
docs/
├── docusaurus.config.js           // Docusaurus config (site title, GitHub Pages URL, versioning)
├── sidebars.js                    // Navigation sidebar structure
├── versioned_docs/                // Auto-generated per-release (created on git tag)
│   └── version-0.3.0/
│       └── ...
├── current/                       // Current (next) version
│   ├── intro.md                  // Welcome, project overview
│   ├── install/
│   │   ├── from-release.md       // Download + install instructions
│   │   └── from-source.md        // Clone, build, dev setup
│   ├── gameplay/
│   │   ├── getting-started.md    // First session, creating agents, running a mission
│   │   ├── mechanics.md          // Rules reference (stress, recovery, franchises, rolls, charts)
│   │   └── troubleshooting.md    // Common issues, FAQ
│   ├── development/
│   │   ├── setup.md              // Dev environment, running tests, build process
│   │   ├── architecture.md       // System design overview, component boundaries
│   │   └── contributing.md       // PR guidelines, code standards (link to CLAUDE.md)
│   ├── components/
│   │   ├── agent-sheet.md        // Agent sheet guide + screenshot (placeholder initially)
│   │   ├── franchise-sheet.md    // Franchise sheet guide + screenshot
│   │   └── rolls.md              // Roll mechanics, examples, screenshots
│   ├── api/
│   │   └── config.md             // CONFIG object reference, settings, hooks (if needed)
│   └── changelog.md              // Link to repo CHANGELOG.md
└── static/                        // Static assets
    └── img/
        ├── agent-sheet.png
        ├── franchise-sheet.png
        ├── roll-example.png
        └── ...
```

### Navigation Sidebar

- **Getting Started** — intro, install (release + source), gameplay/getting-started
- **Gameplay** — mechanics, troubleshooting
- **Development** — setup, architecture, contributing
- **Components** — agent sheet, franchise sheet, rolls
- **Reference** — changelog, config/API (if applicable)

### Versioning Strategy

- **Current docs** live in `/docs/current/` — represents the "next" unreleased version
- **On release tag** (e.g., `v0.3.0`):
  - Docusaurus auto-generates `/docs/versioned_docs/version-0.3.0/`
  - Old content becomes immutable, new docs development happens in `/docs/current/`
  - GitHub Pages shows a version selector (users can view docs for any release)
- **Retroactive versioning not required** — v0.2.0 and earlier are not documented; versioning starts from the next release

### Progressive Screenshots

- **Phase 1 (this initiative):** Text descriptions + `[Screenshot: Agent Sheet]` placeholders
- **Future issues:** Add actual screenshots, update existing placeholders
- Unblocks docs launch without waiting for screenshot work

## Part 3: CI/CD and Hosting

### GitHub Pages Deployment

- **Trigger:** Push to `main` branch
- **Action:** Build Docusaurus (`npm run build`) and deploy to `gh-pages` branch
- **Site URL:** `https://phaedrus1992.github.io/inspectres-vtt/` (or custom domain if configured)
- **Workflow file:** `.github/workflows/deploy-docs.yml`

### Build Requirements

- Node.js 22+ (matches main repo)
- Docusaurus v3 (latest stable)
- GitHub Pages enabled in repo settings

### Versioning on Release

When a release is tagged (e.g., `git tag v0.3.0`):
1. Docusaurus CLI (`docusaurus docs:version 0.3.0`) snapshots current docs
2. Commit and push versioned snapshot
3. CI/CD rebuilds and deploys with version selector

(Manual step; can be automated later if desired.)

## Part 4: Content Guidelines

### For End Users (Gameplay)

- **Tone:** Friendly, practical, example-driven
- **Mechanics sections:** Reference the rules spec (`reference/inspectres-rules-spec.md`); link but don't duplicate
- **Screenshots:** Include visuals of sheets, rolls, and outcomes; placeholder text until images are added

### For Developers (Setup/Architecture)

- **Tone:** Technical, reference-style
- **Getting started:** Enough to clone, build, run tests, and open a PR
- **Architecture:** High-level design (don't duplicate code comments); explain why, not what
- **Contributing:** Link to CLAUDE.md for code standards; add Docusaurus-specific conventions here if needed

### Markdown Standards

- Use GitHub-flavored markdown (Docusaurus supports it)
- Hard-wrap at 100 characters (matches repo style)
- Link to in-repo files using relative paths: `../../../reference/inspectres-rules-spec.md`
- Link to external resources with full HTTPS URLs

## Part 5: GitHub Labels and Milestones

### New Labels

- **`area-docs`** — Documentation tasks (new)
- **`type-docs`** — Pure documentation (replaces using `chore` for docs-only work)

### New Milestone

- **Docs: Initial Launch** — Phase 1 tasks (Docusaurus setup, initial content, CI/CD)
- **Docs: Screenshot Progress** — Phase 2 (add screenshots to component reference progressively)
- **Docs: Gameplay Expansion** — Phase 3 (deeper gameplay guides, advanced mechanics, session tips)

Issues under `area-docs` are organized by milestone, making it easy to see what's done vs. planned.

## Part 6: Success Criteria

✅ README is self-contained (users can install and run without leaving the file)  
✅ Docusaurus site builds and deploys automatically on push to main  
✅ Docs site has navigation, search, and responsive design out-of-box  
✅ Installation, gameplay, and development sections are complete (with placeholder screenshots)  
✅ Versioning works (tagged releases snapshot current docs)  
✅ Future screenshot work is unblocked (placeholders allow docs to launch without images)

## Implementation Order

See task breakdown below (next section).
