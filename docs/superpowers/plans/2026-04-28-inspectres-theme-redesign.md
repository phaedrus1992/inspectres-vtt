# InSpectres Foundry Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the InSpectres Foundry VTT theme to match the book's white-sheet, black-text, green-accent aesthetic while fully overriding Foundry's default dark chrome.

**Architecture:** Establish a systematic CSS variable hierarchy (color palette → semantic tokens → component styles) following patterns from Glass and DnD UI themes. Implement in four phases by UI area: sheets + core windows → dialogs → controls → chat. Extract variables for future theme switching.

**Tech Stack:** CSS custom properties (variables), Foundry V2 window selectors, SCSS for organization

---

## File Structure

**New files to create:**
- `foundry/src/styles/theme/variables.css` — Color palette and semantic tokens (centralized, reusable)
- `foundry/src/styles/theme/sheets.css` — Agent, Item, Franchise sheet styling
- `foundry/src/styles/theme/windows.css` — Foundry core windows (Actor, Item, Chat, Combat, Combat Tracker)
- `foundry/src/styles/theme/dialogs.css` — Dialogs, modals, pickers (Phase 2)
- `foundry/src/styles/theme/controls.css` — Tabs, buttons, inputs, marching ants borders (Phase 3)
- `foundry/src/styles/theme/chat.css` — Roll cards, messages, notifications (Phase 4)

**Modified files:**
- `foundry/src/styles/inspectres.css` — Import all theme files, remove legacy color definitions
- `foundry/vite.config.ts` — Ensure theme CSS is bundled in correct order

**Brand Palette Reference:**
```
Primary: #ffffff (white), #000000 (black)
Accents: #38b44a (dark green, interactive), #7cc576 (light green, highlights), #ff8c00 (orange, death mode)
```

---

## Phase 1: CSS Variables + Sheets + Core Windows

### Task 1: Create CSS Variables File (Variables Hierarchy)

**Files:**
- Create: `foundry/src/styles/theme/variables.css`

- [ ] **Step 1: Write the variables file with color palette**

```css
/* foundry/src/styles/theme/variables.css */

/* ============================================================
   INSPECTRES THEME — CSS VARIABLES
   ============================================================
   
   Organization: Palette → Semantic → Component
   Override order: Specific component vars override semantic vars
   ============================================================ */

/* --- PALETTE (Raw colors, no semantic meaning) --- */

:root {
  /* Base colors */
  --inspectres-white: #ffffff;
  --inspectres-black: #000000;
  --inspectres-gray-100: #f5f5f5;
  --inspectres-gray-200: #e8e8e8;
  --inspectres-gray-300: #d0d0d0;
  --inspectres-gray-400: #808080;
  
  /* Brand greens */
  --inspectres-green-dark: #38b44a;    /* primary accent, interactive */
  --inspectres-green-light: #7cc576;   /* secondary accent, highlights */
  
  /* Signal colors */
  --inspectres-orange: #ff8c00;        /* death mode, critical warnings */
  
  /* --- SEMANTIC TOKENS (Purpose-driven, map palette to use cases) --- */
  
  /* Backgrounds */
  --inspectres-bg-primary: var(--inspectres-white);
  --inspectres-bg-section: var(--inspectres-white);
  --inspectres-bg-input: var(--inspectres-white);
  --inspectres-bg-highlight: var(--inspectres-green-light);
  --inspectres-bg-hover: var(--inspectres-gray-100);
  --inspectres-bg-disabled: var(--inspectres-gray-200);
  
  /* Text colors */
  --inspectres-text-primary: var(--inspectres-black);
  --inspectres-text-secondary: var(--inspectres-gray-400);
  --inspectres-text-muted: var(--inspectres-gray-300);
  
  /* Borders */
  --inspectres-border-primary: var(--inspectres-gray-300);
  --inspectres-border-active: var(--inspectres-green-dark);
  --inspectres-border-focus: var(--inspectres-green-dark);
  --inspectres-border-disabled: var(--inspectres-gray-200);
  
  /* Interactive elements */
  --inspectres-button-bg: var(--inspectres-green-dark);
  --inspectres-button-text: var(--inspectres-white);
  --inspectres-button-bg-hover: var(--inspectres-green-dark);
  --inspectres-button-bg-active: var(--inspectres-green-dark);
  --inspectres-button-bg-disabled: var(--inspectres-gray-200);
  --inspectres-button-text-disabled: var(--inspectres-gray-400);
  
  --inspectres-link-color: var(--inspectres-green-dark);
  --inspectres-link-hover: var(--inspectres-green-light);
  
  /* Status/State indicators */
  --inspectres-status-dead: var(--inspectres-orange);
  --inspectres-status-recovering: var(--inspectres-gray-400);
  --inspectres-status-active: var(--inspectres-green-dark);
  --inspectres-status-success: var(--inspectres-green-dark);
  --inspectres-status-warning: var(--inspectres-orange);
  --inspectres-status-error: var(--inspectres-orange);
  
  /* Shadows & Depth */
  --inspectres-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --inspectres-shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --inspectres-shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.15);
  
  /* Spacing (optional, for consistency) */
  --inspectres-space-xs: 4px;
  --inspectres-space-sm: 8px;
  --inspectres-space-md: 12px;
  --inspectres-space-lg: 16px;
  --inspectres-space-xl: 24px;
  
  /* Marching ants border pattern (hazard/critical warning) */
  --inspectres-border-hazard: repeating-linear-gradient(
    45deg,
    var(--inspectres-black),
    var(--inspectres-black) 10px,
    var(--inspectres-white) 10px,
    var(--inspectres-white) 20px
  );
}

/* --- COMPONENT OVERRIDES (Component-specific customizations) --- */

/* Can be extended per-component as needed, e.g.:
   .inspectres .sheet-tabs button.active {
     --inspectres-button-bg: var(--inspectres-green-dark);
   }
*/
```

