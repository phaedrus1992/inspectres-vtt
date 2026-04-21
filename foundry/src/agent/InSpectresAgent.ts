/**
 * InSpectres Agent Actor
 * Represents a player character (paranormal investigator)
 */

import type { AgentData } from "./agent-schema.js";

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

export class InSpectresAgent extends Actor {
  /**
   * Get effective skill value (base - penalty, min 0)
   */
  getEffectiveSkill(skill: "academics" | "athletics" | "technology" | "contact"): number {
    try {
      const system = this.system as unknown as AgentData;
      const skillData = system.skills?.[skill];
      if (!skillData) return 0;
      return Math.max(0, skillData.base - skillData.penalty);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to get effective skill '${skill}':`, message);
      return 0;
    }
  }

  /**
   * Award franchise dice from a skill roll
   */
  async awardFranchiseDice(amount: number): Promise<void> {
    return addToMissionPool(this, amount);
  }
}
