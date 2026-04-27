/**
 * Day Counter - Franchise sheet day management
 * Allows GMs to increment/decrement or directly set the current day
 * Auto-triggers recovery auto-clear when day advances
 */

const DAY_SETTING_KEY = "currentDay";
const MIN_DAY = 1;

/**
 * Get the current day from settings
 */
export function getCurrentDay(): number {
  const day = (game.settings as unknown as { get: (scope: string, key: string) => unknown })?.get("inspectres", DAY_SETTING_KEY) as number | undefined;
  return day ?? MIN_DAY;
}

/**
 * Update the current day (increment, decrement, or direct set)
 * @param delta - If directSet=false, +1, -1, etc. If directSet=true, absolute day number
 * @param directSet - If true, sets to exact day; if false, increments/decrements by delta
 */
export async function updateCurrentDay(delta: number, directSet: boolean = false): Promise<void> {
  const current = getCurrentDay();
  const newDay = directSet ? delta : current + delta;
  const clamped = Math.max(MIN_DAY, newDay);

  try {
    await (game.settings as unknown as { set: (scope: string, key: string, value: unknown) => Promise<unknown> })?.set("inspectres", DAY_SETTING_KEY, clamped);
    ui.notifications?.info(
      game.i18n?.format("INSPECTRES.NotifyDayAdvanced", { day: String(clamped) }) ??
        `Day advanced to ${clamped}.`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    ui.notifications?.error(`Failed to update day: ${message}`);
    throw err;
  }
}

/**
 * Advance day by 1 (convenience function for +Day button)
 */
export async function advanceDay(): Promise<void> {
  await updateCurrentDay(1, false);
}

/**
 * Go back 1 day (convenience function for -Day button)
 */
export async function rewindDay(): Promise<void> {
  await updateCurrentDay(-1, false);
}
