/**
 * InSpectres Franchise Actor
 * Represents the paranormal investigation franchise (shared resources)
 */

import type { FranchiseData } from "./franchise-schema.js";

/**
 * Add franchise dice to an actor's mission pool
 */
async function addToMissionPool(actor: Actor, amount: number): Promise<void> {
  try {
    const system = actor.system as unknown as { missionPool: number };
    const current = system.missionPool;
    await actor.update({
      "system.missionPool": current + amount,
    } as Parameters<typeof actor.update>[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to add to mission pool:", message);
    throw err;
  }
}

export class InSpectresFranchise extends Actor {
  /**
   * Get total franchise dice
   */
  getTotalDice(): number {
    try {
      const system = this.system as unknown as FranchiseData;
      return system.cards.library + system.cards.gym + system.cards.credit + system.bank;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to calculate total dice:", message);
      return 0;
    }
  }

  /**
   * Award mission dice from a job
   */
  async awardMissionDice(amount: number): Promise<void> {
    return addToMissionPool(this, amount);
  }
}
