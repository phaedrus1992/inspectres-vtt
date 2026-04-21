---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Rules

## Compiler Strictness

Enable all of these in `tsconfig.json`:

```jsonc
"strict": true,
"noUncheckedIndexedAccess": true,
"exactOptionalPropertyTypes": true,
"noImplicitOverride": true,
"noPropertyAccessFromIndexSignature": true,
"verbatimModuleSyntax": true,
"isolatedModules": true
```

ESM only (`"type": "module"` in `package.json`). No CommonJS, no `require`.

## Naming

| Style | Use for |
|-------|---------|
| `UpperCamelCase` | Classes, interfaces, types, enums, type parameters, React components |
| `lowerCamelCase` | Variables, parameters, functions, methods, properties |
| `CONSTANT_CASE` | Global constants, enum values, `static readonly` class properties |

- Treat acronyms as whole words: `loadHttpUrl`, not `loadHTTPURL`
- No `_` prefix/suffix for private members — use `private` keyword
- No Hungarian notation or type-encoding in names (`strName`, `IFoo`, `EBar`)
- Names must be descriptive to a new reader. No ambiguous abbreviations. Short names (single letter) only in scopes under 10 lines
- Avoid vague names (`Manager`, `Service`, `Handler`, `Processor`) when a domain-specific name exists

## Type Design

### No `any`

Never use `any`. Use `unknown` when the type is genuinely unknown, then narrow with type guards before use:

```typescript
// Bad
function parse(input: any): void { input.foo(); }

// Good
function parse(input: unknown): void {
  if (typeof input === "object" && input !== null && "foo" in input) {
    (input as { foo: () => void }).foo();
  }
}
```

If `any` is truly unavoidable (e.g., test mocks), add an inline suppression comment explaining why.

### Interfaces vs Type Aliases

- Use `interface` for object shapes — they have better display, performance, and extensibility
- Use `type` for unions, intersections, tuples, mapped types, and primitive aliases

```typescript
// Object shapes → interface
interface User {
  name: string;
  email: string;
}

// Unions, tuples, primitives → type
type Result = Success | Failure;
type Pair = [string, number];
type UserId = string;
```

### Branded/Opaque Types

For domain identifiers, prefer branded types over raw primitives — the same principle as Rust newtypes:

```typescript
type UserId = string & { readonly __brand: unique symbol };
type TenantId = string & { readonly __brand: unique symbol };

function createUserId(raw: string): UserId {
  return raw as UserId;
}
```

This prevents mixing `UserId` and `TenantId` at call sites.

### Nullability

- Use `T | null` or `T | undefined` at the point of use. Never bake nullability into type aliases
- Use optional (`?`) for fields/params that can be omitted. Use `| undefined` for fields that are always present but may lack a value
- Deal with null close to the source — don't propagate nullable types through many layers

### No Wrapper Types

Never use `String`, `Boolean`, `Number`, `Object`. Always use lowercase primitives: `string`, `boolean`, `number`, `object`.

### Arrays

Use `T[]` for simple element types. Use `Array<T>` when the element type is complex (unions, objects):

```typescript
const names: string[];
const items: Array<string | number>;
```

### Enums

Use `enum`, not `const enum`. Always include a `default` or exhaustive check when switching over enums.

### Generics

Every type parameter must be used. No phantom generics. Avoid return-type-only generics — when using APIs that have them, always specify the type argument explicitly.

### Prefer Simplest Type Construct

Avoid `Pick`, `Omit`, mapped types, and conditional types when spelling out the fields is simpler and more readable. Complex utility types hurt IDE support and readability.

## Error Handling

- **Fail fast with context.** Throw `new Error("message")` (never bare `Error()`). Include what operation failed, what input caused it, and a suggested fix when possible
- **Never swallow exceptions.** Every `catch` must either rethrow, log and rethrow, or handle meaningfully. Empty `catch {}` blocks are forbidden
- **Use `unknown` for caught errors.** TypeScript catch binds as `unknown` — narrow before accessing properties:

```typescript
try {
  await fetchData();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(`Failed to fetch data: ${message}`);
}
```

- **Callbacks that ignore errors must use `void` return type**, not `any`
- **Validate at system boundaries** (user input, API responses, file reads). Trust internal types

## Imports and Exports

- **Named exports only.** No `export default` — it produces inconsistent import names and defeats find-references tooling
- **No mutable exports.** Never `export let`. Use getter functions if the value changes
- **No container classes.** Don't wrap static methods/constants in a class for namespacing — export them individually
- **No `import type` / `export type`.** TypeScript tooling distinguishes type vs value usage automatically. Exception: `export type Foo = ...` (defining a type alias) is fine
- **No namespace or `require`.** ESM `import`/`export` only
- **Prefer destructured imports** for frequently used symbols (test utilities, framework primitives). Use namespace imports (`import * as foo`) for large APIs to avoid import churn

