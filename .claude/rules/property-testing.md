# Property-Based Testing (fast-check)

Companion to `playwright-foundry.md`. Covers property tests using fast-check.

## When to Use

Property tests complement example-based tests. Add them when:
- Function has numeric invariants (bounds, non-negative, capped)
- State machine has transition constraints
- Pure function must hold for all inputs (not just known cases)
- Off-by-one errors are plausible (recovery day math, dice counts)
- Serialization/computation must round-trip

Do NOT replace example-based tests. They coexist.

## File Naming

Co-locate alongside unit tests:
```
agent/stress.property.test.ts          # next to stress logic
rolls/roll-outcome.property.test.ts    # next to roll-executor.ts
franchise/debt-mode.property.test.ts   # next to bankruptcy-handler.ts
```

Pattern: `*.property.test.ts`

## Basic Structure

```typescript
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

describe("myFunction invariants", () => {
  it("result is always non-negative", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (input) => {
        const result = myFunction(input);
        expect(result).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 },
    );
  });
});
```

## Run Counts

| Use case | numRuns |
|----------|---------|
| Pure cheap functions | 1000 |
| Slightly expensive | 100–500 |
| Very cheap (primitives only) | 1000 |

Default: 100. Bump to 1000 for cheap pure functions (arithmetic, state queries).

## Shared Arbitraries

Import from `src/__mocks__/arbitraries.ts`. Keep generators DRY:

```typescript
import { stressValue, dayNumber, agentData } from "../__mocks__/arbitraries.js";
```

Add new arbitraries to `arbitraries.ts` when you need a new domain type in 2+ test files.

## Arithmetic Arbitraries: Use Explicit Bounds

Always prefer bounded arbitraries over unbounded:

```typescript
// Good — bounded, shrinks to readable values
fc.integer({ min: 0, max: 6 })

// Avoid — unbounded, harder to shrink meaningfully
fc.nat()
```

Use `fc.integer({ min, max })` for bounded integers (not `fc.nat({ max })`).

## Seed Replay

When fast-check finds a failure, it logs the seed. Replay with:
```typescript
fc.assert(prop, { seed: 1234567890 });
```

Include the seed in the issue/PR description, not in committed test code.

## Failure Debugging

fast-check shrinks failures to minimal reproducible inputs. When a property fails:
1. Note the seed from the output
2. Identify the minimal input that fails
3. Add an example-based test for that case
4. Fix the bug, not the property

## Common Patterns

### Non-negative invariant

```typescript
it("result is never negative", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 }), (a, b) => {
      expect(Math.max(0, a - b)).toBeGreaterThanOrEqual(0);
    }),
    { numRuns: 1000 },
  );
});
```

### Clamped range invariant

```typescript
it("stress is always in [0, 6]", () => {
  fc.assert(
    fc.property(stressValue(), fc.integer({ min: -10, max: 10 }), (current, delta) => {
      const next = Math.max(0, Math.min(6, current + delta));
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThanOrEqual(6);
    }),
    { numRuns: 1000 },
  );
});
```

### State machine invariant

```typescript
it("output status is always one of the valid statuses", () => {
  fc.assert(
    fc.property(agentData(), dayNumber(), (system, day) => {
      const result = computeStatus(system, day);
      expect(["active", "recovering", "returned", "dead"]).toContain(result.status);
    }),
    { numRuns: 1000 },
  );
});
```

### Monotonicity invariant

```typescript
it("adding dice never decreases progress", () => {
  fc.assert(
    fc.property(fc.nat({ max: 30 }), fc.nat({ max: 30 }), fc.integer({ min: 0, max: 10 }), (pool, goal, added) => {
      const before = progressPercent(pool, goal);
      const after = progressPercent(pool + added, goal);
      expect(after).toBeGreaterThanOrEqual(before);
    }),
    { numRuns: 1000 },
  );
});
```

## Anti-Patterns

| Never | Use |
|-------|-----|
| `fc.nat()` unbounded | `fc.integer({ min, max })` with explicit bounds |
| Testing implementation details | Test observable invariants |
| Replacing all example tests | Add properties alongside examples |
| One huge property file | Co-locate with source, split by domain |
| Seed in committed test code | Note seed in PR, replay locally |
| 10 numRuns for cheap functions | 100–1000 runs to catch rare edge cases |
| `fc.anything()` in domain tests | Typed arbitraries matching domain constraints |

## CI Integration

Property tests run via `npm run test` (vitest). No special CI config needed — fast-check integrates directly with vitest.
