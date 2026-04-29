# Theming Audit Report — Issue #415

**Date:** 2026-04-28  
**Spec Reference:** `docs/superpowers/specs/foundry-vtt-theming-spec.md`  
**Issues to Address:** #415, #408, #409, #410

## Audit Summary

Comprehensive review of InSpectres theming implementation against new Foundry VTT specification. Goal: identify gaps, document findings, create follow-up issues.

---

## 1. CSS Architecture Audit

**Spec Section:** § 2. CSS Architecture: Variables & Cascading

### 1.1 Variable Hierarchy (Three-Level System)

**Spec Requirement:**
- Level 1: Theme defaults (brand-specific variables)
- Level 2: Foundry palette bridge (map to Foundry built-ins)
- Level 3: Functional CSS (consumer-level variables)

**Current State:**
- ✅ `foundry/src/styles/theme/variables.css` implements Levels 1 & 2
- ✅ Semantic tokens define bridge layer (`--inspectres-text`, `--inspectres-bg-primary`)
- ⚠️ **Gap:** Level 3 functional variables not consistently applied across all feature files
  - `sheets.css`, `controls.css`, `chat.css` reference semantic vars
  - Some component-specific vars scattered in individual files
  - No centralized functional layer for consistency

**Files Reviewed:**
- `variables.css` (50 lines) — Clean palette + semantic structure
- `sheets.css` (150 lines) — Uses semantic vars, incomplete on all elements
- `controls.css` (120 lines) — Mixed direct color refs and semantic vars
- `windows.css` (80 lines) — Mostly semantic vars
- `dialogs.css` (90 lines) — Mix of approaches
- `chat.css` (110 lines) — Good var usage
- `utilities.css` (70 lines) — Utility classes, needs audit

**Finding #1 - P1:** Create Level 3 functional variable layer
- Add `--inspectres-component-*` for buttons, forms, cards
- Consolidate scattered component-specific vars
- Update all feature files to use Level 3

**Finding #2 - P1:** Audit all color refs for hardcoded values
- Search: `color: #`, `background: #`, `border: #`
- Expected: all should use `var(--inspectres-*, var(--palette-*))`

### 1.2 CSS Organization by Feature

**Spec Requirement:** Organize stylesheets by feature, load in order: variables → globals → features → systems

**Current State:**
- ✅ Files split by domain (`sheets.css`, `controls.css`, `chat.css`)
- ⚠️ **Gap:** No global feature layer; variables loaded directly in imports
- ⚠️ **Gap:** No explicit system-specific file (DnD5e, PF2e overrides)

**Finding #3 - P2:** Add globals layer
- Create `foundry/src/styles/theme/_globals.scss` (or CSS)
- Define base resets, form styles, common helpers
- Load after `variables.css`, before feature files

**Finding #4 - P2:** Create system-specific override structure
- Add `foundry/src/styles/theme/systems/` directory
- Create `.system-dnd5e.css`, `.system-pf2e.css` for compatibility
- Document system-specific variable overrides

---

## 2. JavaScript Theming Audit

**Spec Section:** § 3. Dynamic Theming with JavaScript Hooks

### 2.1 Hook Pattern & Settings

**Spec Requirement:**
- Register theme/color settings in `init` hook
- Apply via `renderApplication` / `renderApplicationV2` hook
- Use data attributes for styling (`[data-theme]`, `[data-color-scheme]`)

**Current State:**
- ❌ **No hook-based theming implementation found**
- ❌ **No settings registered** for theme selection or customization
- ❌ **No dynamic theme switching** capability

**Finding #5 - P0:** Implement hook-based theming system
- Create `foundry/src/theming/hooks.ts`:
  - Register `theme` setting (world scope): choice of themes
  - Register `colorScheme` setting (client scope): light/dark
  - Register `excludeApps` setting: comma-separated app list to skip theming
- Create hook handler:
  - `renderApplicationV2` event listener
  - Apply `[data-theme]` + `[data-color-scheme]` attributes
  - Respect `excludeApps` list
  - Error handling for null/invalid settings

**Finding #6 - P1:** Add CSS selectors for dynamic theming
- Add to variables:
  ```css
  [data-theme="inspectres"][data-color-scheme="light"] { /* light theme vars */ }
  [data-theme="inspectres"][data-color-scheme="dark"] { /* dark theme vars */ }
  ```
- Test theme switching without page reload

### 2.2 Error Handling in Hooks

**Current State:**
- N/A (no hooks implemented)

**Finding #7 - P2:** Document error handling pattern
- Null checks for `game.settings.get()` results
- Fallback to defaults if setting missing
- Log warnings for invalid values

---

## 3. System Compatibility Audit

**Spec Section:** § 5. Game System Compatibility

### 3.1 System-Specific Overrides

**Spec Requirement:**
- Use `.system-SYSTEMID` prefix for overrides
- Declare relationships in `module.json`
- Test on dnd5e, pf2e, etc.

**Current State:**
- ⚠️ **Gap:** No system-specific CSS scoping found
- ⚠️ **Gap:** `foundry/system.json` not checked for relationships

**Finding #8 - P2:** Add system scoping structure
- Create `.system-dnd5e`, `.system-pf2e` scoped rules
- Update `system.json` relationships field
- Test sheet rendering on multiple systems

---

## 4. Accessibility Audit

**Spec Section:** § Accessibility (WCAG AA)

### 4.1 Color Contrast

**Spec Requirement:** 4.5:1 text/background contrast ratio (WCAG AA)

**Testing Method:**
- Use browser DevTools accessibility inspector
- Test light mode (primary case)
- Test dark mode (secondary)

