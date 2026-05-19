/**
 * Utility functions for accessing Foundry game settings with proper typing
 */

import { settingsApi } from "./fvtt-boundary.js";

export function getCurrentDaySetting(): number {
  const value = settingsApi().get("inspectres", "currentDay") as number | undefined;
  return value ?? 1;
}

export async function setCurrentDaySetting(day: number): Promise<unknown> {
  if (!Number.isInteger(day) || day < 1) {
    throw new Error(`Invalid day value: ${day}. Day must be a positive integer.`);
  }
  return settingsApi().set("inspectres", "currentDay", day);
}
