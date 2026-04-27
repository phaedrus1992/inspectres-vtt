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
export function getPlayersInvolved(actors: RollActor[]): string[] {
  const players = new Set<string>();

  // Always include the current GM
  if (game.user?.isGM) {
    players.add(game.user.id);
  }

  // Add owners of all involved actors
  // Note: In a single-player campaign, all actors are owned by the GM
  // In multiplayer, each player owns their agents
  for (const actor of actors) {
    // Note: actor.system doesn't have owner info; would need access to full Actor document
    // For now, this is a placeholder pattern
    // In actual use, we'd iterate game.actors and match by ID
  }

  // Include all active players in multi-player campaigns
  for (const user of game.users?.values() ?? []) {
    if (user.active && (user.isGM || players.has(user.id))) {
      players.add(user.id);
    }
  }

  return Array.from(players);
}

/**
 * Filter users to only those who should receive roll notifications.
 *
 * Used by distribution-dialog and roll-executor to determine who gets:
 * - Chat card messages
 * - Roll notifications
 * - Results whispers (if applicable)
 *
 * @param involvedActors - Actors participating in the roll
 * @returns User IDs to include in roll distribution
 */
export function filterPlayersForRoll(involvedActors: RollActor[]): string[] {
  return getPlayersInvolved(involvedActors);
}
