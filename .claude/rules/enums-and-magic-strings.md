# Enums and Magic Strings

Companion to `typescript.md`. Establishes patterns for avoiding magic strings, especially in template contexts.

## Core Principle

Never use bare string literals for domain values that appear in multiple places (templates, type checks, conditionals). Use enums or branded types instead.

## When to Use Enums

Enum when the value:
- Represents a finite set of states or categories
- Is referenced in multiple files or templates
- Appears in type guards or switch statements
- Is rendered in templates via conditional checks

**Example:** Recovery status (`"active"`, `"recovering"`, `"returned"`, `"dead"`) — used in:
- Type: `RecoveryInfo.status`
- Conditionals: `computeRecoveryStatus()`
- Template: `agent-sheet.hbs` (3 conditional checks)
- Tests: multiple assertions

→ Use `type RecoveryStatus = "active" | "recovering" | "returned" | "dead"` + exhaustiveness checks.

## Enum Syntax

Use `type` union for domain discriminators, not `enum`:

```typescript
// Good — type union is simpler, better for template conditionals
type RecoveryStatus = "active" | "recovering" | "returned" | "dead";

// Avoid — enum creates an extra value wrapper
enum RecoveryStatus {
  Active = "active",
  Recovering = "recovering",
  Returned = "returned",
  Dead = "dead",
}
```

For true enums with computed values or many variants, use `enum`. For simple string discriminators (status, outcome, mode), use `type`.

## Template Conventions

### Handlebars Conditional: Prefer Data Over Magic Strings

**Bad — magic strings in template:**
```handlebars
{{#if (eq recoveryStatus.status "dead")}}
  {{localize "INSPECTRES.RecoveryStatusDead"}}
{{else if (eq recoveryStatus.status "recovering")}}
  {{localize "INSPECTRES.RecoveryStatusRecovering"}}
{{else}}
  {{localize "INSPECTRES.RecoveryStatusActive"}}
{{/if}}
```

The string `"dead"` appears twice (once in condition, once implied in localization key). If the type changes, templates break silently.

**Good — computed in code, passed to template:**
```typescript
// In _prepareContext()
return {
  ...base,
  statusLabel: this.getStatusLabel(recoveryStatus.status),
};

// In AgentSheet
private getStatusLabel(status: RecoveryStatus): string {
  switch (status) {
    case "dead": return game.i18n.localize("INSPECTRES.RecoveryStatusDead");
    case "recovering": return `${game.i18n.localize("INSPECTRES.RecoveryStatusRecovering")} (${daysRemaining} days)`;
    case "returned": return game.i18n.localize("INSPECTRES.RecoveryStatusReturned");
    case "active": return game.i18n.localize("INSPECTRES.RecoveryStatusActive");
    default: return assertNever(status);
  }
}
```

**Template becomes:**
```handlebars
<span class="status-value {{recoveryStatus.status}}">{{statusLabel}}</span>
```

Benefits:
- No string duplication
- Type-safe (exhaustiveness check catches missing cases)
- Localization centralized in one place
- Template is simpler and clearer

### CSS Classes and Data Attributes: Use Enums for Values

**Bad:**
```typescript
const bannerClass = recoveryStatus.status === "dead" ? "recovery-banner-dead" : "recovery-banner-recovering";
```

**Good:**
```typescript
// No magic strings; class name matches enum value
<div class="recovery-banner {{recoveryStatus.status}}"></div>
```

CSS:
```css
.inspectres .recovery-banner {
  &.dead { color: var(--inspectres-death-color); }
  &.recovering { color: var(--inspectres-recovery-color); }
  &.returned { color: var(--inspectres-success-color); }
  &.active { color: var(--inspectres-neutral-color); }
}
```

This assumes the enum value matches the CSS class. If the type changes, CSS selector naming changes too—no duplication.

## Localization Key Patterns

**Localization keys are NOT magic strings.** They're config references, not domain values. Exception to the enum rule:

Good (key patterns are data-driven):
```handlebars
{{localize (concat "INSPECTRES.RecoveryStatus" (inspectres-capitalize recoveryStatus.status))}}
```

