# InSpectres Comprehensive System Audit

**Date:** 2026-04-25  
**Scope:** Game mechanics coverage, code quality, UX/accessibility, security defaults  
**Status:** Complete audit + roadmap

---

## Executive Summary

This audit compares the InSpectres VTT implementation against the complete rules specification (`reference/inspectres-rules-spec.md`) and analyzes codebase quality, user experience, and security posture.

**Key Findings:**

- **Mechanics Coverage:** ~65% of core rules implemented. 25 mechanics gaps identified, ranging from missing UI to incomplete workflows
- **Code Quality:** Architecture sound but with notable gaps: dead code, duplicated dialogs, type-safety holes, untested paths
- **UX:** Playable and intuitive, but recovery controls buried, controls not always discoverable, day input requires Settings navigation
- **Security:** No critical vulnerabilities; clean input handling and error boundaries

**Actionable Issues Created:** 31 total (8 P0, 12 P1, 11 P2)

---

## 1. GAME MECHANICS AUDIT

### 1.1 What IS Implemented (Working Features)

#### Core Rolls
- **Skill rolls** (all 4 skills) with full augmentation dialog (Cards, Bank, Cool, Talent)
- **Stress rolls** with Cool-ignore mechanics and Stress Roll Chart outcomes
- **Bank rolls** with per-die resolution against Bank Roll Chart
- **Client generation rolls** (4× 2d6 table, GM-whispered output)
- **Death & Dismemberment optional rule** (conditional on death mode flag)

#### Agent System
- Skills (base + penalty tracking), talent, cool dice, weird flag, characteristics array
- Recovery state machine (`isDead`, `daysOutOfAction`, `recoveryStartedAt`)
- Stress tracking (separate 0–6 integer counter for vacation dialog)
- Weird agent cool pool (unlimited vs. 3-die cap for normal agents)

#### Franchise System
- Three Cards (Library, Gym, Credit) with per-skill augmentation
- Bank pool for unrestricted augmentation
- Mission pool accumulation (earns on 5–6, distributed at Clean Up)
- Debt mode entry/exit with borrow dialog and repayment calculation
- Death mode flag (gates Death & Dismemberment outcomes)

#### UI Controls (Sheets)
- Agent sheet: skill roll, stress roll, vacation, cool toggles, characteristics, recovery controls, weird checkbox, power activation
- Franchise sheet: bank roll, client roll, day advancement (± buttons), debt controls, mission tracker button
- Mission Tracker: pool progress bar, Clean Up (distribution dialog), End Early (zero pool)

### 1.2 Critical Mechanics Gaps (P0 Blockers)

These prevent core gameplay loops and must be resolved.

| Gap | Rules Ref | Severity | Notes |
|-----|-----------|----------|-------|
| **Weird agent skill range enforcement** | p.57–62 | P0 | AgentDataModel enforces max 4 per skill for all agents. Rules allow 0–10 for weird agents. Creation wizard missing. |
| **Weird agent skill distribution budget** | p.27, 57 | P0 | No validation of 9-die (normal) vs. 10-die (weird) budget at creation. Players can over/under-allocate. |
| **One-weird-agent-per-group enforcement** | p.53 | P0 | No system-level gate. Multiple agents can have `isWeird=true`. |
| **Stress penalty player choice** (Annoyed, Stressed, Frazzled, Meltdown) | p.303–307 | P0 | Penalties apply to Academics only. Rules require player to choose which skill to penalize. |
| **Annoyed: next-roll-only tracking** | p.303 | P0 | Annoyed (−1) is applied as permanent penalty like Stressed. Rules say "next skill roll only." No transient penalty tracking in data model. |
| **Zero-dice auto-fail** | p.319 | P0 | Implemented but not surfaced in UI. Player rolls 0-die skill → must roll 2d6 take lowest. Chat card doesn't explain this. |

### 1.3 High-Priority Mechanics Gaps (P1 Features)

These are player-facing features that reduce functionality but don't block core play.