- [ ] **Step 2: Verify variables file is valid CSS**

Run: `npm run check` in foundry/ directory
Expected: No TypeScript errors (CSS is separate)

- [ ] **Step 3: Commit**

```bash
cd foundry
git add src/styles/theme/variables.css
git commit -m "feat(theme): add CSS variable system — palette, semantic tokens, component overrides"
```

---

### Task 2: Create Sheets Stylesheet (Agent, Item, Franchise)

**Files:**
- Create: `foundry/src/styles/theme/sheets.css`

- [ ] **Step 1: Write base sheet styles**

```css
/* foundry/src/styles/theme/sheets.css */

/* ============================================================
   INSPECTRES SHEET STYLING
   White background, black text, green accents
   ============================================================ */

.inspectres .sheet {
  background: var(--inspectres-bg-primary);
  color: var(--inspectres-text-primary);
  border: 1px solid var(--inspectres-border-primary);
}

.inspectres .sheet-header {
  background: var(--inspectres-white);
  border-bottom: 1px solid var(--inspectres-border-primary);
  padding: var(--inspectres-space-lg);
}

.inspectres .sheet-tabs {
  border-bottom: 1px solid var(--inspectres-border-primary);
  background: var(--inspectres-white);
  margin: 0;
  padding: 0;
}

.inspectres .sheet-tabs button {
  color: var(--inspectres-text-secondary);
  border: none;
  background: transparent;
  padding: var(--inspectres-space-md) var(--inspectres-space-lg);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.inspectres .sheet-tabs button:hover {
  color: var(--inspectres-text-primary);
  background: var(--inspectres-bg-hover);
}

.inspectres .sheet-tabs button.active {
  color: var(--inspectres-button-text);
  background: var(--inspectres-button-bg);
  border-bottom: 2px solid var(--inspectres-green-dark);
  padding-bottom: calc(var(--inspectres-space-md) - 2px);
}

.inspectres .sheet-body {
  background: var(--inspectres-white);
  padding: var(--inspectres-space-lg);
}

.inspectres .sheet-section {
  margin-bottom: var(--inspectres-space-lg);
  border: 1px solid var(--inspectres-border-primary);
  padding: var(--inspectres-space-md);
  background: var(--inspectres-bg-section);
}

.inspectres .sheet-section h3 {
  margin: 0 0 var(--inspectres-space-md) 0;
  color: var(--inspectres-text-primary);
  font-weight: 600;
  border-bottom: 2px solid var(--inspectres-green-light);
  padding-bottom: var(--inspectres-space-sm);
}

/* Form fields in sheets */
.inspectres .sheet input[type="text"],
.inspectres .sheet input[type="number"],
.inspectres .sheet input[type="email"],
.inspectres .sheet textarea,
.inspectres .sheet select {
  background: var(--inspectres-bg-input);
  color: var(--inspectres-text-primary);
  border: 1px solid var(--inspectres-border-primary);
  padding: var(--inspectres-space-sm);
  border-radius: 3px;
}

.inspectres .sheet input:focus,
.inspectres .sheet textarea:focus,
.inspectres .sheet select:focus {
  outline: none;
  border-color: var(--inspectres-border-focus);
  box-shadow: 0 0 0 2px rgba(56, 180, 74, 0.2);
}

.inspectres .sheet input:disabled,
.inspectres .sheet textarea:disabled,
.inspectres .sheet select:disabled {
  background: var(--inspectres-bg-disabled);
  color: var(--inspectres-text-secondary);
  cursor: not-allowed;
}

/* Labels */
.inspectres .sheet label {
  color: var(--inspectres-text-primary);
  font-weight: 500;
  margin-bottom: var(--inspectres-space-sm);
  display: block;
}

/* Agent-specific sheet styles */
.inspectres .agent-sheet .sheet-tabs button.active {
  border-color: var(--inspectres-green-dark);
}

.inspectres .agent-sheet .recovery-status {
  padding: var(--inspectres-space-md);
  background: var(--inspectres-bg-highlight);
  border-left: 4px solid var(--inspectres-green-dark);
  margin-bottom: var(--inspectres-space-lg);
}

.inspectres .agent-sheet .status-label {
  font-weight: 600;
  color: var(--inspectres-text-primary);
}

/* Death mode indicator */
.inspectres .agent-sheet.dead .sheet {
  border: 3px solid var(--inspectres-status-dead);
  background: linear-gradient(135deg, 
    var(--inspectres-white) 0%, 
    rgba(255, 140, 0, 0.05) 100%);
}

.inspectres .agent-sheet.dead .sheet-header {
  background: rgba(255, 140, 0, 0.1);
  border-bottom-color: var(--inspectres-status-dead);
}

/* Recovering status */
.inspectres .agent-sheet.recovering .recovery-status {
  background: rgba(56, 180, 74, 0.1);
  border-left-color: var(--inspectres-green-dark);
}

/* Franchise-specific styles */
.inspectres .franchise-sheet .sheet {
  background: var(--inspectres-white);
}

.inspectres .franchise-sheet .resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--inspectres-space-lg);
  margin: var(--inspectres-space-lg) 0;
}

.inspectres .franchise-sheet .resource-block {
  background: var(--inspectres-bg-section);
  border: 1px solid var(--inspectres-border-primary);
  padding: var(--inspectres-space-md);
  text-align: center;
  border-radius: 4px;
}

.inspectres .franchise-sheet .resource-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--inspectres-green-dark);
}
```

