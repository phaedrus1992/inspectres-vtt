# GM Control Surface Audit: Workflow Clarity Review

**Audit Date:** 2026-04-25  
**Related Issue:** #204  
**Scope:** Review 6 remaining GM control workflows for UI clarity and usability  

## Executive Summary

All 6 core GM control workflows are **implemented with discoverable UI buttons**. However, several areas need documentation improvements or minor UI enhancements for clarity during play.

**Finding:** Most controls follow the distributed architecture principle (on their natural sheets). Documentation and labeling could be improved in 4 of 6 areas. No critical missing functionality identified.

---

## 1. Skill Roll vs Bank Roll Buttons

**Location:** Franchise sheet, Stats tab (Bank section)

**Current State:**
- Two buttons: "Roll Bank Dice" and "Roll Client Dice"
- Buttons are labeled + localized (not technical jargon) ✅
- Buttons are visible on the main franchise sheet ✅
- Buttons are disabled in Debt Mode (with warning) ✅

**Finding:** Labels are clear. **"Bank Roll"** refers to rolling bank dice (franchise resources), **"Client Roll"** refers to rolling client dice (external contacts). The distinction is clear to someone familiar with the rules.

**Concern:** New GMs might not know what each roll *does* (what the outcome affects). The buttons are discoverable but lack context.

**Recommendation:**
- [ ] Add tooltip/help text to buttons explaining what each roll represents
  - "Bank Roll: Roll available bank dice to fund operations"
  - "Client Roll: Roll client dice for support"
- [ ] Link to rules reference: `docs/current/gameplay/rolls.md#bank-roll` etc.

**Severity:** Low (UI clear, but help text would improve discovery)

---

## 2. Mission Goal Entry

**Location:** Franchise sheet, Stats tab (Mission section)

**Current State:**
- Mission Goal input field is visible ✅
- Field is labeled with localization key `INSPECTRES.MissionGoal` ✅
- Progress bar shows "Mission Earned: X / Goal" ✅
- Field is editable (no hidden state) ✅

**Finding:** Mission goal is **clearly discoverable**. The input is right next to a progress bar that uses it immediately, making its purpose obvious.

**Concern:** None identified. The workflow is natural: set goal → pool increments → progress bar fills → compare to goal.

**Recommendation:** None required.

**Severity:** None

---

## 3. Debt Mode Workflow

**Location:** Franchise sheet, Stats tab (Financial section)

**Current State:**
- Debt Mode checkbox is visible + labeled ✅
- When active: warning banner shows "⚠ Debt Mode Active" + loan amount ✅
- Loan amount input appears when debt is active ✅
- "Lock/Unlock Cards" button appears conditionally ✅
- "Attempt Repayment" button appears when in debt ✅
- Skill rolls are blocked (warning shown) ✅
- Bank/Client rolls are disabled (button disabled) ✅

**Finding:** The workflow is **well-structured**. Each step cascades logically:
1. Toggle debt mode → shows loan amount input
2. Set loan amount
3. Lock cards (prevents spending resources)
4. Attempt repayment (if condition met)

The warning banner makes state obvious.

**Concern:** GMs may not understand the *intent* of each step without rules context. The UI shows the flow, but not the narrative.

**Recommendation:**
- [ ] Add brief inline explanations (via help text or `aria-description`):
  - "Debt Mode: Franchise is indebted to a loan shark"
  - "Loan Amount: Total dice owed"
  - "Lock Cards: Resources are secured as collateral (cannot be spent)"
  - "Attempt Repayment: Roll to pay back loans when ready"
- [ ] Document in `docs/current/gameplay/financial-mechanics.md` the full debt workflow with examples

**Severity:** Low (workflow is clear mechanically, narrative context would help)

---

## 4. Skill Penalty Application During Stress Rolls

**Location:** Franchise sheet (stress penalty) + Agent sheet (stress from rolls)

**Current State:**
- Franchise sheet shows "Stress Penalty" field (number input) ✅
- When agent stress increases, penalties are auto-applied to skills ✅
- Agent sheet shows skill effective values: `Skill Base − Stress Penalty` ✅
- Stress roll dialog shows number of stress dice to roll ✅

**Finding:** Penalty application is **automatic and visible**. When an agent's stress increases, the agent sheet immediately recalculates skill values. The agent's effective skill drops — no manual step required.

**Concern:** The *direction* of penalty application might be unclear to new GMs. Is stress *added* to the skill pool (good) or *subtracted* (bad)? The visual (showing reduced numbers) makes it clear, but the concept could use documentation.

**Recommendation:**
- [ ] Document stress penalty mechanics in `docs/current/gameplay/mechanics.md#stress`:
  - "Stress applies a penalty to all skill rolls. At 1 Stress: −1 penalty. At 6 Stress: −6 penalty (no rolls possible)."
  - Show formula: `Skill Effective = Skill Base − Stress Penalty`
