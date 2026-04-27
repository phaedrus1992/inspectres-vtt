# Cached/Computed Values Audit — Issue #300

## Summary

Audit of InSpectres codebase for redundantly cached or pre-calculated values. **Overall finding: The codebase already follows best practices well.** All identified derived values are calculated at point of use rather than cached.

## Scope Covered

- Agent actor system data (`agent-schema.ts`, `InSpectresAgent.ts`)
- Roll execution logic (`roll-executor.ts`)
- Recovery system (`recovery-utils.ts`, `AgentSheet.ts`)
- Skill/cool computations
- Recovery status calculations
- Bank resolution logic
- Stress roll mechanics

## Patterns Found (All Correct)

### 1. **Effective Skill Computation** ✓
- **Location:** `InSpectresAgent.ts:13`, `roll-executor.ts:152`
- **Pattern:** `effectiveDice = Math.max(0, skill.base - skill.penalty)`
- **Status:** Calculated at point of use in `executeSkillRoll()`. Not cached.
- **Storage:** Only `skill.base` and `skill.penalty` stored on actor; effective value derived.

### 2. **Recovery Status Computation** ✓
- **Location:** `recovery-utils.ts:37–80`
- **Pattern:** `computeRecoveryStatus(system, currentDay)` returns `RecoveryInfo`
- **Status:** Purely computed from source values; never cached on actor.
- **Storage:** Actor stores only `isDead`, `daysOutOfAction`, `recoveryStartedAt`, `currentDay` (setting).
- **Usage:** Called on-demand in `AgentSheet:128` and `recovery-auto-clear.ts`

### 3. **Effective Cool Calculation** ✓
- **Location:** `weird-powers.test.ts:165, 188`
- **Pattern:** `effectiveCool = Math.max(0, cool - stress)`
- **Status:** Calculated in tests; production code uses raw `cool` value directly.
- **Note:** No stored `effectiveCool` field on agent.

### 4. **Bank Resolution** ✓
- **Location:** `roll-executor.ts:98–122`
- **Pattern:** `resolveBankDice(faces, currentBank)` computes `finalBankTotal`
- **Status:** Pure function; no caching. Computed fresh on each bank die roll.
- **Storage:** Only `currentBank` stored; deltas computed from dice roll results.

### 5. **Stress Roll Outcome** ✓
- **Location:** `roll-executor.ts:380–410`
- **Pattern:** `effectiveFace` computed from roll; outcome from `STRESS_ROLL_CHART`
- **Status:** Computed at roll time; not cached.

### 6. **Days Elapsed / Days Remaining** ✓
- **Location:** `recovery-utils.ts:64–65`, `recovery-auto-clear.ts:103–104`
- **Pattern:** `daysElapsed = currentDay - recoveryStartedAt`
- **Status:** Computed on-demand from source values; never cached.

## Analysis: Why This Works Well

The codebase achieves the goal through:

1. **Separation of concerns:** Core actor data (source) vs. computed results (derived).
2. **Computation at UI boundaries:** `_prepareContext()` and dialog handlers compute values only when needed.
3. **Pure functions:** `computeRecoveryStatus()`, `resolveBankDice()` take inputs, return computed results.
4. **No redundant fields:** Actor schema contains only source values, not derived ones.

## Fields on Actor (All Source, No Redundancy)

### Agent Actor
- `skills[skill].base`, `skills[skill].penalty` → source
- `cool` → source
- `stress` → source  
- `isDead`, `daysOutOfAction`, `recoveryStartedAt` → source for recovery state
- `isWeird`, `power` → source for weird agent mechanics
- `characteristics`, `talent`, `description` → source for flavor

### Franchise Actor
- `bank`, `cards.{library|gym|credit}` → source for resources
- `missionPool`, `missionGoal`, `missionStartDay` → source for mission state
- `debtMode`, `cardsLocked`, `loanAmount` → source for financial state

**No cached copies. No special values. Ideal.**

## Potential Improvements (Edge Cases)

None identified. The current implementation is clean and follows the principle throughout.

## Recommendations

1. **Document the pattern** in `docs/current/development/` for future developers.
2. **Getter methods** already exist where helpful (`getEffectiveSkill`); no new ones needed.
3. **No refactoring required** — current code is correct.

## Conclusion

Issue #300 audit complete. **The codebase exemplifies the desired principle: Always calculate derived values from core actor sheet values at point of use, rather than caching, pre-calculating, or storing redundant copies.** No changes needed. Pattern can be documented as a best practice for future development.

