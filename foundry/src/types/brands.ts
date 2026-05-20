/**
 * Branded types for domain identifiers and primitive values.
 * Prevents accidental mixing of IDs and numeric values with similar types.
 * @see https://github.com/Microsoft/TypeScript/wiki/Handbook-Errata#stricter-types-for-primitives-and-objects
 */

declare const ActorIdBrand: unique symbol;
export type ActorId = string & { readonly [ActorIdBrand]: true };

declare const ItemIdBrand: unique symbol;
export type ItemId = string & { readonly [ItemIdBrand]: true };

declare const UserIdBrand: unique symbol;
export type UserId = string & { readonly [UserIdBrand]: true };

declare const DayNumberBrand: unique symbol;
export type DayNumber = number & { readonly [DayNumberBrand]: true };

declare const DiceCountBrand: unique symbol;
export type DiceCount = number & { readonly [DiceCountBrand]: true };

declare const StressValueBrand: unique symbol;
export type StressValue = number & { readonly [StressValueBrand]: true };

export function createActorId(raw: string): ActorId {
  return raw as ActorId;
}

export function createItemId(raw: string): ItemId {
  return raw as ItemId;
}

export function createUserId(raw: string): UserId {
  return raw as UserId;
}

export function createDayNumber(raw: number): DayNumber {
  return (Math.max(0, Math.floor(raw)) as unknown) as DayNumber;
}

export function createDiceCount(raw: number): DiceCount {
  return (Math.max(0, Math.floor(raw)) as unknown) as DiceCount;
}

export function createStressValue(raw: number): StressValue {
  return (Math.max(0, Math.min(6, Math.floor(raw))) as unknown) as StressValue;
}
