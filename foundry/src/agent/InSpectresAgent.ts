/**
 * InSpectres Agent Actor
 * Represents a player character (paranormal investigator)
 */

import type { AgentData } from "./agent-schema.js";
import { agentSystemData } from "./agent-system-data.js";

export class InSpectresAgent extends Actor {
  /**
   * Get effective skill value (base - penalty, min 0)
   */
  getEffectiveSkill(skill: "academics" | "athletics" | "technology" | "contact"): number {
    const system = agentSystemData(this as Actor);
    const skillData = system.skills?.[skill];
    if (!skillData) return 0;
    return Math.max(0, skillData.base - skillData.penalty);
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
      const isWeird = (systemChanges["isWeird"] ?? agentSystemData(this as Actor).isWeird) as boolean;
      const maxSkill = isWeird ? 10 : 4;
      const skillChanges = systemChanges["skills"] as Record<string, { base?: number }> | undefined;
      if (skillChanges) {
        for (const skill of Object.values(skillChanges)) {
          if (skill && "base" in skill && typeof skill.base === "number" && skill.base > maxSkill) {
            throw new Error(`Skill value ${skill.base} exceeds max of ${maxSkill} for ${isWeird ? "weird" : "normal"} agent (p.42, p.59)`);
          }
        }
      }
    }

    // Issue #227, #267: Talent field gating for weird agents
    if (systemChanges && "talent" in systemChanges && typeof systemChanges["talent"] === "string" && systemChanges["talent"]) {
      const isWeird = (systemChanges["isWeird"] ?? agentSystemData(this as Actor).isWeird) as boolean;
      if (isWeird) {
        throw new Error("Weird agents cannot have Talent (p.42, p.59). Clear the Talent field.");
      }
    }

    // Issue #256: Validate skill distribution budget
    if (systemChanges && ("skills" in systemChanges || "isWeird" in systemChanges)) {
      const isWeird = (systemChanges["isWeird"] ?? agentSystemData(this as Actor).isWeird) as boolean;
      const skills = (systemChanges["skills"] ?? agentSystemData(this as Actor).skills) as Record<string, { base: number }> | undefined;
      if (skills) {
        const totalDice = Object.values(skills).reduce((sum, skill) => sum + (skill?.base ?? 0), 0);
        const maxDice = isWeird ? 10 : 9;
        if (totalDice > maxDice) {
          throw new Error(`Skill total ${totalDice} exceeds max of ${maxDice} dice for ${isWeird ? "weird" : "normal"} agent (p.42, p.59)`);
        }
      }
    }

    return result;
  }

  override async _preCreate(
    data: unknown,
    options: unknown,
    user: unknown,
  ): Promise<boolean | void> {
    const source = (data as Record<string, unknown>)?.["system"] as Record<string, unknown> | undefined;
    const isWeird = source?.["isWeird"] as boolean | undefined;

    // Validate BEFORE calling super._preCreate() to ensure atomicity:
    // either all checks pass and actor is created, or validation fails and actor doesn't exist.

    // Issue #219, #257: Enforce exactly one weird agent per franchise
    if (isWeird) {
      if (!game.actors) {
        throw new Error("Unable to check for existing weird agents—game.actors not initialized");
      }
      const existingWeirdAgents = game.actors.filter((actor) => {
        const actorSystem = actor.system as Record<string, unknown> | undefined;
        const actorIsWeird = actorSystem?.["isWeird"] as boolean | undefined;
        return String(actor.type) === "agent" && actorIsWeird === true;
      });
      if (existingWeirdAgents.length > 0) {
        throw new Error("Only one weird agent allowed per system (p.53). A weird agent already exists.");
      }
    }

    // Issue #227: Talent not allowed on weird agents at creation
    const talent = source?.["talent"] as string | undefined;
    if (isWeird && talent) {
      throw new Error("Weird agents cannot have Talent (p.42, p.59). Clear the Talent field before creating a weird agent.");
    }

    // Issue #256: Validate skill budget at creation
    const skills = source?.["skills"] as Record<string, { base: number }> | undefined;
    if (skills) {
      const totalDice = Object.values(skills).reduce((sum, skill) => sum + (skill?.base ?? 0), 0);
      const maxDice = isWeird ? 10 : 9;
      if (totalDice > maxDice) {
        throw new Error(`Skill total ${totalDice} exceeds max of ${maxDice} dice for ${isWeird ? "weird" : "normal"} agent (p.42, p.59)`);
      }
    }

    // All validations passed; proceed with actor creation.
    return await super._preCreate(data as Parameters<Actor["_preCreate"]>[0], options as Parameters<Actor["_preCreate"]>[1], user as Parameters<Actor["_preCreate"]>[2]);
  }
}