Results in:
- `"INSPECTRES.RecoveryStatusDead"` for status `"dead"`
- `"INSPECTRES.RecoveryStatusRecovering"` for status `"recovering"`

This is fine because the localization key is derived from the enum value, not a separate magic string.

Bad (hardcoded key unrelated to value):
```typescript
const keyMap = {
  dead: "INSPECTRES.AgentIsDead", // unrelated key name
  recovering: "INSPECTRES.RestingAtHome", // easy to mistype or drift
};
```

## Discriminators in Type Unions

When discriminating on strings in template helpers or conditionals, always use the type union for reference:

```typescript
function formatOutcome(outcome: "good" | "partial" | "bad"): string {
  switch (outcome) {
    case "good": return "✓ Success";
    case "partial": return "⚬ Partial";
    case "bad": return "✗ Failure";
    default: return assertNever(outcome);
  }
}
```

Type union and switch cases in sync. If you add a new outcome type, TypeScript errors on the unhandled case.

## Constants for Non-Domain Values

Magic numbers and non-discriminating strings still use constants:

```typescript
// Good — constant with comment explaining the value
const DEFAULT_STRESS_MAX = 6; // Per rulebook, stress cap
const RECOVERY_POLL_INTERVAL_MS = 5000; // Check recovery every 5 seconds
const MISSION_POOL_DISPLAY_FORMAT = "{{count}} {{#if plural}}dice{{else}}die{{/if}}"; // Handlebars template

// Bad — magic number with no context
for (let i = 0; i < 6; i++) { ... }
```

## Application to InSpectres

### Recovery Status (RecoveryInfo.ts)

Already correctly uses type union:
```typescript
export type RecoveryStatus = "active" | "dead" | "recovering" | "returned";
```

Validation: verify all conditionals use this type. No bare strings like `"active"` in templates without first passing through computed properties.

### Roll Outcomes

Roll outcomes (`"good"`, `"partial"`, `"bad"`) should follow same pattern:
```typescript
export type RollOutcome = "good" | "partial" | "bad";
```

Then in templates:
```handlebars
<div class="roll-card {{outcome}}">
  {{formatOutcome outcome}} <!-- outcome pre-formatted in _prepareContext -->
</div>
```

### Debt Mode States

Debt mode states (`"normal"`, `"debt"`, `"bankruptcy"`) — establish type union:
```typescript
export type DebtState = "normal" | "debt" | "bankruptcy";
```

Apply same pattern: centralize state display logic, pass to template.

## Testing

Tests that verify state handling must be exhaustive:

```typescript
describe("recovery status transitions", () => {
  // Ensure all recovery statuses are tested
  const statuses: RecoveryStatus[] = ["active", "dead", "recovering", "returned"];
  for (const status of statuses) {
    it(`handles ${status} state`, () => {
      const result = computeRecoveryStatus(status);
      expect(result).toBeDefined();
    });
  }
});
```

If you add a new status to the type union, this test will include it automatically. No risk of forgetting a case.

## Anti-Patterns

| Never | Use |
|-------|-----|
| Bare strings in templates | Computed properties from sheet context |
| Conditional class names from hardcoded strings | Match CSS class name to enum value |
| Unrelated localization keys | Key pattern derived from enum value |
| Magic numbers without comments | Named constants with "why" comments |
| Unvalidated enum-like strings in code | Proper type union with exhaustiveness checks |
| Localization keys as enum values | Enum discriminator + key computed from value |
| Template conditionals repeating strings | Pre-compute in _prepareContext, pass as data |

## Summary

- **Enums/types:** Use for finite domain values that appear in multiple contexts
- **Templates:** Compute display logic in sheets, pass pre-formatted data; avoid conditionals on bare strings
- **Localization:** Keys are computed from enum values, never magic strings themselves
- **Constants:** Non-discriminating values (timeouts, limits, defaults) use named constants with "why" comments
- **Testing:** Exhaustiveness checks ensure all enum values are covered