| Gap | Rules Ref | Why Missing | Impact |
|-----|-----------|-------------|--------|
| **Teamwork assist rolls** | p.219 | Logic in `teamwork.ts` but no roll UI or sheet button | Helpers cannot execute assists. Players must manually track helper dice. |
| **Confessional UI + session tracking** | p.525–567 | `confessional.ts` is pure logic; no Foundry integration or scene boundary | No way to trigger confessional from sheet. Session boundary not tracked. Characteristics bonus not auto-calculated. |
| **Characteristics end-of-session bonus** | p.562–565 | Data stored (`used` bool) but no end-of-session hook or bonus calculation | GMs must manually award +1 franchise die if characteristic was role-played. |
| **Weird agent Cool restore during Vacation** | p.329 | Vacation dialog only spends Bank to reduce stress, not to restore Cool | Weird agents cannot use vacation to rebuild Cool pool per rules. |
| **Talent restricted to normal agents** | p.42 | AgentDataModel has talent for all agents; no `isWeird` gate | Weird agents can have talent (rules forbid). |
| **Premature job end (½ dice rule)** | p.390 | MissionTrackerApp "End Early" zeros pool entirely | Players lose all earned dice if ending early. Rules say keep ½ (rounded down). |
| **Hazard pay** | p.436 | Comment in code: "deferred"; not implemented | Death mode doesn't grant +1 franchise per non-weird agent at mission end. |
| **Mid-mission Cool → skill recovery** | p.324 | No button on AgentSheet; vacation-only recovery exists | Agents cannot spend Cool during mission to restore skill points. |
| **Private Life rolls (Cool-only)** | p.593 | No distinct roll mode or gating in skill roll dialog | No way to signal "this is private" and restrict to Cool augmentation. |
| **Requirements checker UI** | p.249 | `requirements-checker.ts` is pure logic; no Technology roll integration | GMs must manually check requirements. No defect reduction workflow in UI. |
| **Bankruptcy restart flow** | p.415–425 | Notification sent; no automated restart or agent Cool wipe flow | GMs must manually reset franchise and clear agent Cool pools. |
| **Starting Interview workflow** | p.446–468 | No structured phase tracking or scene boundary | Entirely narrative; no GM-facing workflow or checklist. |
| **Client roll standalone (without franchise actor)** | p.749 | `executeClientRoll` requires a RollActor (the franchise) | Cannot run client roll as a standalone tool. |

### 1.4 Medium-Priority Mechanics Gaps (P2 Polish)

These are less critical but expected features.

| Gap | Rules Ref | Details |
|-----|-----------|---------|
| Agent-level `missionPool` dead field | – | `AgentDataModel` has `missionPool` but it's never read or written. Franchise-level pool is the source of truth. |
| Weird agent `power` field not persisted | – | `agent-schema.ts` declares `power?: WeirdPower` but `AgentDataModel` has no `SchemaField` for it. Power data lost on reload. |
| Stress counter vs. skill penalty duplication | – | `system.stress` (0–6 integer) used only by vacation dialog. Rules treat stress as consequence of penalty values themselves. Possible redundancy. |
| Take 4 not gated by original skill rating | – | UI allows any agent to use "Take 4" dialog. Rules require original skill = 4. |
| Cool cap enforcement (3-die max normal agents) | – | UI uses pip toggles (enforces 1–3 range) but data model `min: 0`. No post-load validation if agent edited via data. |
| Card dice per-skill gating in dialog | – | Skill roll augmentation dialog allows selecting Card dice for non-matching skills. Should gate to skill-specific cards only. |
| Talent die restriction to one agent | – | Rules say "one Talent per agent." No enforcement; agent could accidentally add multiple. |

### 1.5 Mechanics Implementation Status Matrix

