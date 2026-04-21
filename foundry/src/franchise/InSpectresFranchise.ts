/**
 * InSpectres Franchise Actor
 * Represents the paranormal investigation franchise (shared resources)
 */

import type { FranchiseData } from "./franchise-schema.js";

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
   * Award franchise dice from a skill roll
   */
  async awardMissionDice(amount: number): Promise<void> {
    try {
      const system = this.system as unknown as FranchiseData;
      const current = system.missionPool;
      await this.update({
        "system.missionPool": current + amount,
      } as Parameters<Actor["update"]>[0]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to award mission dice:", message);
      throw err;
    }
  }
}
