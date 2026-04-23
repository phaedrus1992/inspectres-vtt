---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Rules

## Compiler

Enable in `tsconfig.json`:
```jsonc
"strict": true,
"noUncheckedIndexedAccess": true,
"exactOptionalPropertyTypes": true,
"noImplicitOverride": true,
"noPropertyAccessFromIndexSignature": true,
"verbatimModuleSyntax": true,
"isolatedModules": true
```

ESM only. No CommonJS, no `require`.

## Naming

| Style | Use for |
|-------|---------|
| `UpperCamelCase` | Classes, interfaces, types, enums, components |
| `lowerCamelCase` | Variables, functions, methods, properties |
| `CONSTANT_CASE` | Constants, enum values, `static readonly` |

- Acronyms as whole words: `loadHttpUrl` not `loadHTTPURL`
- No `_` prefix/suffix; use `private` keyword
- No Hungarian notation (`strName`, `IFoo`, `EBar`)
- Names descriptive to new reader. No ambiguous abbreviations. Single-letter only in scopes under 10 lines
- Domain-specific names, not vague (`Manager`, `Service`, `Handler`)

## Types

### No `any`

Use `unknown` + type guards:
```typescript
function parse(input: unknown): void {
  if (typeof input === "object" && input !== null && "foo" in input) {
    (input as { foo: () => void }).foo();
  }
}
```

### Assertions: Justify

Use `as T` only with justification. No `as unknown as T` chains — refactor instead.

**Exception:** `actor.system as unknown as AgentData` at fvtt-types boundary (template.json systems, unavoidable until TypeDataModel migration). Use justification comment.

### Interface vs Type

- `interface`: object shapes
- `type`: unions, tuples, primitives

### Branded Types

```typescript
type UserId = string & { readonly __brand: unique symbol };
function createUserId(raw: string): UserId { return raw as UserId; }
```

### Nullability

- `T | null` or `T | undefined` at point of use (never in aliases)
- `?` for optional fields/params. `| undefined` for always-present but nullable
- Handle null close to source

### No Wrappers

No `String`, `Boolean`, `Number`, `Object`. Use lowercase: `string`, `boolean`, `number`, `object`.

### Arrays

- `T[]` for simple types
- `Array<T>` for complex (unions, objects)

### Enums

Use `enum`, not `const enum`. Always default/exhaustive check.

### Generics

All type params must be used. No phantom generics.

## Error Handling

- Fail fast: `throw new Error("context")`. Include what failed, input, fix suggestion
- Never swallow: every `catch` rethrows, logs+rethrows, or handles
- Use `unknown` in catch, narrow before access
- Callbacks ignoring errors use `void` return type
- Validate at boundaries (user input, APIs, files). Trust internal types

## Imports/Exports

- Named exports only. No `export default`
- No `export let`. Use getters
- No container classes. Export individually
- No `import type` / `export type` (exception: `export type Foo = ...`)
- No `namespace`, no `require`. ESM only
- Prefer destructured for common symbols. Namespace imports (`import * as`) for large APIs

## Control Flow

### Equality

Always `===` / `!==`. Exception: `== null` for both null + undefined.

### Switches

Every `switch` has `default`. Discriminated unions use `assertNever`:
```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${JSON.stringify(x)}`);
}
switch (action.type) {
  case "create": return handleCreate(action);
  case "delete": return handleDelete(action);
  default: return assertNever(action);
}
```

No fall-through non-empty cases. Empty cases may group.

### No `forEach`

Use `for...of`:
```typescript
for (const item of items) {
  process(item);
}
```

### No `for...in`

Use `for...of`, `Object.keys()`, `Object.entries()`.

### Blocks Required

Multi-line must use braces. Single-statement OK on one line: `if (done) return;`

## Variables

Always `const` or `let`. Default to `const`. No `var`.

## Classes

- Minimize exported surface
- Never write `public` explicitly (it's default; exception: non-readonly constructor params)
- Use `readonly` on non-reassigned properties
- Use parameter properties to avoid boilerplate
- Initialize fields at declaration when possible
- No `#private`. Use TypeScript `private` (better size/perf)
- Getters pure (no side effects)
- No arrow-function properties unless need stable `this` for unregistration

## Functions

- `function` declarations for named functions. Can't be reassigned
- Arrow functions for callbacks/expressions
- Arrow callbacks ignoring return must use block body
- Never `bind()` for handlers. Use arrow functions
- Semicolons required

## Magic Values

Comment explaining why:
```typescript
const POLL_TIMEOUT_MS = 30_000; // 30s = server-side request timeout
```

## Comments

- JSDoc (`/** */`) for public API (document purpose, not types)
- Line comments (`//`) for implementation notes
- No `@param`/`@return` restating signature. Only info beyond signature
- No `@override`, no commented-out code
- JSDoc before decorators

## Coercion

- String: `String(x)` or template literals. No `"" + x`
- Number: `Number(x)` then check `isNaN`. No unary `+`. `parseInt` only non-base-10
- Boolean: implicit truthiness in conditionals. No `!!x`. Explicit comparisons (`arr.length > 0`) fine

## Spread

- Objects into objects, iterables into arrays only
- Never spread `null`, `undefined`, primitives
- Ternary for conditional: `{ ...base, ...(cond ? extra : {}) }`

## Testing

- Test behavior, not implementation
- Test edges + errors (empty, boundaries, malformed, missing)
- Mock boundaries only (network, filesystem, external)
- Colocate tests (`*.test.ts` next to source)
- Use `vitest`

## Anti-Patterns

| Never | Use |
|-------|-----|
| `any` | `unknown` + narrowing |
| `export default` | Named exports |
| `var` | `const` / `let` |
| `.forEach()` | `for...of` |
| `for...in` | `for...of` / `Object.entries()` |
| `@ts-ignore` | Fix error |
| `as Foo` unjustified | Type guards / narrowing |
| `as unknown as Foo` | Type-safe wrappers or narrowing |
| `x!` unjustified | Null checks |
| `==` / `!=` (except `== null`) | `===` / `!==` |
| `new String()` / `new Boolean()` / `new Number()` | Primitives |
| `Array()` constructor | `[]` |
| `namespace` | ES modules |
| `require()` | `import` |
| `debugger` | Remove before commit |
| Empty `catch {}` | Handle or rethrow |
| `console.log` in production | Structured logging |
