# InSpectres Foundry VTT Game System — Design Spec

**Date:** 2026-04-20  
**Status:** Approved  
**Author:** Benjamin Reed

---

## Context

The `inspectres-vtt` repository contains a complete machine-readable rules specification
(`reference/inspectres-rules-spec.md`) including a 16-item VTT implementation checklist.
This spec defines the TypeScript project, Foundry system manifest, data models, roll
system, mission tracking, and starter content needed to make InSpectres fully playable
in Foundry VTT. Development is phased: Phase 1 delivers a playable core; all 16 checklist
items are tracked as GitHub issues.

---

## Decisions

| Question | Decision |
|---|---|
| Package type | **Game System** (`system.json`) |
| System ID | **`inspectres`** |
| Source layout | **Feature-folder** (`src/{feature}/`) |
| Scope | **Phased** — MVP core first, all 16 checklist items as GitHub issues |
| Bundled content | **Starter compendium** (blank Agent, blank Franchise, 4 macros) |
| Build toolchain | **Vite 5 + TypeScript + fvtt-types (GitHub main)** |
| Foundry target | `"minimum": "12", "verified": "14"` |

---

## 1. Repository Layout

```
inspectres/
  reference/                        ← rulebook PDFs + rules spec (existing)
  foundry/                          ← ALL Foundry system code
    src/
      init.ts                       ← entry: registers Hooks, CONFIG patches
      agent/
        InSpectresAgent.ts          ← Actor subclass
        AgentSheet.ts               ← ActorSheet subclass
        agent-schema.ts             ← TypeDataModel schema
        agent-sheet.hbs
      franchise/
        InSpectresFranchise.ts
        FranchiseSheet.ts
        franchise-schema.ts
        franchise-sheet.hbs
      rolls/
        SkillRoll.ts
        StressRoll.ts
        BankRoll.ts
        ClientRoll.ts
        roll-charts.ts              ← typed `as const` chart constants
      mission/
        MissionTracker.ts           ← standalone Application
        MissionTrackerApp.ts        ← Application subclass (UI)
        mission-tracker.hbs
      chat/
        ChatCardBuilder.ts
        chat-card.hbs
      compendium/
        actors/
          blank-agent.json
          blank-franchise.json
        macros/
          skill-roll-macro.js
          stress-roll-macro.js
          client-roll-macro.js
          bank-roll-macro.js
      styles/
        inspectres.css
      lang/
        en.json
    system.json
    template.json
    tsconfig.json
    vite.config.ts
    vite.config.prod.ts
    package.json
    dist/                           ← gitignored; symlinked into Foundry for dev
  docs/
    superpowers/
      specs/
        2026-04-20-foundry-vtt-system-design.md   ← this file
  .github/
    workflows/
      release.yml
```

---

## 2. Foundry System Manifest (`foundry/system.json`)

```json
{
  "id": "inspectres",
  "title": "InSpectres",
  "description": "Paranormal investigation RPG system for Foundry VTT.",
  "version": "0.1.0",
  "compatibility": {
    "minimum": "12",
    "verified": "14"
  },
  "authors": [{ "name": "Benjamin Reed" }],
  "esmodules": ["inspectres.js"],
  "styles": ["styles/inspectres.css"],
  "languages": [{ "lang": "en", "name": "English", "path": "lang/en.json" }],
  "packs": [
    {
      "name": "actors",
      "label": "InSpectres Actors",
      "path": "packs/actors",
      "type": "Actor",
      "system": "inspectres"
    },
    {
      "name": "macros",
      "label": "InSpectres Macros",
      "path": "packs/macros",
      "type": "Macro"
    }
  ],
  "url": "https://github.com/phaedrus1992/inspectres-vtt",
  "manifest": "https://github.com/phaedrus1992/inspectres-vtt/releases/latest/download/system.json",
  "download": "https://github.com/phaedrus1992/inspectres-vtt/releases/latest/download/inspectres.zip"
}
```

---

## 3. Data Models

Declared in `template.json` and enforced via `TypeDataModel` subclasses.

### Agent Actor

```typescript
interface AgentData {
  // Effective skill = base - penalty, floored at 0
  skills: {
    academics:  { base: number; penalty: number };  // base: 1–4
    athletics:  { base: number; penalty: number };
    technology: { base: number; penalty: number };
    contact:    { base: number; penalty: number };
  };
  talent: string;           // e.g. "Theatre Major"
  cool: number;             // 0–3 normal; 0–∞ weird
  isWeird: boolean;
  characteristics: Array<{ text: string; used: boolean }>;
  missionPool: number;      // franchise dice this agent earned this job
}
```