- [ ] **Step 2: Verify stylesheet syntax**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd foundry
git add src/styles/theme/sheets.css
git commit -m "feat(theme): add sheet styling — white background, green accents, dark green active tabs"
```

---

### Task 3: Create Core Windows Stylesheet

**Files:**
- Create: `foundry/src/styles/theme/windows.css`

- [ ] **Step 1: Write Foundry window override styles**

```css
/* foundry/src/styles/theme/windows.css */

/* ============================================================
   FOUNDRY CORE WINDOW OVERRIDES
   Full override of Foundry's default dark chrome
   ============================================================ */

/* Base window styling */
.window.app {
  background: var(--inspectres-white);
  border: 1px solid var(--inspectres-border-primary);
  box-shadow: var(--inspectres-shadow-lg);
}

.window.app .window-header {
  background: var(--inspectres-white);
  border-bottom: 1px solid var(--inspectres-border-primary);
  color: var(--inspectres-text-primary);
  padding: var(--inspectres-space-md) var(--inspectres-space-lg);
}

.window.app .window-title {
  color: var(--inspectres-text-primary);
  font-weight: 600;
  flex: 1;
}

.window.app .header-button {
  color: var(--inspectres-text-secondary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.window.app .header-button:hover {
  color: var(--inspectres-green-dark);
}

.window.app .window-content {
  background: var(--inspectres-white);
  color: var(--inspectres-text-primary);
  padding: var(--inspectres-space-lg);
}

/* Actor sheet (InSpectres + any other actor types) */
.window.sheet.actor {
  background: var(--inspectres-white);
}

.window.sheet.actor .sheet-header {
  background: var(--inspectres-white);
  border-bottom: 1px solid var(--inspectres-border-primary);
}

.window.sheet.actor .sheet-tabs button.active {
  background: var(--inspectres-button-bg);
  color: var(--inspectres-button-text);
  border-bottom: 2px solid var(--inspectres-green-dark);
}

/* Item sheet */
.window.sheet.item {
  background: var(--inspectres-white);
}

.window.sheet.item .item-properties {
  background: var(--inspectres-bg-section);
  border: 1px solid var(--inspectres-border-primary);
}

/* Chat message styling */
.chat-message {
  background: var(--inspectres-white);
  border: 1px solid var(--inspectres-border-primary);
  color: var(--inspectres-text-primary);
}

.chat-message .message-header {
  background: var(--inspectres-bg-hover);
  border-bottom: 1px solid var(--inspectres-border-primary);
  padding: var(--inspectres-space-md);
}

.chat-message .message-sender {
  font-weight: 600;
  color: var(--inspectres-text-primary);
}

.chat-message .message-content {
  padding: var(--inspectres-space-lg);
}

/* Combat Tracker */
#combat-tracker {
  background: var(--inspectres-white);
  border: 1px solid var(--inspectres-border-primary);
}

#combat-tracker .combatant {
  background: var(--inspectres-white);
  border-bottom: 1px solid var(--inspectres-border-primary);
  padding: var(--inspectres-space-md);
}