## Control Flow

### Strict Equality

Always `===` and `!==`. The only exception: `== null` to check both `null` and `undefined`.

### Exhaustive Switches

Every `switch` must have a `default` case. For discriminated unions, use an exhaustiveness check:

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

switch (action.type) {
  case "create": return handleCreate(action);
  case "delete": return handleDelete(action);
  default: return assertNever(action);
}
```

Non-empty cases must not fall through. Empty cases may group.

### No `forEach`

Never use `Array.prototype.forEach`, `Set.prototype.forEach`, or `Map.prototype.forEach`. They prevent early returns, break compiler reachability analysis, and make debugging harder. Use `for...of`:

```typescript
// Bad
items.forEach((item) => { process(item); });

// Good
for (const item of items) {
  process(item);
}
```

### No `for...in`

Never use `for...in` — it iterates prototype chain properties and gives string indices for arrays. Use `for...of`, `Object.keys()`, or `Object.entries()`.

### Blocks Required

Multi-line control flow must use braces. Single-statement `if` on one line is acceptable: `if (done) return;`

## Variables

- Always `const` or `let`, never `var`
- Default to `const`; use `let` only when reassignment is needed
- No use before declaration

## Classes and Visibility

- **Minimize exported surface.** Only export what consumers need. Convert private methods to non-exported module functions when possible
- **Never write `public` explicitly** — it's the default. Exception: non-readonly constructor parameter properties
- **Use `readonly`** on every property not reassigned after construction
- **Use parameter properties** to avoid boilerplate constructor-to-field plumbing
- **Initialize fields at declaration** when possible, eliminating the constructor
- **No `#private` fields.** Use TypeScript `private` keyword — `#` fields cause size/perf regressions when downleveled
- **Getters must be pure** (no side effects). Avoid trivial pass-through getter/setter pairs — just make the property `readonly` or public
- **No arrow-function class properties** unless you need a stable `this` reference for event handler unregistration

## Functions

- Use `function` declarations for named functions (top-level and nested). They can't be reassigned
- Use arrow functions for callbacks and expressions
- Arrow function callbacks that ignore their return value must use block body, not expression body
- Never use `bind()` for event handlers — it creates unreferenceable temporary functions. Use arrow functions or arrow-function properties
- Semicolons required — do not rely on ASI

## Magic Values

Hardcoded numbers, strings, and timeouts require a comment explaining *why that value*:

```typescript
// 30s matches the server-side request timeout
const POLL_TIMEOUT_MS = 30_000;
```

## Comments and Documentation

- **JSDoc (`/** */`)** for public API consumed by other modules — document purpose, not types (TypeScript already has them)
- **Line comments (`//`)** for implementation notes only
- No `@param` / `@return` tags that just restate the parameter name or type. Only add them when providing information beyond what the signature shows
- No `@override` — it's not compiler-enforced and drifts from implementation
- No commented-out code — delete it. Git has history
- Place JSDoc before decorators, not between decorator and declaration

## Coercion

- String: `String(x)` or template literals. Never `"" + x`
- Number: `Number(x)`, then check `isNaN`. Never unary `+`. Use `parseInt` only for non-base-10
- Boolean: rely on implicit truthiness in conditionals. No `!!x` inside `if`/`while`/`for`. Explicit comparisons (`arr.length > 0`) are fine

## Spread

- Only spread objects into objects, iterables into arrays
- Never spread `null`, `undefined`, or primitives
- Use ternary for conditional spread: `{ ...base, ...(condition ? extra : {}) }`, not `...(condition && extra)`

## Testing

- **Test behavior, not implementation.** Refactors should not break tests
- **Test edges and errors.** Empty inputs, boundaries, malformed data, missing values
- **Mock boundaries only.** Network, filesystem, external services. Never mock internal logic
- **Colocate tests.** `*.test.ts` next to the source file
- **Use `vitest`** as the test runner

## Anti-Patterns

| Never do this | Do this instead |
|---------------|-----------------|
| `any` | `unknown` + type narrowing |
| `export default` | Named exports |
| `var` | `const` / `let` |
| `.forEach()` | `for...of` |
| `for...in` | `for...of` / `Object.entries()` |
| `@ts-ignore` | Fix the type error |
| Type assertions (`as Foo`) without justification | Runtime type guards / narrowing |
| Non-null assertions (`x!`) without justification | Null checks |
| `== ` / `!=` (except `== null`) | `===` / `!==` |
| `new String()` / `new Boolean()` / `new Number()` | Primitive literals |
| `Array()` constructor | Array literals `[]` |
| `namespace` | ES modules |
| `require()` | `import` |
| `debugger` | Remove before commit |
| Empty `catch {}` | Handle or rethrow |
| `console.log` in production code | Structured logging |