### Franchise Actor

```typescript
interface FranchiseData {
  cards: {
    library: number;    // augments Academics
    gym:     number;    // augments Athletics
    credit:  number;    // augments Technology
  };
  bank: number;
  missionPool: number;  // total earned across all agents this job
  missionGoal: number;  // GM-set die target
  debtMode: boolean;
  loanAmount: number;
}
```

**Note:** `missionPool` lives on both Actor types. Agent pool tracks individual contribution;
Franchise pool is the shared total used for Clean Up distribution.

---

## 4. Actor Sheets

### Agent Sheet

| Section | Contents |
|---|---|
| Header | Name, portrait, Talent field (editable text) |
| Skills | 4 rows: base pip input (1–4), stress penalty display, effective count, roll button |
| Cool Dice | Pip tracker 0–3 (normal) or numeric counter (weird) |
| Weird toggle | Switches Cool display mode; sets `isWeird` flag |
| Characteristics | List of received traits with "used" checkbox |
| Mission Pool | Read-only: franchise dice this agent earned this session |

### Franchise Sheet

| Section | Contents |
|---|---|
| Header | Franchise name, description |
| Cards | Library / Gym / Credit — pip inputs |
| Bank | Dice count + "Roll Bank Dice" button |
| Mission | Goal input (GM editable), earned pool counter, progress bar, "Open Mission Tracker" button |
| Debt banner | Warning with loan amount shown when `debtMode: true` |

---

## 5. Roll System

All rolls: **dialog → roll → chat card**. Charts are typed `as const` constants in
`roll-charts.ts`; all outcome lookups are typed, no string matching.

### Skill Roll (`SkillRoll.ts`)

1. **Dialog:** effective skill dice shown; checkboxes for augmentation (relevant Card, Bank,
   Cool, Talent); "Take 4" button if base skill was 4 and effective ≥ 1
2. **Roll:** `Nd6`, take highest
3. **Chat card:** outcome name, who narrates (player/GM), franchise dice awarded
4. **Side effect:** on award > 0, increments Agent `missionPool` and Franchise `missionPool`

### Stress Roll (`StressRoll.ts`)

1. **Dialog:** GM inputs 1–5 dice; agent's Cool shown (each Cool die removes one lowest die
   before reading; Cool **not** spent)
2. **Roll:** take lowest remaining
3. **Chat card:** outcome; result 6 increments Cool (capped at 3 normal); result 1 (Meltdown)
   zeroes Cool, opens penalty distribution dialog

### Bank Roll (`BankRoll.ts`)

- No dialog; called per-die by SkillRoll or Vacation handler
- Each die evaluated against `BANK_ROLL_CHART` independently
- Result 6: die returns + bonus die. Result 1: all Bank dice zeroed.
- Returns updated Bank total to caller

### Client Roll (`ClientRoll.ts`)

- No dialog; GM tool
- Rolls `2d6` × 4, looks up each in `CLIENT_ROLL_CHART`
- Posts chat card with Personality, Client, Occurrence, Location
- No actor state modified

### Chart Constants (`roll-charts.ts`)

```typescript
export const SKILL_ROLL_CHART = {
  6: { result: "Amazing!",   narration: "player", franchiseDice: 2 },
  5: { result: "Good",       narration: "player", franchiseDice: 1 },
  4: { result: "Fair",       narration: "player", franchiseDice: 0 },
  3: { result: "Not Great",  narration: "gm",     franchiseDice: 0 },
  2: { result: "Bad",        narration: "gm",     franchiseDice: 0 },
  1: { result: "Terrible!",  narration: "gm",     franchiseDice: 0 },
} as const;
// STRESS_ROLL_CHART, BANK_ROLL_CHART, CLIENT_ROLL_CHART defined similarly
```

---

## 6. Mission Tracker

Standalone `Application` (not embedded in Franchise sheet; sheet links to it).

- Reads Franchise actor's `missionPool` and `missionGoal`
- Progress bar: N of Goal dice earned
- **"Begin Clean Up"**: opens distribution dialog; player assigns earned dice to
  Library / Gym / Credit / Bank
