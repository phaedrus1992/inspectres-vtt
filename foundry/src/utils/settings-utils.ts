/**
 * Utility functions for accessing Foundry game settings with proper typing
 */

export function getCurrentDaySetting(): number {
  const value = (game.settings as unknown as { get: (namespace: string, key: string) => unknown })?.get(
    "inspectres",
    "currentDay",
  ) as number | undefined;
  return value ?? 1;
}

export async function setCurrentDaySetting(day: number): Promise<unknown> {
  if (!Number.isInteger(day) || day < 1) {
    throw new Error(`Invalid day value: ${day}. Day must be a positive integer.`);
  }
  return (game.settings as unknown as { set: (namespace: string, key: string, value: unknown) => Promise<unknown> })?.set(
    "inspectres",
    "currentDay",
    day,
  );
}