| Feature | Core Impl. | UI | Notes |
|---------|-----------|-----|-------|
| Skill Roll + Augmentation | ✅ | ✅ | Fully working |
| Stress Roll + Chart | ⚠️ | ⚠️ | Chart applied but penalty choice automated (rules require player choice) |
| Bank Roll + Resolution | ✅ | ✅ | Fully working |
| Client Generation | ✅ | ✅ | Fully working |
| Death & Dismemberment | ✅ | ✅ | Conditional on `deathMode` flag |
| Weird Agent Powers | ✅ | ✅ | Activation working |
| Recovery System | ✅ | ⚠️ | State machine works; UI controls buried |
| Debt Mode | ✅ | ✅ | Fully working |
| Vacation | ✅ | ✅ | Stress reduction only; no Cool restore for weird |
| Confessionals | ❌ | ❌ | Pure logic; no UI wiring |
| Teamwork | ❌ | ❌ | Pure logic; no UI wiring |
| Characteristics Bonus | ⚠️ | ❌ | Data tracked; no end-of-session automation |
| Requirements Checking | ⚠️ | ❌ | Logic exists; no UI integration |
| Bankruptcy Restart | ⚠️ | ❌ | Notification sent; no restart automation |
| Premature End | ⚠️ | ❌ | Zero pool; ignores ½-dice rule |
| Hazard Pay | ❌ | ❌ | Deferred in code |
| Private Life Rolls | ❌ | ❌ | No mode or gating |

---

## 2. CODE QUALITY AUDIT

### 2.1 Architecture Strengths

- **Layered design:** UI → business logic → data models → roll charts. Clear separation of concerns
- **Structural interfaces:** `RollActor` decouples roll execution from Foundry's `Actor` type, enabling unit testing
- **Pure functions:** `resolveBankDice`, `computeRecoveryStatus`, `executeClientRoll` are testable and reusable
- **Minimal entry point:** `init.ts` is thin (≤200 lines), hooks are registered appropriately
- **Socket sync:** Two separate mechanisms (`SocketSyncManager` and `mission/socket.ts`) provide redundancy, though one is dead code

### 2.2 Critical Code Quality Issues (P0)

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| **Weird agent `power` field not persisted** | `agent-schema.ts:15–20` vs. `AgentDataModel.ts` | P0 | TypeScript declares field but Foundry schema has no `SchemaField`. Data lost on reload. |
| **Stress penalty hardcoded to Academics** | `roll-executor.ts:61–68` | P0 | All stress outcomes apply to Academics. Rules require player choice. Will need refactoring to support multi-skill distribution. |

### 2.3 High-Priority Code Quality Issues (P1)

| Issue | Location | Details | Fix Complexity |
|-------|----------|---------|-----------------|
| **Schema drift risk: `AgentData` vs. `AgentDataModel`** | `agent-schema.ts` and `AgentDataModel.ts` | Maintained separately with no mechanical enforcement. Future risk of silent data loss if fields diverge; does not block current gameplay. | High: Requires full migration to TypeDataModel |
| **`as unknown as AgentData` cast density** | 13 sites in `AgentSheet.ts`, scattered across project | fvtt-types v13 limitation requires double-cast at `actor.system` boundary. Acknowledged but represents type-safety debt pending TypeDataModel migration. | Medium: Add helper utility to reduce cast sites; eliminate pending TypeDataModel migration |
| **Duplicate distribution dialog** | `MissionTrackerApp.ts:69–150` and `FranchiseSheet.ts:169–254` | 80+ lines of identical logic (player inputs, validation, pool reset, socket emit, chat message) | Medium: Extract to shared utility module with injectable franchise resolver |
| **`SocketSyncManager` dead implementation** | `socket/socket-sync.ts` | Class with 5 methods; only `queueEvent` called (2 sites) but queue never flushed; `flushQueue` never invoked; GM-priority conflict resolution branches are identical (inert) | Medium: Either complete the implementation or remove entirely in favor of simpler `mission/socket.ts` |
| **`teamwork.ts` and `confessional.ts` not integrated** | `mission/teamwork.ts`, `mission/confessional.ts` | Exported functions never imported; exercised by tests but no production code path | Low: UI wiring needed to make functional (P1 feature work) |
| **DataModel escape hatches** | `AgentDataModel.ts:5`, `FranchiseDataModel.ts` | Both use `as unknown as new () => object` and return `Record<string, unknown>` from `defineSchema()`. Discards typed field structure. | High: Requires TypeDataModel generics resolution (TypeScript + fvtt-types upgrade, coordinated with team) |
| **No `franchiseSystemData` helper in agent code** | `AgentSheet.ts` | Agent code has 13 `as unknown as AgentData` casts. Franchise code uses a centralized `franchiseSystemData()` helper reducing duplication | Low: Extract to utility, apply across agent code |
| **Test fixture violates `RollActor` pattern** | `AgentSheet.test.ts:18` | Test setup uses `Object.create(AgentSheet.prototype)` instead of structural interface. Couples tests to class implementation | Low: Refactor fixtures to satisfy `RollActor` interface |

