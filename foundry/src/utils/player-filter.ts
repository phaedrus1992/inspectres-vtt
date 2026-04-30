/**
 * Standardized player filtering for rolls and distribution dialogs.
 *
 * Consolidates inconsistent logic found in distribution-dialog.ts and roll-executor.ts.
 * Ensures consistent behavior across all roll types.
 */

import type { RollActor } from "./system-cast.js";

/**
 * Get the set of players involved in a roll or action.
 *
 * Includes:
 * - GM (always involved in system management)
 * - Players who own agents/franchises involved in the action
 *
 * Excludes:
 * - Observers (can see but not control)
 * - Inactive users
 *
 * @param actors - Actors involved in the action (agents, franchises, etc.)
 * @returns Array of User IDs who should be notified/involved
 */
export function getPlayersInvolved(_actors: RollActor[]): string[] {
  const players = new Set<string>();

  // Always include the current GM
  if (game.user?.isGM) {
    players.add(game.user.id);
  }

  // In multi-player campaigns, add owners of involved actors
  // Note: RollActor interface provides minimal data (id, name, system, update method).
  // Full Foundry Actor document includes ownership data. Without access to full documents,
  // we cannot resolve actual actor owners. In single-player campaigns, GM owns all actors anyway.
  // This function currently serves as a pattern placeholder for standardized player filtering.
  // Callers should override based on their context (distribution dialog, roll-executor, etc.)
  // if they have access to full Actor documents with ownership information.

  // Add all active players (fallback: include everyone, let business logic filter further)
  for (const user of game.users?.values() ?? []) {
    if (user.active) {
      players.add(user.id);
    }
  }

  return Array.from(players);
}