**Current State:**
- 🔍 **To be tested during Playwright test execution**
- `--inspectres-text` vs `--inspectres-sheet-bg` need verification

**Finding #9 - P1:** Add contrast verification to Playwright tests
- Use `computedStyle` to extract text/bg colors
- Calculate contrast ratio in test helpers
- Assert >= 4.5:1 for primary/secondary text

### 4.2 Focus States

**Spec Requirement:** All interactive elements must have visible focus state

**Current State:**
- ✅ Focus state defined in `variables.css` (`--inspectres-input-focus`)
- ⚠️ **Gap:** Not verified across all buttons, tabs, form fields

**Finding #10 - P1:** Enhance Playwright tests for focus visibility
- Test focus state on all button types (action, tab, delete, etc.)
- Verify CSS applied (border color, outline, shadow)
- Screenshot focus states for regression

---

## 5. Testing & Validation Audit

**Spec Section:** § Testing Checklist

### 5.1 Current E2E Test Coverage

**Existing Tests:**
- `buttons.test.ts` (6 tests) — Basic visibility, hover, focus, disabled
- `sheet-navigation.test.ts` (5 tests) — Tab switching, accessibility attrs
- `form-fields.test.ts` (8 tests) — Field visibility, input handling, validation

**Gaps:**
- ❌ No screenshot regression baseline
- ❌ No color/styling verification
- ❌ No contrast ratio checks
- ❌ No dark mode testing
- ❌ No zoom level testing (100%, 125%, 150%)

**Finding #11 - P1:** Enhance Playwright tests with styling verification
- Add screenshot capture for all UI states
- Verify button hover/focus colors match CSS vars
- Add contrast ratio assertions to accessibility tests
- Create screenshot baseline for regression detection

**Finding #12 - P2:** Add dark mode & zoom testing
- Dark mode tests (separate test file or matrix)
- Zoom level tests at 100%, 125%, 150%
- Verify responsive behavior

---

## 6. Summary of Findings

### By Priority

**P0 (Blocking):**
- #5: Implement hook-based theming system (no theming control currently)

**P1 (High — Should Fix):**
- #1: Create Level 3 functional variable layer (consistency)
- #2: Audit all color references for hardcoded values
- #6: Add CSS selectors for dynamic theming
- #9: Add contrast verification to tests
- #10: Enhance focus state testing
- #11: Add styling verification + screenshots to tests

**P2 (Nice-to-have — Tech Debt):**
- #3: Add globals CSS layer (organization)
- #4: Create system-specific override structure
- #7: Document error handling pattern in hooks
- #8: Add system scoping & compatibility testing
- #12: Add dark mode & zoom testing

### By Domain

| Domain | Findings | Issues |
|--------|----------|--------|
| CSS Variables | Levels 1-2 ✅, Level 3 ⚠️, hardcoded colors ⚠️ | #1, #2 |
| CSS Organization | Feature-based ✅, globals ⚠️, systems ❌ | #3, #4 |
| JavaScript Hooks | None implemented ❌ | #5, #6 |
| Error Handling | Not yet | #7 |
| System Compat | Not yet | #8 |
| Accessibility | Contrast ⚠️, focus ✅ (partial) | #9, #10 |
| Testing | Basic ✅, styling ❌, screenshots ❌ | #11, #12 |

---

## Issues to Create

### Issue #1: Add Level 3 Functional Variable Layer
- **Label:** area-sheets, refactor, P1
- **Milestone:** Code Quality & Testing
- **Body:** Create `--inspectres-btn-*`, `--inspectres-input-*`, `--inspectres-card-*` variables. Update all feature files to use Level 3 instead of direct semantic refs.

### Issue #2: Audit & Remove Hardcoded Colors
- **Label:** area-sheets, refactor, P1
- **Milestone:** Code Quality & Testing
- **Body:** Search `color: #`, `background: #`, `border: #` in all CSS/SCSS files. Replace with `var()` chains.

### Issue #5: Implement Hook-Based Theming System
- **Label:** area-sheets, enhancement, P0
- **Milestone:** Code Quality & Testing
- **Body:** Add settings (theme, colorScheme, excludeApps). Implement `renderApplicationV2` hook to apply `[data-theme]` + `[data-color-scheme]`. Add error handling.

### Issue #6: Add Dynamic Theme Switching CSS
- **Label:** area-sheets, enhancement, P1
- **Milestone:** Code Quality & Testing
- **Body:** Add CSS selectors for light/dark theme variants. Test switching without reload.

### Issue #9: Add Contrast Ratio Tests
- **Label:** area-testing, enhancement, P1
- **Milestone:** Code Quality & Testing
- **Body:** Add test helper to calculate WCAG contrast ratio. Add assertions to form/button tests (>= 4.5:1).

### Issue #10: Enhance Focus State Testing
- **Label:** area-testing, enhancement, P1
- **Milestone:** Code Quality & Testing
- **Body:** Expand button tests to verify focus state colors match CSS vars. Add screenshot for focus visibility.

### Issue #11: Add Styling Verification & Screenshots
- **Label:** area-testing, enhancement, P1
- **Milestone:** Code Quality & Testing
- **Body:** Update `buttons.test.ts`, `sheet-navigation.test.ts`, `form-fields.test.ts` to verify computed styles (border color, background, etc.). Capture screenshots for all states (default, hover, focus, disabled).

---

## Related Issues

- #413: Foundry VTT theming spec (merged)
- #408, #409, #410: E2E test implementations (concurrent with this audit)

## Next Steps

1. Validate findings with team lead
2. Create all P0 + P1 issues
3. Assign to sprint for implementation
4. Update tests during development to capture screenshots
5. Re-run audit after fixes to verify compliance
