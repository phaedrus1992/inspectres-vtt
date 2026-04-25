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
  return (game.settings as unknown as { set: (namespace: string, key: string, value: unknown) => Promise<unknown> })?.set(
    "inspectres",
    "currentDay",
    day,
  );
}