- **"End Early"**: halves pool (floor), then opens same distribution dialog
- Notifies all players via Foundry socket when goal reached
- GM can edit mission goal inline

---

## 7. Starter Compendium

### Actors pack

| Actor | Configuration |
|---|---|
| Blank Agent | 9 skill dice: Contact 3 / others 2; empty Talent; 0 Cool |
| Blank Franchise | 7 dice: Library 4 / Gym 1 / Credit 1 / Bank 1 |

### Macros pack

| Macro | Action |
|---|---|
| Skill Roll | Opens SkillRoll dialog for selected token |
| Stress Roll | Opens StressRoll dialog; prompts GM for dice count |
| Client Roll | Fires ClientRoll immediately, posts to chat |
| Bank Roll | Opens BankRoll dialog for selected token's Franchise |

---

## 8. Build Toolchain

**`foundry/package.json` scripts:**

```json
{
  "dev":   "vite build --watch --config vite.config.ts",
  "build": "vite build --config vite.config.ts",
  "prod":  "vite build --config vite.config.prod.ts",
  "check": "tsc --noEmit"
}
```

**`foundry/tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": ["fvtt-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

**Vite config:** single bundle output `dist/inspectres.js`; custom plugin copies `system.json`,
`template.json`, `styles/`, `lang/`, and Handlebars templates to `dist/`.

**Dev workflow:** `npm run dev` + symlink `dist/` into `{foundryData}/Data/systems/inspectres/`.
Rebuild on save; manual F5 in Foundry to reload.

**fvtt-types install:**
```sh
npm add -D fvtt-types@github:League-of-Foundry-Developers/foundry-vtt-types#main
```

---

## 9. GitHub Actions Release Workflow

`.github/workflows/release.yml` — triggers on semver tag push (`v*.*.*`):
1. Install deps → `npm run prod`
2. Inject correct `manifest` and `download` URLs into `dist/system.json`
3. Zip `dist/` as `inspectres.zip`
4. Upload `inspectres.zip` and `dist/system.json` as release assets

---

## 10. Phase 1 MVP — What Gets Built

| Component | Phase |
|---|---|
| TypeScript project scaffold (Vite + fvtt-types + tsconfig) | 1 |
| `system.json` + `template.json` | 1 |
| Agent Actor + sheet | 1 |
| Franchise Actor + sheet | 1 |
| Skill Roll (augmentation dialog, chat card, franchise die tracking) | 1 |
| Stress Roll (Cool ignores, penalty distribution) | 1 |
| Bank Roll (per-die resolution) | 1 |
| Client Roll (4×2d6 generator, chat card) | 1 |
| Mission Tracker app (goal, pool, Clean Up, End Early) | 1 |
| Starter compendium (2 actors, 4 macros) | 1 |
| GitHub Actions release workflow | 1 |

---

## 11. Future Issues (Phase 2+)

Tracked as GitHub issues; not in Phase 1 scope:

- Requirements Checker UI
- Teamwork UI (helper declares assist, hands over die)
- Confessional Tracker (one-per-scene, characteristics, end-of-session bonus)
- Vacation Calculator (stress recovery dice spending UI)
- Bankruptcy Handler (Cards lock, loan UI, repayment)
- Character Continuity Timer (recovery days countdown)
- Weird Agent powers panel (power activation, unlimited Cool UI)
- Rich compendium (Client Roll as Foundry RollTable, Weird Agent archetypes, rules journal)
- Death & Dismemberment mode (hazard pay, character death flow)
- Socket multiplayer sync (real-time mission tracker for all players)
- devMode integration (verbose logging wired to Foundry devMode module)

---

## 12. Verification

1. `cd foundry && npm install` — no errors
2. `npm run check` — zero TypeScript errors
3. `npm run build` — `dist/` produced with `inspectres.js`, `system.json`, `styles/`, `lang/`
4. Symlink `dist/` → `{foundryData}/Data/systems/inspectres/`
5. Launch Foundry → create a world with the `inspectres` system — no console errors
6. Create an Agent actor → sheet opens, 4 skill rows with roll buttons visible
7. Create a Franchise actor → sheet opens, Cards/Bank pips and mission goal editable
8. Roll a skill → chat card shows correct outcome text and narration guidance
9. Roll stress → penalty applied to skill on Agent sheet; Cool increments on result 6
10. Roll Client → chat card shows all 4 fields from correct chart rows
11. Earn enough mission dice → Mission Tracker shows goal reached notification
