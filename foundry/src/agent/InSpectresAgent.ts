/**
 * InSpectres Agent Actor
 * Represents a player character (paranormal investigator)
 */

import type { AgentData } from "./agent-schema.js";
import { agentSystemData } from "./agent-system-data.js";

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
      const system = agentSystemData(this as unknown as Actor);
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

  override async _preUpdate(
    changed: unknown,
    options: unknown,
    userId: unknown,
  ): Promise<boolean | void> {
    const result = await super._preUpdate(changed as Parameters<Actor["_preUpdate"]>[0], options as Parameters<Actor["_preUpdate"]>[1], userId as Parameters<Actor["_preUpdate"]>[2]);
    const userIdStr = String(userId);
    const user = game.users?.get(userIdStr as never);
    if (user?.isGM) return result;
    const systemChanges = (changed as Record<string, unknown>)["system"] as Record<string, unknown> | undefined;
    if (systemChanges && ("isDead" in systemChanges || "daysOutOfAction" in systemChanges || "recoveryStartedAt" in systemChanges)) {
      throw new Error("Recovery state can only be modified by the GM");
    }

    // Issue #218: Enforce skill range based on weird agent status
    if (systemChanges && "skills" in systemChanges) {
      const isWeird = (systemChanges["isWeird"] ?? (this.system as unknown as { isWeird: boolean }).isWeird) as boolean;
      const maxSkill = isWeird ? 10 : 4;
      const skillChanges = systemChanges["skills"] as Record<string, { base?: number }> | undefined;
      if (skillChanges) {
        for (const skill of Object.values(skillChanges)) {
          if (skill && "base" in skill && typeof skill.base === "number" && skill.base > maxSkill) {
            throw new Error(`Skill value ${skill.base} exceeds max of ${maxSkill} for ${isWeird ? "weird" : "normal"} agent`);
          }
        }
      }
    }

    return result;
  }
}
