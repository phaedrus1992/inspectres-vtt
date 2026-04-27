# Implementation Plan: Issue #312 — Collaboration & Rolls Integration

**Composite Issue:** #312
**Sub-Issues:** #224 (Teamwork), #225 (Confessional), #231 (Private Life), #232 (Requirements Checker)
**Branch:** `feat/312-collaboration-rolls`
**Target:** Integrate 4 advanced roll modes with existing skill roll pipeline

---

## Progress

- **Phase 1 (Requirements Checker)** — ✅ COMPLETE
  - Extended `SkillRollAugmentation` with optional `requirementTier` field
  - Added requirement tier picker to skill roll dialog (Technology rolls only)
  - Implemented auto-fail gating: rolls insufficient for requirement automatically fail
  - Implemented defect logic: rare/exotic rolls = minTier - 1 trigger critical failure
  - Added requirement info to chat context for formatting
  - Added localization keys for requirement tiers and status messages
  - All existing tests pass (236 tests)
  - Build succeeds

---

---

## Executive Summary

Four P1 features share a common subsystem: augmentation pipeline in skill rolls. Each restricts or extends the base skill roll in distinct ways:

1. **Teamwork Assist** (#224): Helper rolls skill, transfers 1 die to recipient
2. **Confessional** (#225): Scene-bound, 1x per session, awards franchise die + characteristics tracking
3. **Private Life** (#231): Cool-only augmentation (no Card/Bank/Talent), no franchise earning
4. **Requirements Checker** (#232): Tech rolls may set requirement (4/5/6), auto-fail if unmet

**Existing Code:** Logic implemented in `/mission/{teamwork|confessional|requirements-checker}.ts` (pure functions, no UI).
**Missing:** Foundry integration, sheet UI, dialog wiring, chat formatting.

---

## Architecture Overview

### Current Skill Roll Pipeline

```
executeSkillRoll(agent, franchise, skillName)
  ↓
  buildSkillRollDialog(options)  ← augmentation config dialog
  ↓
  Roll dice
  ↓
  applyAugmentation(roll, augmentation)  ← applies Card/Bank/Cool/Talent
  ↓
  Post chat message
```

### Integration Points

Each mode affects different stages:

| Mode | Dialog Change | Roll Change | Augmentation | Chat | Tracking |
|------|---------------|-------------|--------------|------|----------|
| **Teamwork** | Add recipient picker | No | No | Both names + die transfer | Helper state |
| **Confessional** | Add characteristics picker | No | Earn franchise die | Show characteristics given | Session tracker |
| **Private Life** | Restrict options | No | Cool only (hide Card/Bank/Talent) | No | Mission vs private flag |
| **Requirements** | Add requirement setter | No | Auto-fail if unmet | Show requirement + result | Roll state |

### Shared Files to Modify

1. **roll-executor.ts** — executeSkillRoll entry point, augmentation config
2. **skill-roll-dialog.ts** or inline buildSkillRollDialog — dialog construction + augmentation validation
3. **agent-sheet.ts** — button labels, confessional trigger, private life toggle
4. **roll-card.hbs** — chat template for formatting

---

## Implementation Order

### Phase 1: Requirements Checker (Simplest, Foundational)

**Why first:** Minimal state, isolated to Technology rolls, validates dialog + roll gating pattern.

**Files to modify:**
- `roll-executor.ts`: Add `requirementTier?: ItemRarity` to augmentation, check in executeSkillRoll
- `skill-roll-dialog.ts`: Add requirement tier picker for Technology rolls only
- `roll-card.hbs`: Show requirement + pass/fail in chat message

**Test Strategy:**
1. Test GM setting requirement tier
2. Test roll meets/exceeds/fails requirement
3. Test defect on exotic (minRoll - 1)
4. Test non-Technology rolls don't see requirement option

**Deliverable:** Tech rolls can optionally set requirement; rolls auto-fail if insufficient.

---

### Phase 2: Private Life (No State, Pure Restriction)

**Why second:** Depends on augmentation restriction pattern; no new tracking needed.

**Files to modify:**
- `executeSkillRoll`: Add `isPrivateLife: boolean` flag to params, gate non-Cool augmentation
- `skill-roll-dialog.ts`: Disable Card/Bank/Talent options when isPrivateLife = true
- `agent-sheet.ts`: Add "Private Life" toggle near skill roll buttons (or mission context)

**Test Strategy:**
1. Test private life mode disables Card/Bank/Talent, allows Cool
2. Test franchise pool NOT earned in private life
3. Test cannot toggle private life during mission (prevent accidental mode)
4. Test non-private rolls unaffected

**Deliverable:** Non-mission skill rolls can be marked "private life" to restrict augmentation.

---

### Phase 3: Teamwork Assist (Die Transfer State)

**Why third:** Introduces die transfer mechanic; validates helper/recipient selection + chat formatting.

**Files to modify:**
- `executeSkillRoll`: Detect "assist" mode, call selectDieFromAssist, apply transfer logic
- `skill-roll-dialog.ts`: Add "Assist" checkbox + recipient actor selector
- `roll-executor.ts`: Update roll result to include helper/recipient names + die transfer
- `roll-card.hbs`: Format as "Helper (name) assists Recipient (name). Transfers 1 die: [die face]"

**Test Strategy:**
1. Test non-assist rolls unaffected
2. Test assist mode shows recipient picker
3. Test helper selects die to transfer (validates index)
4. Test recipient receives die (not helper's cool/card, but unallocated die for recipient)
5. Test chat message format includes both actors + die value

**Deliverable:** Helper can declare assist; rolls skill, transfers 1 die to recipient actor.

---

### Phase 4: Confessional (Session Tracking + End-of-Session Bonus)

**Why last:** Most complex state management; depends on session lifecycle tracking.

**Files to modify:**
- `agent-sheet.ts`: Add "Trigger Confessional" button (visible only if 1x/session not used)
- `confessional-dialog.ts` (new): Modal dialog prompting for characteristic(s) + witness selection
- `franchise-sheet.ts`: Add "End Session" button that computes characteristic bonus
- `roll-executor.ts`: Integrate characteristics tracking on agent (new field: `sessionCharacteristics`)
- Create `session-tracker.ts`: Manages `currentSessionId`, tracks confessional usage per session

**Test Strategy:**
1. Test confessional button visible at session start, disabled after use
2. Test characteristic added to agent's session tracking
3. Test end-of-session bonus calculated from all agents' characteristics (1 franchise die per)
4. Test session reset clears confessional flag + characteristics
5. Test confessional state persists across sheet re-render

**Deliverable:** Scene GM triggers confessional 1x/session, tracks characteristics, awards bonus at session end.

---

## Shared Code Patterns

### Augmentation Config Object Evolution

Current:
```typescript
interface AugmentationOptions {
  cardDice: number;
  bankDice: number;
  coolDice: number;
  talentDie: boolean;
  takesFour: boolean;
}
```

Extend to:
```typescript
interface AugmentationOptions {
  // existing
  cardDice: number;
  bankDice: number;
  coolDice: number;
  talentDie: boolean;
  takesFour: boolean;
  
  // new: advanced modes
  isPrivateLife?: boolean;
  requirementTier?: ItemRarity;  // Requirements Checker
  assistData?: {
    helperActorId: string;
    recipientActorId: string;
    selectedDieIndex: number;
  };
  confessionalData?: {
    characteristics: string[];
  };
}
```

### Dialog Builder Pattern

Current: Single `buildSkillRollDialog()` function constructs dialog.

Extend to:
```typescript
buildSkillRollDialog(options: {
  skillName: SkillName;
  effectiveDice: number;
  // ... existing
  allowPrivateLife?: boolean;
  allowAssist?: boolean;
  isTechnology?: boolean;  // for requirements
  allowConfessional?: boolean;
})
```

Add conditional sections:
- **Requirements section** (if isTechnology)
- **Private Life toggle** (if allowPrivateLife)
- **Assist options** (if allowAssist)
- **Confessional trigger** (if allowConfessional)

---

## Testing Strategy (TDD)

### Test Files to Create/Extend

1. **roll-executor.test.ts** (existing)
   - Add tests for each augmentation mode
   - Test combinations (e.g., Private Life + Assist should fail)

2. **skill-roll-dialog.test.ts** (may exist or need creation)
   - Test dialog rendering with mode flags
   - Test option visibility/disabling

3. **requirements-checker.test.ts** (extend existing)
   - Existing pure functions; add integration tests

4. **teamwork.test.ts** (extend existing)
   - Add die transfer validation tests

5. **confessional.test.ts** (extend existing)
   - Add session tracking + bonus calculation tests

### Key Test Scenarios

**For each mode:**
- Mode enabled → correct UI shown
- Mode disabled → UI hidden
- Invalid input → graceful error + message
- Valid input → state applied to roll
- Roll executes → correct augmentation applied
- Chat message → mode-specific formatting

**For combinations:**
- Private Life + Teamwork (should work together)
- Confessional + Teamwork (should work together)
- Requirements + other modes (should coexist)

---

## Chat Message Formatting

Current format:
```
[Skill Name] roll result: [outcome]
Dice breakdown: [roll details]
```

Extend per mode:

**Teamwork:**
```
Helper (Actor A) assists Recipient (Actor B) on [Skill] roll.
Helper rolls: [X successes]
Dies transferred: [face value] → [Recipient]
[Recipient] now has +1 die for this roll.
```

**Confessional:**
```
Confessional triggered by [Actor]
Characteristics shared: [names]
Session bonus awarded: +1 franchise die
```

**Private Life:**
```
[Actor] private life skill roll (no mission earning)
Result: [outcome]
```

**Requirements:**
```
[Skill] roll for [Item] (rarity: [common/rare/exotic], min roll: [4/5/6])
Roll result: [X]
Status: [PASS / FAIL / DEFECT]
```

---

## Implementation Constraints

1. **No state mutation**: Use `actor.update()` for all state changes
2. **Localization**: All user strings via `game.i18n.localize()` with keys in `en.json`
3. **Type safety**: No `any` casts; use `satisfies` or proper narrowing
4. **Testing**: Every new function has ≥1 test
5. **Backwards compatibility**: Non-mode skill rolls unaffected
6. **Validation at boundaries**: User input (dialog) validated before applying

---

## Success Criteria

✅ Each mode works independently
✅ Modes can be combined (Teamwork + Private Life, etc.)
✅ Chat messages clearly show mode behavior
✅ State persists across sheet reloads
✅ All 231 existing tests still pass
✅ ≥50 new tests added (split across 4 modes)
✅ Type check clean
✅ Build succeeds
✅ CI passes

---

## Deferred Work / Known Limitations

1. **Teamwork on Stress Rolls** (#249): Spec explicitly prohibits. Not implementing.
2. **Confessional end-of-session automation**: Manual button for now (future: auto-trigger on scene end)
3. **Private Life gating**: Manual toggle; future: auto-detect if roll is on mission or not
4. **Requirements defect messaging**: Simple text; future: animated defect indicator

---

## File Modifications Summary

| File | Changes | Lines Added |
|------|---------|-------------|
| roll-executor.ts | Augmentation config, mode detection, gating | ~80 |
| skill-roll-dialog.ts | Mode-specific form sections | ~120 |
| roll-card.hbs | Mode-specific chat formatting | ~40 |
| agent-sheet.ts | Confessional button, Private Life toggle | ~30 |
| franchise-sheet.ts | End Session + bonus calculation | ~50 |
| session-tracker.ts | NEW: Session management | ~60 |
| confessional-dialog.ts | NEW: Confessional UI | ~80 |
| roll-executor.test.ts | Mode integration tests | ~150 |
| confessional.test.ts | Session + bonus tests | ~80 |
| teamwork.test.ts | Die transfer tests | ~60 |
| en.json | Localization keys for all modes | ~40 |

**Total estimate:** ~850 lines across 11 files.

---

## Next Steps

1. **Verify this plan** with team (any concerns, architectural conflicts?)
2. **Start Phase 1** (Requirements Checker) with TDD
3. **Commit per phase** with PR review at each stage
4. **Document as we go** (update this plan if assumptions change)