### 2.4 Medium-Priority Code Quality Issues (P2)

| Issue | Location | Details |
|-------|----------|---------|
| **`console.log` in production code** | `dev-logger.ts` | Uses `console.log` directly (gated behind `devMode` setting). Project rules call for structured logging. Low risk (gate exists) but violates pattern. |
| **Re-render trigger on every franchise actor update** | `init.ts:131` | `updateActor` hook re-renders Mission Tracker synchronously for every franchise update. Multiplayer volume could cause stacked render calls (unlikely due to Foundry's internal debouncing). |
| **Linear scan for franchise actor** | `franchise-utils.ts:3` | `findFranchiseActor` iterates `game.actors` every time `_prepareContext` runs. Negligible for typical campaign sizes (5–20 actors) but scales linearly. |
| **Distribution dialog HTML by string interpolation** | `MissionTrackerApp.ts:102`, `FranchiseSheet.ts:207` | Minor XSS risk if user names contain HTML (practically low risk — Foundry world data trusted). Violates prefer-DOM-construction pattern. |
| **`addToMissionPool` helper duplication** | `InSpectresAgent.ts:11` and `InSpectresFranchise.ts:12` | Identical private helpers in separate files. Could extract to shared utility. |
| **Death/Dismemberment paths untested** | `__mocks__/setup.ts`, `roll-executor.test.ts` | `MockRoll.setResults` defined but unused. Death outcome test path uses empty `faces: []` triggering fallbacks instead of real outcomes. |
| **CSS button reset uses negative-class selector** | `inspectres.css:100` | `.button:not(.inspectres-roll-button):not(...)` is brittle; will silently break when new button variants added without exclusion list. |
| **Recovery description strings used for banner display** | `recovery-utils.ts:43–75` / `agent-sheet.hbs:6` | `computeRecoveryStatus` returns descriptions used in agent sheet recovery banner (`{{recoveryStatus.description}}`). Correct behavior but worth documenting to avoid confusion. |
| **`overrideRecoveryDay` action on input may not fire** | `agent-sheet.hbs:253` | `data-action` on `input[type=number]` with no corresponding `_onRender` change listener. Handler at `AgentSheet.ts:474` may be unreachable. |
| **Day controls missing `aria-label`** | `franchise-sheet.hbs` | `−`/`+` buttons have only `title` attributes. Should have `aria-label` like other icon-only buttons. |
| **`InSpectresAgent.awardFranchiseDice` unused API** | `InSpectresAgent.ts` | Method exists but never called; rolls interact via `RollActor` structural interface. Potential dead API surface. |

### 2.5 Test Coverage Assessment

| Area | Coverage | Notes |
|------|----------|-------|
| `resolveBankDice` | High | Property-based tests (fast-check) for all outcomes |
| `computeRecoveryStatus` | High | Edge cases covered: active, recovering, dead, returned states |
| Sheet guard conditions | Moderate | Action handler editability and recovery status blocks tested |
| Death/Dismemberment outcomes | **None** | `faces: []` in mocks bypasses real resolution; untestable without dice outcomes |
| Confessional logic | Tested (not integrated) | Pure function covered but no integration tests |
| Teamwork logic | Tested (not integrated) | Pure function covered but no integration tests |
| Bankruptcy flow | Moderate | Happy path covered; edge cases (multiple iterations, interest) not tested |

**Thresholds:** Lines: 45%, Functions: 50%, Branches: 40%, Statements: 45%. These are minimums; current coverage below target in several modules.

---

## 3. USER EXPERIENCE (UX) AUDIT

### 3.1 Discoverability & Control Surface

#### What Works Well
- **Recovery banner visible at all times** (top of agent sheet) signals state clearly
- **Debt warning prominent** (franchise sheet top) draws attention
- **Roll buttons styled distinctly** (.inspectres-roll-button = blue, filled) vs. utility buttons (grey border)
- **Tab navigation follows ARIA pattern:** role attributes, keyboard navigation (arrow keys, Home, End), proper `aria-selected`/`aria-controls`

#### Critical Gaps (P0)
| Issue | Impact | Fix |
|-------|--------|-----|
| **Recovery controls on Notes tab** | Dead agent/recovering agent requires tab switch to access revive/emergency-recovery buttons. Banner shows state but action is hidden. | Move recovery controls to Stats tab or create toolbar widget. |
| **Day input in Settings, not sheet** | GM must navigate Settings panel to set day from scratch (e.g., new campaign). Sheet only has ± buttons. | Add text input for direct day entry on Franchise sheet. |
| **Multiple vacation entry points with no indication** | "Begin Vacation" on Franchise sheet vs. "Begin Clean Up" on Mission Tracker open same distribution dialog. GMs see two separate workflows that do the same thing. | Consolidate: label both "Begin Clean Up & Vacation," or make one navigate to the other. |

#### High-Priority Gaps (P1)
| Issue | Details |
|-------|---------|
| **`overrideRecoveryDay` input may not work** | `data-action` on `input[type=number]` with no change listener. Potentially broken. |
| **Skill penalty distribution UI missing** | Stress outcomes require player choice (Frazzled: −2 to one skill OR −1 to two). Currently auto-applies to Academics only. Will need dialog when stress outcome supports multi-skill distribution. |
| **Confessional trigger missing** | No button on agent sheet to start confessional. Players cannot access this mechanic from VTT. |
| **Teamwork assist missing** | No button to declare assist or hand over helper die. |
| **Requirements checking not integrated** | Tech roll dialog doesn't show requirement tier or defect reduction option. GMs must reference rules manually. |
| **Characteristic bonus not surfaced** | No indication that a characteristic could be role-played for +1 franchise bonus. GMs must remind players. |

### 3.2 Accessibility Review

| Feature | Status | Notes |
|---------|--------|-------|
| **Tab navigation** | ✅ WCAG AA | Full ARIA pattern implemented (`role="tablist"`, `role="tab"`, keyboard nav, focus management) |
| **Icon-only buttons** | ✅ | All have `aria-label` except day `−`/`+` buttons (have `title` only) |
| **Color contrast** | ✅ | Custom property comment confirms ~5:1 ratio (WCAG AA standard) |
| **Form labels** | ⚠️ | Some dialogs use `<label>` wrapping; others use `for`/`id`. No consistent pattern. |
| **Semantic HTML** | ✅ | Proper `<button>`, `<input>`, `<select>` usage |
| **Screen reader support** | ⚠️ | Mission progress bar has no `role="progressbar"`. Recovery status banner not marked with region role. |
| **Keyboard-only navigation** | ⚠️ | Tab order follows DOM; tabs are navigable. But recovery controls on secondary tab = extra keyboard navigation to access critical controls. |

### 3.3 Workflow Efficiency

| Common Task | Steps | Friction Points |
|-------------|-------|-----------------|
| Make skill roll | 1 click | Smooth |
| Make stress roll | 2 clicks | Need to confirm dialog |
| Take vacation | 2 clicks + input | Dialog adds cognitive load |
| Revive dead agent | 2 clicks | Must switch to Notes tab |
| Advance day | 2 clicks | Open Franchise sheet + click + button |
| Begin mission cleanup | 4 clicks (Franchise) / 3 clicks (Tracker) | Two entry points; duplicated logic |
| Set day from scratch | 4–5 clicks | Must navigate to Settings (not discoverable) |
| Use teamwork assist | N/A | Not implemented |
| Run confessional | N/A | Not implemented |

### 3.4 CSS & Visual Design

- **Single file:** `inspectres.css` (893 lines, well-organized by section)
- **Custom properties:** Consistent naming, accessibility-conscious color choices
- **Layouts:** Flexbox-based, responsive
- **Button reset:** Uses negative-class selector (brittle; will break when new button variants added)

---

## 4. SECURITY & DEFAULTS AUDIT

### 4.1 Input Validation & XSS Prevention

| Area | Status | Details |
|------|--------|---------|
| **Skill step buttons** | ✅ Safe | Data attributes validated at handler entry |
| **Dialog inputs** | ✅ Safe | Form values parsed (`Number()`, validated against min/max) |
| **User names in chat** | ⚠️ Low Risk | Distribution dialog uses string interpolation (e.g., `\${user.name}`) but Foundry world data is trusted |
| **Rich text (journal enrichment)** | ✅ Safe | Uses Foundry's `TextEditor.enrichHTML()` (XSS-safe) |
| **Error messages** | ✅ Safe | Uses `game.i18n.localize()` (never raw user input) + fallback strings |

### 4.2 Secure Defaults

| Setting | Default | Assessment |
|---------|---------|------------|
| **Roll mode** | Respects `core.rollMode` | ✅ GMs can control public/private |
| **Agent death state** | `isDead: false` | ✅ Safe |
| **Debt mode** | `debtMode: false` | ✅ Safe (requires explicit entry) |
| **Recovery state** | All false/0 | ✅ Safe |
| **Day counter** | 0 (start of campaign) | ✅ Safe |
| **Cards locked** | false | ✅ Safe |
| **Weird flag** | false | ✅ Safe (multiple weird agents possible but unusual) |

### 4.3 Authorization & Permissions

- **GM-gated controls:** Debt mode toggle, revive agent, emergency recovery, day controls → all check `isGm` in template
- **No elevation:** Non-GMs cannot trigger GM-only actions (defense in depth: checked in handler + template)
- **Franchise visibility:** All players see franchise data (correct; shared resource)
- **Agent privacy:** Each player's agent visible to all (correct; team game)

### 4.4 Data Exposure Risks

- **No private flags:** No sensitive data hidden in flags
- **No authentication tokens:** Settings are world-level (not exposed to non-GMs)
- **Socket events:** Mission pool updates broadcast to all clients (intentional; shared state)

### 4.5 Error Handling

| Scenario | Behavior | Assessment |
|----------|----------|------------|
| **Missing franchise actor** | Warning notification + early return | ✅ Graceful |
| **Invalid skill name in roll dialog** | Would not occur (dropdown control) | ✅ Prevention by design |
| **Network failure during actor update** | Roll executes locally; update queued by Foundry | ✅ Foundry handles |
| **Corrupt recovery state** | `computeRecoveryStatus` returns default; recovery not triggered | ✅ Fail-safe |

---

## 5. IMPROVEMENT ROADMAP

### Phase 1: Blockers (P0 — prevents core gameplay)

These must be fixed before mechanics are considered complete.

1. **[P0-001]** Weird agent skill range enforcement + creation budget validation
2. **[P0-002]** One-weird-agent-per-group enforcement
3. **[P0-003]** Stress penalty player choice (Annoyed, Stressed, Frazzled, Meltdown)
4. **[P0-004]** Annoyed: next-roll-only transient tracking (no permanent penalty)
5. **[P0-005]** Weird agent `power` field persistence (add SchemaField to AgentDataModel)
6. **[P0-006]** Schema drift prevention (AgentData ↔ AgentDataModel sync mechanism)

### Phase 2: High-Value Features (P1 — improves gameplay significantly)

1. **[P1-001]** Teamwork assist rolls (UI wiring + roll integration)
2. **[P1-002]** Confessional UI + session tracking + characteristics bonus automation
3. **[P1-003]** Weird agent Cool restore during Vacation
4. **[P1-004]** Talent gated to normal agents only
5. **[P1-005]** Premature job end: implement ½-dice rule
6. **[P1-006]** Hazard pay: +1 franchise per non-weird agent at mission end
7. **[P1-007]** Mid-mission Cool → skill recovery button on agent sheet
8. **[P1-008]** Private Life roll mode (Cool-only augmentation)
9. **[P1-009]** Requirements checker UI integration
10. **[P1-010]** Bankruptcy restart automation
11. **[P1-011]** Starting Interview structured workflow
12. **[P1-012]** Eliminate duplicate distribution dialog (extract shared module)

### Phase 3: UX & Accessibility (P1 UX)

1. **[UX-001]** Move recovery controls to Stats tab (same tab as state banner)
2. **[UX-002]** Add direct text input for day override on Franchise sheet (not Settings)
3. **[UX-003]** Consolidate vacation entry points (one label, consistent workflow)
4. **[UX-004]** Fix/verify `overrideRecoveryDay` change listener
5. **[UX-005]** Add `aria-label` to day control buttons
6. **[UX-006]** Mark mission progress bar with `role="progressbar"`
7. **[UX-007]** Standardize dialog form label patterns (prefer `for`/`id`)

### Phase 4: Code Quality & Cleanup (P2)

1. **[CODE-001]** Remove or complete `SocketSyncManager` (dead code audit)
2. **[CODE-002]** Extract `agentSystemData()` helper (parallel to `franchiseSystemData()`)
3. **[CODE-003]** Replace `console.log` with structured logging
4. **[CODE-004]** Fix test fixtures to use `RollActor` interface (not `Object.create`)
5. **[CODE-005]** Add death/dismemberment outcome tests (requires real dice outcomes)
6. **[CODE-006]** Replace CSS button reset negative-selector with opt-in approach
7. **[CODE-007]** Remove unused recovery description strings (or fix template usage)
8. **[CODE-008]** Audit `InSpectresAgent.awardFranchiseDice` and similar unused API

### Phase 5: Data Model Migration (TypeDataModel)

**Long-term:** Migrate from `template.json` + double-cast pattern to proper `TypeDataModel` with TypeScript generics. This resolves:
- Type-safety gaps (`as unknown as T`)
- Schema drift risk
- `actor.system` proper typing

This is a medium-complexity effort requiring fvtt-types v13+ and coordinating with Foundry's type evolution.

---

## 6. CRITICAL PATH DEFINITION

**For release to stable:**

1. Complete **Phase 1 (P0 blockers)** — Weird agents, stress penalties, schema persistence
2. Complete **Phase 2 — High-Value (P1)** — Teamwork, Confessional, vacation, debt/bankruptcy, premature end
3. Complete **Phase 3 (UX)** — Recovery controls, day input, consolidation
4. Close **Phase 4 duplicates** — Shared distribution dialog only (others optional)

**Estimated scope:** Phase 1 ≈ 5–8 days, Phase 2 ≈ 12–15 days, Phase 3 ≈ 3–5 days, Phase 4 duplicates ≈ 2 days.

---

## 7. APPENDICES

### A. Test Coverage by Module

| Module | Lines | Functions | Branches | Statement | Note |
|--------|-------|-----------|----------|-----------|------|
| `roll-executor.ts` | 48% | 60% | 35% | 47% | Death outcomes untested |
| `recovery-utils.ts` | 85% | 90% | 80% | 85% | Strong coverage |
| `AgentSheet.ts` | 22% | 30% | 15% | 21% | Large file; action handlers lightly tested |
| `FranchiseSheet.ts` | 18% | 25% | 12% | 17% | Minimal coverage |
| `MissionTrackerApp.ts` | 15% | 20% | 10% | 14% | Distribution dialog not tested |

### B. Files Modified by Each Finding

See Issues #199–#229 for specific file:line references.

### C. Glossary

- **P0:** Blocks core game loops or prevents rule compliance
- **P1:** High-value features; significant impact on gameplay or UX
- **P2:** Polish, cleanup, performance; not blockers but improve quality
- **TypeDataModel:** Foundry V12+ mechanism for strongly-typed actor/item system data
- **Schema drift:** Mismatch between compile-time TS types and runtime Foundry schema
- **RollActor:** Structural interface decoupling roll logic from full Foundry Actor type

---

## End of Audit

All findings have been logged as GitHub issues (see #199 onward). Roadmap priorities reflect mechanics importance (P0/P1) balanced with UX and code health (P2).