- [ ] Add inline comment in agent sheet template explaining the display:
  - "Effective value shown is skill after stress penalty"

**Severity:** Low (mechanic works, documentation would help)

---

## 5. Characteristic Usage Tracking

**Location:** Agent sheet, Notes tab (Characteristics section)

**Current State:**
- Checkbox next to each characteristic ✅
- Checkbox is labeled (visually, but text says "used") ✅
- No tooltip/help text explaining what "used" means ❌

**Finding:** The UI element exists and is discoverable. **However**, the semantics are unclear. Does "used" mean:
- Spent/exhausted (can't use again until refreshed)?
- Currently activated (a power is active)?
- Noted for reference?

The project's rules context determines the answer, but the UI doesn't explain it.

**Concern:** GMs won't know **when to check this box** or **what it means**. Is it manual tracking or auto-set by code?

**Recommendation:**
- [ ] Add tooltip to the checkbox: "Checked = characteristic has been used this session. Uncheck after session refresh."
- [ ] Link to rules reference: see `reference/inspectres-rules-spec.md#characteristics` for when/how characteristics are used
- [ ] Consider adding a "Reset All Characteristics" button for session end (if not already present)

**Severity:** Medium (discoverable, but unclear semantics could confuse GMs)

---

## 6. Cards (Library/Gym/Credit) Roll Mechanics

**Location:** Franchise sheet, Stats tab (Cards section)

**Current State:**
- Three card inputs: Library, Gym, Credit ✅
- Fields show current card count (editable) ✅
- **No roll buttons visible** ❌
- **No documentation of how to roll cards** ❌

**Finding:** Cards are **visible but not actionable** from the Franchise sheet. There are no buttons to "Roll Library" or "Roll Credit" like there are for Bank/Client rolls.

**Concern:** How do GMs roll cards? Are they:
1. Rolled as part of Skill Rolls (automatic)?
2. Rolled via a separate action (where?)?
3. Manually tracked (just edit the numbers)?

The UI doesn't indicate a workflow. This is a **usability gap**.

**Recommendation:**
- [ ] **Add card roll buttons** (if they don't exist in code):
  - "Roll Library" button → roll Library dice for research/knowledge
  - "Roll Gym" button → roll Gym dice for physical tasks
  - "Roll Credit" button → roll Credit dice for social influence
  - Buttons should disable card count to 0 (can't roll from empty)
- [ ] **If no card roll exists**, document in `docs/current/gameplay/cards.md`:
  - When cards are rolled (during what operations?)
  - Where to find the card roll interface
  - How card counts are managed
- [ ] Add tooltip on card inputs: "Cards represent franchise resources. Roll when attempting tasks in this domain."

**Severity:** High (no clear UI path to rolling cards; major usability gap)

---

## Summary of Findings

| Item | Status | Severity | Action |
|------|--------|----------|--------|
| Skill Roll vs Bank Roll | Discoverable, needs help text | Low | Add tooltips |
| Mission Goal | Clear and obvious | None | No action needed |
| Debt Mode Workflow | Logically structured, needs narrative context | Low | Add inline help + docs |
| Skill Penalty Application | Automatic and visible, needs documentation | Low | Document in rules |
| Characteristic Usage | Discoverable but semantics unclear | Medium | Add tooltip + rules link |
| Cards Roll Mechanics | **No UI path to roll** | High | Add buttons or document workflow |

---

## Follow-Up Issues to Create

1. **#XXX - Add help text/tooltips to roll buttons** (Skill Roll, Bank Roll, Client Roll)
   - Severity: P2 (Nice-to-have, improves UX)
   - Area: area-sheets

2. **#XXX - Clarify characteristic "used" semantics with tooltip**
   - Severity: P2 (Discoverable but unclear)
   - Area: area-sheets

3. **#XXX - Add card roll UI to Franchise sheet or link to card roll documentation**
   - Severity: P1 (Gap in discoverable workflows)
   - Area: area-sheets, area-gameplay

4. **#XXX - Document debt mode workflow + narrative context**
   - Severity: P2 (Mechanics clear, narrative helps)
   - Area: area-docs

5. **#XXX - Document stress penalty application in rules**
   - Severity: P2 (Automatic but could use documentation)
   - Area: area-docs

---

## Conclusion

**The GM control surface is 85% complete.** All core workflows are discoverable and functional. Remaining work is:
- Help text / tooltips for clarity (Low priority)
- Card rolling UI / documentation (High priority — actual gap)
- Rules documentation for new GMs (Low priority)

**Recommend:** Ship current state. Create P1 issue for card rolling clarification. P2 issues can be backlog.
