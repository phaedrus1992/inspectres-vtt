/**
 * Mid-mission Cool → Skill Recovery
 * Allows agents to spend Cool dice to restore skill points during a mission
 * Rules: 1 Cool die = +1 skill point (restores stress penalty)
 */

import { agentSystemData } from "./agent-system-data.js";
import { computeRecoveryStatus, getCurrentDay } from "./recovery-utils.js";
import type { SkillName } from "../rolls/roll-executor.js";
import type { AgentData } from "./agent-schema.js";

export interface SkillRecoveryResult {
  readonly success: boolean;
  readonly reason?: string;
  readonly notificationKey?: string;
}

/**
 * Execute mid-mission Cool → skill recovery
 * @param agent - The agent spending Cool
 * @param skillName - Which skill to restore
 * @param coolSpent - How many Cool dice to spend
 * @returns Result with success status and localization key for notification
 */
export async function executeSkillRecovery(
  agent: Actor,
  skillName: SkillName,
  coolSpent: number,
): Promise<SkillRecoveryResult> {
  const system = agentSystemData(agent);
  const currentDay = getCurrentDay();
  const recoveryStatus = computeRecoveryStatus(system, currentDay);

  // Prevent spending Cool while recovering or dead
  if (recoveryStatus.status === "recovering" || recoveryStatus.status === "dead") {
    return {
      success: false,
      reason: "Cannot spend Cool while recovering or dead",
    };
  }

  // Validate Cool availability
  if (coolSpent > system.cool) {
    return {
      success: false,
      reason: `Not enough Cool dice (have ${system.cool}, need ${coolSpent})`,
    };
  }

  if (coolSpent < 1) {
    return {
      success: false,
      reason: "Must spend at least 1 Cool die",
    };
  }

  // Get skill data
  const skillData = system.skills[skillName];
  if (!skillData) {
    return {
      success: false,
      reason: `Skill ${skillName} not found`,
    };
  }

  // Calculate new penalty: reduce by coolSpent, but not below 0
  const currentPenalty = skillData.penalty;
  const newPenalty = Math.max(0, currentPenalty - coolSpent);
  const newCool = system.cool - coolSpent;

  // Apply updates
  try {
    const updateData = {
      [`system.skills.${skillName}.penalty`]: newPenalty,
      "system.cool": newCool,
    } as unknown as Parameters<typeof agent.update>[0];

    await agent.update(updateData);

    // Notify success
    const recovered = currentPenalty - newPenalty;
    ui.notifications?.info(
      game.i18n?.format("INSPECTRES.NotifySkillRecovered", {
        skill: game.i18n?.localize(`INSPECTRES.Skill.${skillName}`) ?? skillName,
        recovered: String(recovered),
        cool: String(coolSpent),
      }) ??
        `Recovered ${recovered} ${skillName} point(s) for ${coolSpent} Cool die(cool=${newCool} remaining).`,
    );

    return {
      success: true,
      notificationKey: "INSPECTRES.NotifySkillRecovered",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    ui.notifications?.error(`Failed to spend Cool: ${message}`);
    return {
      success: false,
      reason: `Update failed: ${message}`,
    };
  }
}
