/**
 * InSpectres Franchise Actor
 * Represents the paranormal investigation franchise (shared resources)
 */
export class InSpectresFranchise extends Actor {
  /**
   * Get total franchise dice
   */
  getTotalDice(): number {
    const system = this.system as unknown as {
      cards: { library: number; gym: number; credit: number };
      bank: number;
    };
    return system.cards.library + system.cards.gym + system.cards.credit + system.bank;
  }

  /**
   * Award franchise dice from a skill roll
   */
  async awardMissionDice(amount: number) {
    const current = (this.system as unknown as { missionPool: number }).missionPool;
    await this.update({
      "system.missionPool": current + amount,
    } as Parameters<Actor["update"]>[0]);
  }
}
