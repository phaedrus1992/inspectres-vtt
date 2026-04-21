/**
 * InSpectres Agent Actor
 * Represents a player character (paranormal investigator)
 */

export class InSpectresAgent extends Actor {
  /**
   * Get effective skill value (base - penalty, min 0)
   */
  getEffectiveSkill(skill: "academics" | "athletics" | "technology" | "contact"): number {
    const skillData = this.system as any;
    return Math.max(0, skillData.skills[skill].base - skillData.skills[skill].penalty);
  }

  /**
   * Award franchise dice from a skill roll
   */
  async awardFranchiseDice(amount: number) {
    const system = this.system as any;
    const current = system.missionPool as number;
    await this.update({
      "system.missionPool": current + amount,
    } as any);
  }
}