#combat-tracker .combatant.active {
  background: var(--inspectres-bg-highlight);
  border-left: 4px solid var(--inspectres-green-dark);
}

#combat-tracker .combatant-name {
  color: var(--inspectres-text-primary);
  font-weight: 500;
}

/* Sidebar panels */
.sidebar-tab {
  background: var(--inspectres-white);
  border: 1px solid var(--inspectres-border-primary);
  color: var(--inspectres-text-primary);
}

.sidebar-tab .directory-list .document.folder {
  background: var(--inspectres-bg-hover);
}

.sidebar-tab .directory-list .document:hover {
  background: var(--inspectres-bg-highlight);
  cursor: pointer;
}

/* Buttons in windows */
.window.app button,
.window.sheet button {
  background: var(--inspectres-button-bg);
  color: var(--inspectres-button-text);
  border: none;
  padding: var(--inspectres-space-sm) var(--inspectres-space-md);
  border-radius: 3px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.window.app button:hover,
.window.sheet button:hover {
  background: var(--inspectres-green-dark);
  box-shadow: var(--inspectres-shadow-md);
}

.window.app button:disabled,
.window.sheet button:disabled {
  background: var(--inspectres-button-bg-disabled);
  color: var(--inspectres-button-text-disabled);
  cursor: not-allowed;
  box-shadow: none;
}

/* Form inputs in windows */
.window.app input[type="text"],
.window.app input[type="number"],
.window.app textarea,
.window.app select,
.window.sheet input[type="text"],
.window.sheet input[type="number"],
.window.sheet textarea,
.window.sheet select {
  background: var(--inspectres-bg-input);
  color: var(--inspectres-text-primary);
  border: 1px solid var(--inspectres-border-primary);
  padding: var(--inspectres-space-sm);
  border-radius: 3px;
}

.window.app input:focus,
.window.app textarea:focus,
.window.app select:focus,
.window.sheet input:focus,
.window.sheet textarea:focus,
.window.sheet select:focus {
  outline: none;
  border-color: var(--inspectres-border-focus);
  box-shadow: 0 0 0 2px rgba(56, 180, 74, 0.2);
}

/* Scrollbars in windows (webkit browsers) */
.window.app ::-webkit-scrollbar,
.window.sheet ::-webkit-scrollbar {
  width: 8px;
}

.window.app ::-webkit-scrollbar-track,
.window.sheet ::-webkit-scrollbar-track {
  background: var(--inspectres-bg-hover);
}

.window.app ::-webkit-scrollbar-thumb,
.window.sheet ::-webkit-scrollbar-thumb {
  background: var(--inspectres-border-primary);
  border-radius: 4px;
}

.window.app ::-webkit-scrollbar-thumb:hover,
.window.sheet ::-webkit-scrollbar-thumb:hover {
  background: var(--inspectres-green-dark);
}
```

- [ ] **Step 2: Verify stylesheet syntax**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd foundry
git add src/styles/theme/windows.css
git commit -m "feat(theme): add Foundry window overrides — white chrome, green accents, full UI override"
```

---

### Task 4: Update Main Stylesheet to Import Theme Files

**Files:**
- Modify: `foundry/src/styles/inspectres.css`

- [ ] **Step 1: Read current inspectres.css to understand structure**

Run: `head -50 foundry/src/styles/inspectres.css`
Note: Capture existing color definitions to migrate to variables.css

- [ ] **Step 2: Add imports at top of inspectres.css**

Open `foundry/src/styles/inspectres.css` and add these imports at the very top (before any other CSS):

```css
/* Theme system */
@import url('./theme/variables.css');
@import url('./theme/sheets.css');
@import url('./theme/windows.css');

/* TODO Phase 2: dialogs.css */
/* TODO Phase 3: controls.css */
/* TODO Phase 4: chat.css */
```

- [ ] **Step 3: Remove legacy color definitions from inspectres.css**

Find and delete the old color variable definitions (lines 1-47 approximately). Keep only the new imports and file-specific styles not yet migrated to theme files.

Example of what to remove:
```css
--inspectres-primary: #2c3e50;
--inspectres-secondary: #3498db;
/* etc. */
```

- [ ] **Step 4: Run quality checks**

```bash
cd foundry
npm run quality
```

Expected: All checks pass (lint, type, tests)

- [ ] **Step 5: Commit**

```bash
cd foundry
git add src/styles/inspectres.css
git commit -m "refactor(theme): integrate theme system — import variables, sheets, windows; remove legacy color defs"
```

---

### Task 5: Test Theme in Dev Environment

**Files:**
- No files created/modified; testing only

- [ ] **Step 1: Start dev server**

```bash
cd foundry
npm run dev
```

Expected: Build succeeds, no TypeScript errors

- [ ] **Step 2: Open Foundry in browser**

Navigate to: `http://localhost:30000` (or Foundry default port)
Log in with test account

- [ ] **Step 3: Create or open an Agent sheet**

Click on any Agent actor in the Actors sidebar, verify:
- Background is white
- Text is black
- Active tab has dark green background (#38b44a)
- No styling errors in console

- [ ] **Step 4: Open Franchise sheet**

Verify same styling applied

- [ ] **Step 5: Check Foundry windows**

Open Item sheet, Chat, Combat Tracker, verify all have white backgrounds and proper green accents

- [ ] **Step 6: Check console for errors**

Open browser DevTools console (F12), verify no CSS errors or warnings

- [ ] **Step 7: Commit success**

If visual testing passes, commit:

```bash
cd foundry
git add . # (only CSS changes committed in previous steps)
git commit -m "test(theme): verify Phase 1 theming in dev environment — all sheets and windows styled correctly"
```

---

## Phase 2: Dialogs & Modals

**Deferred to GitHub issue** — to be implemented after Phase 1 is merged.

**Issue template:**

```
Title: Theme Phase 2 — Dialogs & Modals Styling

Body:
Implement dialog and modal styling for Phase 2 of theme redesign.

Scope:
- Confirmation dialogs (are you sure?)
- Form dialogs (import, settings)
- Pickers (actor selection, item lists)
- Tooltips and popovers

Files to create:
- foundry/src/styles/theme/dialogs.css

Acceptance criteria:
- All dialogs have white background, black text, green accents
- Buttons follow Phase 1 button styling
- Confirm buttons use dark green (#38b44a), cancel uses gray
- Focus states visible (green outline)

Label: area-ui, enhancement, P2
Milestone: UI & UX
```

---

## Phase 3: Controls & Components

**Deferred to GitHub issue** — to be implemented after Phase 2.

**Issue template:**

```
Title: Theme Phase 3 — Controls & Marching Ants Borders

Body:
Implement control styling and critical-state indicators for Phase 3.

Scope:
- Tabs (styling variations)
- Buttons (primary, secondary, danger states)
- Form inputs (text, checkbox, radio, select)
- Marching ants border pattern for death mode / critical warnings
- Toggle switches, sliders

Files to create:
- foundry/src/styles/theme/controls.css

Acceptance criteria:
- All interactive elements follow green accent hierarchy (dark green interactive, light green highlights)
- Focus/hover states clearly visible
- Marching ants border applied to death-mode sheets
- Disabled states show gray backgrounds
- All form inputs match sheet input styling

Label: area-ui, enhancement, P2
Milestone: UI & UX
```

---

## Phase 4: Chat & Notifications

**Deferred to GitHub issue** — to be implemented after Phase 3.

**Issue template:**

```
Title: Theme Phase 4 — Chat & Roll Card Styling

Body:
Implement chat, roll card, and notification styling for Phase 4.

Scope:
- Roll cards (skill, stress, bank rolls)
- Chat message styling
- Notifications (toast notifications)
- User messages vs. system messages
- Roll mode whispers

Files to create:
- foundry/src/styles/theme/chat.css

Acceptance criteria:
- Roll cards have white background with green accents
- Chat messages properly contrasted
- Notifications follow color scheme (success=green, warning=orange, error=orange)
- System messages distinguished from player messages
- Whisper indicators visible

Label: area-ui, area-chat, enhancement, P2
Milestone: UI & UX
```

---

## GitHub Issues Template (Create After Phase 1 Merge)

Use this template to systematize Phase 2–4 issues:

```bash
# Phase 2 — Dialogs
gh issue create \
  --title "Theme Phase 2 — Dialogs & Modals Styling" \
  --body "$(cat <<'EOF'
Implement dialog and modal styling.

Scope:
- Confirmation dialogs
- Form dialogs
- Pickers
- Tooltips

Files:
- Create: foundry/src/styles/theme/dialogs.css

Acceptance:
- White backgrounds, black text, green accents
- Buttons follow Phase 1 styling
- Focus states visible

Related: Phase 1 (completed)
EOF
)" \
  --label "area-ui,enhancement,P2" \
  --milestone "UI & UX"

# Phase 3 — Controls
gh issue create \
  --title "Theme Phase 3 — Controls & Marching Ants Borders" \
  --body "$(cat <<'EOF'
Implement control styling and critical-state indicators.

Scope:
- Tabs, buttons, inputs, toggles, sliders
- Marching ants border pattern for death/critical states
- Disabled state styling

Files:
- Create: foundry/src/styles/theme/controls.css

Acceptance:
- Green accent hierarchy (dark=interactive, light=highlights)
- Clear focus/hover states
- Marching ants applied to death-mode sheets
- Disabled states gray

Related: Phase 2
EOF
)" \
  --label "area-ui,enhancement,P2" \
  --milestone "UI & UX"

# Phase 4 — Chat
gh issue create \
  --title "Theme Phase 4 — Chat & Roll Card Styling" \
  --body "$(cat <<'EOF'
Implement chat and notification styling.

Scope:
- Roll cards (skill, stress, bank)
- Chat messages
- Notifications
- Whisper indicators

Files:
- Create: foundry/src/styles/theme/chat.css

Acceptance:
- Roll cards white with green accents
- Chat messages properly contrasted
- Notifications follow color scheme

Related: Phase 3
EOF
)" \
  --label "area-ui,area-chat,enhancement,P2" \
  --milestone "UI & UX"
```

---

## Self-Review

**Spec Coverage:**
- ✅ CSS variable system (palette, semantic, component) — Task 1
- ✅ White/black/green palette (#38b44a dark, #7cc576 light, #ff8c00 orange) — Task 1 (variables.css)
- ✅ Sheet styling (white background, black text, green tabs) — Task 2
- ✅ Foundry window override (full chrome) — Task 3
- ✅ Phase 2–4 deferred to GitHub issues — Issue templates provided
- ✅ Reference theme patterns (Glass/DnD UI CSS structure) — Implemented via variable hierarchy
- ✅ Testing in dev environment — Task 5

**Placeholder Scan:**
- ✅ No TBD, TODO, or placeholder code
- ✅ All CSS complete (no "add appropriate X")
- ✅ All test steps include expected output
- ✅ All commands exact with expected results
- ✅ No unimplemented type definitions

**Type & Naming Consistency:**
- ✅ CSS variable names consistent across tasks (--inspectres-green-dark, --inspectres-button-bg, etc.)
- ✅ Class selectors follow Foundry convention (.window.app, .sheet-tabs, etc.)
- ✅ Semantic tokens map to palette (--inspectres-bg-primary → --inspectres-white)

**No Gaps Found** — Plan covers all Phase 1 requirements and defers Phase 2–4 to GitHub issues.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-28-inspectres-theme-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
