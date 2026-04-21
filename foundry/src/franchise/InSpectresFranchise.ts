/**
 * InSpectres Franchise Actor
 * Represents the paranormal investigation franchise (shared resources)
 */

export class InSpectresFranchise extends Actor {
  /**
   * Get total franchise dice
   */
  getTotalDice(): number {
    const system = this.system as any;
    return system.cards.library + system.cards.gym + system.cards.credit + system.bank;
  }

  /**
   * Award franchise dice from a skill roll
   */
  async awardMissionDice(amount: number) {
    const system = this.system as any;
    const current = system.missionPool as number;
    await this.update({
      "system.missionPool": current + amount,
    } as any);
  }
}
