/**
 * Exhaustiveness check for discriminated unions and string literal types.
 * Place in the `default` arm of a switch to make TypeScript fail compilation
 * if a new variant is added without a matching case.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
