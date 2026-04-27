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
 *
 * @example
 * const system = getActorSystem<AgentData>(this.actor);
 * // Instead of: this.actor.system as unknown as AgentData (repeated 11+ times in sheets)
 */
export function getActorSystem<T extends object>(actor: RollActor): T {
  // Type narrowing: test fixture implements minimal RollActor interface needed for roll execution.
  // Full Actor type includes 128+ Foundry properties unused in this context.
  return actor.system as unknown as T;
}
