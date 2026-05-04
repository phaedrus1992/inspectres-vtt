# E2E Coverage Gap Inventory

**Status:** Discovery — feeds follow-up issues for future dev sprints. Tracks issue [#495](https://github.com/phaedrus1992/inspectres-vtt/issues/495).

## Purpose

Catalog every sheet, control, interaction, and lifecycle operation in the InSpectres system; mark each as covered, partially covered, or uncovered by the current E2E suite; and group uncovered items into discrete follow-up issues that can be worked independently.

This document does not propose test code. It is a planning artifact — implementation lands under the child issues it produces.

## Current E2E suite

Location: `foundry/src/__tests__/e2e/`

| File | Tests | Scope |
|------|-------|-------|
| `sheet-navigation.test.ts` | 6 | Tab visibility/structure, active tab styling, tab switching with panel transition, panel visibility, arrow-key keyboard nav (loosely asserted), ARIA tab roles + `aria-controls` |
| `form-fields.test.ts` | 7 | Input visibility/styling, value handling on a generic `input[type=text]`, focus on `system.bank`, required attribute (skipped — no required inputs), notes-tab textarea border, ARIA labelling sampled across the first 5 visible inputs (passes if any one of them carries a label) |
| `buttons.test.ts` | 7 | Sheet load, button visibility (first button), hover/focus/disabled state styling, contrast/font-size, generic click event |

Infrastructure:

- `fixtures.ts` — per-worker franchise sheet auto-open, console capture, ApplicationV2-tolerant `waitForFunction + getBoundingClientRect` pattern, login boilerplate, logout cleanup.
- `global-setup.ts` — Docker launch, v13/v14 matrix support, multi-user provisioning (one Foundry user per Playwright worker).
- `console-capture.ts` — buffer browser console for failure attachments.

Prior history (closed): #408 button states, #409 sheet navigation, #410 form fields, #460 v13/v14 matrix, #488 Docker pinning + matrix.

## Sheet inventory

System registers two `ActorSheetV2` classes in `foundry/src/init.ts`. **No `ItemSheetV2` is registered yet** — there are no item types declared in `system.json` (`documentTypes` is empty).

### Agent sheet (`foundry/src/agent/agent-sheet.hbs`, `AgentSheet.ts`)

Tabs: Stats, Notes.

Action handlers registered in `DEFAULT_OPTIONS.actions`:

| Action | Trigger | Tab |
|--------|---------|-----|
| `skillRoll` | dice button per skill | Stats |
| `stressRoll` | "Stress Roll" button | Stats |
| `skillIncrease` / `skillDecrease` | stepper +/− per skill | Stats |
| `toggleCool` | cool pip (non-weird agents) | Stats |
| `activatePower` | weird agent power button | Stats |
| `addCharacteristic` / `removeCharacteristic` | notes-tab list controls | Notes |
| `editPortrait` | header portrait click | Stats (header) |
| `reviveAgent` | recovery controls | Stats |
| `emergencyRecovery` | recovery controls | Stats |
| `overrideRecoveryDay` | recovery day input change | Stats |
| `restoreSkill` | per-skill restore (only when penalty + cool > 0) | Stats |

Conditional UI:

- Recovery banner (top of sheet) when status ∈ `{dead, recovering, returned}`
- Cool pips vs unlimited cool input — toggled by `system.isWeird` checkbox
- Weird power section — only when `isWeird`
- Skill penalty line + restore button — only when `skill.penalty > 0`
- Recovery-day override input — only when `daysOutOfAction > 0`
- Revive button — only when `isDead`
- Emergency Recovery button — only when no active recovery and not dead

Form-bound inputs (auto-submit via Foundry):

- `name` (header)
- `system.talent`
- `system.isWeird` (checkbox)
- `system.cool` (number, weird path)
- `system.characteristics.{n}.used` (checkbox, per row)
- `system.characteristics.{n}.text` (text, per row)

### Franchise sheet (`foundry/src/franchise/franchise-sheet.hbs`, `FranchiseSheet.ts`)

Tabs: Stats, Notes.

Action handlers:

| Action | Trigger | Visibility |
|--------|---------|------------|
| `bankRoll` | "Bank Roll" button | always (disabled while `debtMode`) |
| `clientRoll` | "Client Roll" button | always |
| `openMissionTracker` | "Open Mission Tracker" | always |
| `beginVacation` | "Begin Vacation" | GM, disabled when `missionPool === 0` |
| `advanceDay` / `regressDay` | day stepper | GM only |
| `toggleDebtMode` | GM debt control | GM only (Notes tab) |
| `toggleCardsLocked` | GM debt control | GM, only when `debtMode` |
| `attemptRepayment` | GM debt control | GM, only when `debtMode` |

Form-bound inputs:

- `name` (header)
- `system.cards.library` / `system.cards.gym` / `system.cards.credit` (numbers)
- `system.bank` (number)
- `system.missionGoal` (number)
- `system.description` (textarea, Notes tab)
- `system.debtMode` (checkbox, Notes tab)
- `system.loanAmount` (number, only when `debtMode`)

Conditional UI:

- Debt warning banner — when `debtMode`
- Day display section — GM only
- Loan amount input — when `debtMode`
- GM debt controls block — GM only
- Cards-locked + repayment buttons — GM + `debtMode` only

### Mission Tracker (`foundry/src/mission/mission-tracker.hbs`)

ApplicationV2 dialog opened from franchise sheet. Actions:

- `beginCleanUp` — GM only, when mission complete
- `endEarly` — GM only, when `missionPool > 0`

Progress bar reflects `missionPool / missionGoal`.

### Roll Card (`foundry/src/rolls/roll-card.hbs`)

Chat message template. Renders skill / bank / stress / client roll outcomes. Conditional sections per `rollType`. No interactive controls.

### Dialogs (DialogV2)

- **Skill roll dialog** (`foundry/src/agent/skill-roll-dialog.ts`) — opened by `skillRoll` action. Form input for franchise dice, requirement tier dropdown, "take 4" toggle.
- **Vacation dialog** (`foundry/src/agent/vacation-dialog.ts`) — opened during vacation flow.
- Likely confirm dialogs (Foundry built-ins) for revive, emergency recovery, debt toggles — to be inventoried during dialog test work.

## Control taxonomy

| Category | Examples in current sheets |
|----------|----------------------------|
| Text inputs | `name`, `system.talent`, `characteristics.*.text` |
| Number inputs | `system.cool`, `system.bank`, `system.cards.*`, `system.missionGoal`, `system.loanAmount`, recovery-day override |
| Checkboxes | `system.isWeird`, `system.debtMode`, `characteristics.*.used` |
| Textarea | `system.description` (Franchise/Notes) |
| Select / dropdown | None on actor sheets currently. Skill roll dialog may use one for requirement tier. |
| Stepper buttons | skill +/−, day +/− |
| Toggle pips | cool pips |
| Roll buttons | skill dice, stress, bank, client |
| List add/remove | characteristics list |
| Conditional action buttons | revive, emergency recovery, restore skill, repayment, lock/unlock cards |
| Image-action button | portrait edit |
| Native form widgets | `<details>`/`<summary>` (Franchise starting interview guide) |
| Custom elements | Not yet used in sheets (`stress-meter`, `skill-rank` patterns documented but not in production templates) |

## Lifecycle operations

**Not currently exercised by any E2E test** — every test starts from a fixture-created franchise actor.

| Operation | Documents | Known issue |
|-----------|-----------|-------------|
| Create Agent actor | `Actor.create({type: "agent"})` | **Throws a console error** — confirmed by user, no regression test |
| Create Franchise actor | `Actor.create({type: "franchise"})` | Fixture does this on every worker init; no explicit test |
| Delete actor | `actor.delete()` | Not tested |
| Duplicate actor | `actor.clone({}, {save: true})` | Not tested |
| Create Item | n/a (no item types yet) | Blocked on item registration |
| Sidebar create flow | `#actors .create-entry` | Not tested |
| Compendium import | pack → actor | Not tested |

## Gap matrix

✅ covered · 🟡 partial · ❌ uncovered

| Area | Sheet rendering | Tab switching | Form inputs | Action buttons | Persistence | Conditional UI | Dialogs | Lifecycle | a11y |
|------|----------------|---------------|-------------|----------------|-------------|----------------|---------|-----------|------|
| Agent | ❌ (only generic `.inspectres`) | 🟡 (only first 2 tabs) | 🟡 (only `system.bank` focused, generic text fill) | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 (ARIA on first 5 inputs) |
| Franchise | 🟡 (fixture opens it) | 🟡 (only first 2 tabs) | 🟡 (textarea border check, bank focus) | 🟡 (first button visibility) | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Mission Tracker | ❌ | n/a | n/a | ❌ | n/a | ❌ | ❌ | n/a | ❌ |
| Skill roll dialog | ❌ | n/a | ❌ | ❌ | ❌ | ❌ | ❌ | n/a | ❌ |
| Roll-card chat | ❌ | n/a | n/a | n/a | n/a | ❌ | n/a | n/a | ❌ |
| Item sheets | ❌ (none exist) | — | — | — | — | — | — | ❌ (registration missing) | — |
| Multi-actor / sockets | ❌ | — | — | — | — | — | — | — | — |
| Error states | ❌ | — | — | — | — | — | — | — | — |
| Custom elements | ❌ | — | — | — | — | — | — | — | — |

## Categorization → follow-up issues

Eleven child issues will be filed under #495 as the parent epic. All carry milestone **Code Quality & Testing**, type **enhancement** (or **bug** for the lifecycle one), and at least one area label per `CLAUDE.md`.

| # | Title | Priority | Area labels | Why |
|---|-------|----------|-------------|-----|
| 1 | Agent sheet — full control coverage | P2 | area-sheets, area-testing | Skill stepper, talent, cool pips/weird path, recovery banner conditional, all action buttons, restore-skill flow, characteristics list add/remove |
| 2 | Franchise sheet — full control coverage | P2 | area-sheets, area-testing | Cards/bank/mission-goal inputs, debt-mode toggle + GM controls, day stepper, all roll buttons. The "placeholder" e2e file is missing entirely. |
| 3 | Item sheets — registration + coverage | P2 | area-sheets, area-testing | No `ItemSheetV2` exists yet; needs `documentTypes` schema work first, then sheet, then tests |
| 4 | Lifecycle ops + agent creation regression | **P1** | area-character, area-testing | Includes the **known agent-creation console error**. Cover create/delete/duplicate for both actor types, plus sidebar create flow. |
| 5 | Dialogs and modals coverage | P2 | area-chat, area-testing | Skill roll DialogV2 (franchise dice, requirement tier, take-4), vacation dialog, mission tracker app, confirm dialogs |
| 6 | Form persistence + submit round-trip | P2 | area-sheets, area-testing | Verify name/talent/cool/bank/cards/description changes round-trip via `actor.update`; no silent drops; debounce behavior |
| 7 | Multi-actor / socket interactions | P2 | area-multiplayer, area-testing | Parallel sheet renders for two actors, mission tracker socket events, day-change broadcast effects |
| 8 | Error states + edge cases | P2 | area-testing | Validation failures (negative numbers, empty required), boundary values (cool > cap, days > 365), missing data (no power on weird agent), network/timeout simulation |
| 9 | Accessibility — keyboard + screen reader paths | P2 | area-sheets, area-testing | Full keyboard-only paths beyond tab-nav arrow keys; complete `aria-label` audit; focus-visible indicators on all action buttons; modal focus trap |
| 10 | Custom elements coverage | P2 | area-core, area-testing | Add tests for `AbstractFormInputElement` patterns once stress-meter / skill-rank widgets are wired into templates (currently spec-only) |
| 11 | Test infrastructure — page object models | P2 | area-testing, area-devtools | Sheet selector abstractions, fixture data factories for common actor states (debt mode, recovering agent, weird agent), reusable interaction helpers (fillSkill, toggleCool, openTab) |

Each issue should reference this document at the path above and include its row from the gap matrix as the acceptance scope.

## Out of scope for this discovery

- Implementation of any of the eleven follow-ups. They will be picked up via the standard sprint flow.
- Performance and load testing (large item lists, many actors). Worth tracking, but not part of "controls and interactions" as scoped by #495.
- Visual regression / screenshot diffing — separate concern.

## Verification of this discovery

1. The eleven child issues exist on GitHub, each has Priority + Area + Type labels and the **Code Quality & Testing** milestone.
2. Each is registered as a sub-issue of #495 via the GitHub sub-issues API.
3. #495's body has been updated to reflect the new scope and link the children.
4. This document is reachable from #495 via a path link.
5. `npm run quality` passes locally — no source changes, but pre-commit hooks should still be green.
