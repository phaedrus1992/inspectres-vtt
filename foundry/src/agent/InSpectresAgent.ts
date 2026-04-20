/**
 * InSpectres Agent Actor
 * Represents a player character (paranormal investigator)
 */
export class InSpectresAgent extends Actor {
  /**
   * Get effective skill value (base - penalty, min 0)
   */
  getEffectiveSkill(skill: "academics" | "athletics" | "technology" | "contact"): number {
    const system = this.system as unknown as { skills: Record<string, { base: number; penalty: number }> };
    const skillData = system.skills?.[skill];
    if (!skillData) return 0;
    return Math.max(0, skillData.base - skillData.penalty);
  }

  /**
   * Award franchise dice from a skill roll
   */
  async awardFranchiseDice(amount: number) {
    const current = (this.system as unknown as { missionPool: number }).missionPool;
    await this.update({
      "system.missionPool": current + amount,
    } as Parameters<Actor["update"]>[0]);
  }
}
