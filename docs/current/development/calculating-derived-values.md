---
sidebar_position: 7
---

# Calculating Derived Values

InSpectres follows a principle: **Always calculate derived values from core actor sheet values at point of use**, rather than caching, pre-calculating, or storing redundant copies.

## Why This Pattern

- **Single source of truth:** The actor sheet is the authority
- **Automatic consistency:** When core values change (stress increases, cool spent), all dependent calculations reflect the change immediately
- **Reduced state management:** No need to track multiple copies or invalidate caches
- **Clearer data flow:** Actor → calculation → result

## What Counts as Derived

A derived value is any value computed from one or more source values:

| Source Values | Derived Value | Example |
|---|---|---|
| `skill.base`, `skill.penalty` | Effective skill | `Math.max(0, base - penalty)` |
| `cool`, `stress` | Effective cool | `Math.max(0, cool - stress)` |
| `isDead`, `daysOutOfAction`, `recoveryStartedAt`, `currentDay` | Recovery status | "recovering", "active", "dead", etc. |
| `roll faces`, `currentBank` | Bank resolution | Final bank total after bank die resolution |

## Correct Pattern: Compute On-Demand

```typescript
// ✓ Good: Compute at point of use
export function computeRecoveryStatus(
  system: AgentData,
  currentDay: number,
): RecoveryInfo {
  if (system.isDead) {
    return { status: "dead", daysRemaining: 0, description: "..." };
  }
  // ... compute from source values
  const daysElapsed = currentDay - system.recoveryStartedAt;
  const daysRemaining = Math.max(0, system.daysOutOfAction - daysElapsed);
  // ... return computed result
}

// Called in the UI:
override async _prepareContext(_options): Promise<Record<string, unknown>> {
  const system = agentSystemData(this.actor);
  const currentDay = getCurrentDay();
  const recoveryStatus = computeRecoveryStatus(system, currentDay); // ← Computed here
  return { ...base, system, recoveryStatus };
}
```

## Anti-Pattern: Cached Values

```typescript
// ✗ Bad: Storing computed result on actor
await actor.update({
  "system.stress": 4,
  "system.effectiveStress": 4, // Computed value cached — will get stale!
});

// ✗ Bad: Pre-calculating and passing through parameters
interface RollParams {
  skillBase: number;
  skillPenalty: number;
  effectiveDice: number; // Redundant! Can compute from base and penalty
}

// ✗ Bad: Caching in object state
class RollHelper {
  effectiveDice: number; // Stored after computation — stale if base/penalty change
  constructor(skill: AgentSkill) {
    this.effectiveDice = Math.max(0, skill.base - skill.penalty);
  }
}
```

## Examples in the Codebase

### Example 1: Skill Rolls

Source values on agent: `skills[skill].base`, `skills[skill].penalty`

Derived at roll time:
```typescript
// foundry/src/rolls/roll-executor.ts
const effectiveDice = Math.max(0, skill.base - skill.penalty);
```

Never stored; computed fresh each roll.

### Example 2: Recovery Status

Source values on agent: `isDead`, `daysOutOfAction`, `recoveryStartedAt`

Derived on demand:
```typescript
// foundry/src/agent/recovery-utils.ts
export function computeRecoveryStatus(system: AgentData, currentDay: number): RecoveryInfo {
  // Compute status from source values
  const daysElapsed = currentDay - system.recoveryStartedAt;
  const daysRemaining = Math.max(0, system.daysOutOfAction - daysElapsed);
  return { status, daysRemaining, description };
}

// Called in:
// - AgentSheet._prepareContext() (UI)
// - recovery-auto-clear.ts (background check)
// - Computed fresh each call
```

### Example 3: Bank Resolution

Source: `currentBank`, dice roll results

Derived via pure function:
```typescript
// foundry/src/rolls/roll-executor.ts
export function resolveBankDice(faces: number[], currentBank: number): BankResolutionSummary {
  // Compute final bank from roll results
  const finalBankTotal = lostAll ? 0 : Math.max(0, currentBank + delta);
  return { resolutions, finalBankTotal };
}
// No caching. Pure function. Computed fresh each roll.
```

## When to Create Utility Functions

Create a pure function (like `computeRecoveryStatus`) when:

1. The calculation is complex (multiple steps, conditional logic)
2. The calculation is used in multiple places
3. The calculation will benefit from unit tests
4. The result is not the primary purpose of the function (e.g., `_prepareContext` is for UI prep, not computation)

```typescript
// ✓ Worth extracting
function computeRecoveryStatus(system: AgentData, currentDay: number): RecoveryInfo {
  // 10+ lines of logic, used in 3+ places
}

// ? Borderline — used once, simpler logic
const daysRemaining = Math.max(0, daysOutOfAction - daysElapsed);
// Keeping it inline is fine; extracting would be over-engineering
```

## Getter Methods vs. Utility Functions

**Getters on document classes** (like `getEffectiveSkill` in `InSpectresAgent`):
- Use when the computation is tightly scoped to the document
- Example: `agent.getEffectiveSkill("academics")` has access to `this` (the agent)
- Useful as a convenience method

**Utility functions** (like `computeRecoveryStatus`):
- Use when the computation needs to work with plain data objects (for testing, reusability)
- Takes source values as parameters, returns computed result
- Easier to test in isolation

Both patterns are correct; choose based on usage:

```typescript
// Getter — agent convenience method
class InSpectresAgent extends Actor {
  getEffectiveSkill(skill: SkillName): number {
    const system = agentSystemData(this as Actor);
    return Math.max(0, system.skills[skill].base - system.skills[skill].penalty);
  }
}

// Utility function — testable pure function
export function computeRecoveryStatus(system: AgentData, currentDay: number): RecoveryInfo {
  // ... logic
}
```

## Recap: The Rule

> **Calculate derived values from source values at point of use. Never cache or pre-calculate.**

This ensures the codebase stays simple, consistent, and maintainable as the game rules evolve.

