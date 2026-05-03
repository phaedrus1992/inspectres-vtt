/**
 * End-of-session bonuses: hazard pay, characteristics bonus
 * Hazard Pay (rules p.436): +1 franchise die per non-weird agent when death mode enabled
 * Characteristics Bonus: +1 to random unused characteristic
 */

export interface ActorWithWeirdFlag {
  readonly isWeird: boolean;
}

/**
 * Calculate hazard pay: +1 franchise die per non-weird agent in death mode
 */
export function calculateHazardPay(actors: ActorWithWeirdFlag[], deathMode: boolean): number {
  if (!deathMode) return 0;
  return actors.filter((a) => !a.isWeird).length;
}

/**
 * Select a random unused characteristic for the end-of-session bonus
 * Returns null if no characteristics available
 */
export async function selectRandomCharacteristic(unused: string[]): Promise<string | null> {
  if (unused.length === 0) return null;
  const roll = await new Roll(`1d${unused.length}`).evaluate();
  const index = (roll.total ?? 1) - 1; // d1d{n} returns 1–n, subtract 1 for 0-based index
  return unused[index] ?? null;
}
