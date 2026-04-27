/**
 * Type-safe wrapper for accessing actor.system with proper casting.
 * Consolidates the repeated `as unknown as T` pattern used across sheets.
 *
 * Foundry issue: fvtt-types v13 cannot resolve actor.system to concrete types
 * when using template.json (needs TypeDataModel registration).
 * See foundry-vite.md for full context.
 */

export interface RollActor {
  readonly id: string | null;
  readonly name: string;
  readonly system: object;
  update(data: Record<string, unknown>): Promise<unknown>;
}

/**
 * Cast actor.system to target type with proper double-cast for Foundry compatibility.
 *
 * @template T - The target system type (e.g., AgentData, FranchiseData)
 * @param actor - Actor to cast
 * @returns Properly cast actor.system
 * @throws Error if actor.system is null, undefined, or not an object
 *
 * @example
 * const system = getActorSystem<AgentData>(this.actor);
 * // Instead of: this.actor.system as unknown as AgentData (repeated 11+ times in sheets)
 */
export function getActorSystem<T extends object>(actor: RollActor): T {
  if (!actor.system || typeof actor.system !== "object") {
    throw new Error(
      `Invalid actor.system for "${actor.name ?? actor.id}": expected object, got ${typeof actor.system}. ` +
      `Check that actor is fully loaded before accessing system data.`,
    );
  }
  return actor.system as unknown as T;
}
