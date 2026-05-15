import {
  STRESS_ROLL_CHART,
  DEATH_DISMEMBERMENT_CHART,
  type DeathDismembermentOutcome,
  type StressRollOutcome,
} from "./roll-charts.js";
import { type AgentData } from "../agent/agent-schema.js";
import { agentSystemData } from "../agent/agent-system-data.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";
import { getCurrentDay } from "../agent/recovery-utils.js";
import { stopDialogSubmitPropagation } from "../utils/dialog-utils.js";
import { getActorSystem, type RollActor } from "../utils/system-cast.js";
import { isDieFace, actorUpdate, rollDice, postChatCard } from "./roll-helpers.js";
import { type SkillName, type StressRollParams, type DieFace, type D3Result } from "./roll-types.js";

// All valid skills for penalty selection — drives dialog rendering and validation.
// If SkillName ever changes, this constant fails to compile until updated.
export const SKILL_NAMES = ["academics", "athletics", "technology", "contact"] as const satisfies readonly SkillName[];

function isSkillName(value: string): value is SkillName {
  return (SKILL_NAMES as readonly string[]).includes(value);
}

function applySkillPenalty(
  updateData: Record<string, unknown>,
  system: AgentData,
  penaltyAmount: number,
  targetSkill: SkillName,
): void {
  const currentPenalty = system.skills[targetSkill]?.penalty ?? 0;
  updateData[`system.skills.${targetSkill}.penalty`] = currentPenalty + penaltyAmount;
}

async function getPlayerPenaltyChoice(
  system: AgentData,
  penaltyAmount: number,
): Promise<SkillName | null> {
  const skills: Array<{ name: SkillName; rank: number }> = SKILL_NAMES.map((name) => ({
    name,
    rank: system.skills[name]?.base ?? 0,
  }));

  const content = `
    <div class="inspectres-penalty-dialog">
      <p><strong>${game.i18n?.localize("INSPECTRES.PenaltyDialogPrompt") ?? "Choose a skill to penalize"}</strong></p>
      <p>${game.i18n?.format("INSPECTRES.PenaltyDialogAmount", { amount: String(penaltyAmount) }) ?? `Penalty: -${penaltyAmount} die`}</p>
      ${skills.map((skill, idx) => `
        <label><input type="radio" name="selectedSkill" value="${skill.name}"${idx === 0 ? " checked" : ""}> ${game.i18n?.localize(`INSPECTRES.Skill.${skill.name}`) ?? skill.name} (${skill.rank})</label>
      `).join("")}
    </div>
  `;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n?.localize("INSPECTRES.PenaltyDialogTitle") ?? "Stress Penalty" },
    // #587: Constrain penalty dialog to content height (prevents viewport stretch).
    position: { height: 280 },
    // #551: modal so the penalty dialog renders above the agent sheet that opened it.
    modal: true,
    rejectClose: false,
    render: stopDialogSubmitPropagation,
    content,
    buttons: [
      {
        // #553: No `default: true` — V13 routes X-close through the default button's
        // callback, which would read the pre-checked first radio and silently apply a
        // penalty. Without a default, X-close resolves to null and the cancel branch runs.
        action: "select",
        label: game.i18n?.localize("INSPECTRES.DialogOK") ?? "OK",
        callback: (_event: Event, _button: HTMLButtonElement, dialog: foundry.applications.api.DialogV2) => {
          const form = dialog.element.querySelector("form") as HTMLFormElement | null;
          if (!form) return null;
          const data = new FormData(form);
          const selectedSkill = data.get("selectedSkill");
          if (typeof selectedSkill !== "string") return null;
          if (!isSkillName(selectedSkill)) return null;
          return selectedSkill;
        },
      },
      {
        action: "cancel",
        label: game.i18n?.localize("INSPECTRES.DialogCancel") ?? "Cancel",
        callback: () => null,
      },
    ],
  });

  if (result === null || result === undefined) return null;
  return result as SkillName;
}

/** Compute effective face after cool dice removed. */
function getStressOutcomeFace(faces: number[], coolDiceUsed: number): DieFace {
  const sorted = [...faces].sort((a, b) => a - b);
  const active = sorted.slice(coolDiceUsed);
  const rawLowest = active.length > 0 ? (active[0] ?? 6) : 6;
  return isDieFace(rawLowest) ? rawLowest : 1;
}

/** Roll for death outcome if death mode and outcome is fatal. */
async function rollDeathOutcome(
  agent: RollActor,
  deathModeActive: boolean,
  effectiveFace: DieFace,
): Promise<DeathDismembermentOutcome | null> {
  if (!deathModeActive || effectiveFace > 2) return null;

  const roll = await new Roll("1d3").evaluate();
  const result = roll.total ?? 0;
  if (result < 1 || result > 3) {
    const errorMsg = `Invalid d3 result in death roll: ${result} (expected 1–3). Stress roll aborted. Agent: ${agent.name} (${agent.id})`;
    ui.notifications?.error("[INSPECTRES] Death roll validation failed");
    throw new Error(errorMsg);
  }
  const deathKey = result as D3Result;
  const outcome = DEATH_DISMEMBERMENT_CHART[deathKey];
  if (!outcome) {
    const errorMsg = `Death outcome missing for d3 result ${deathKey}. This indicates corrupted DEATH_DISMEMBERMENT_CHART. Agent: ${agent.name} (${agent.id})`;
    ui.notifications?.error("[INSPECTRES] Death chart lookup failed");
    throw new Error(errorMsg);
  }
  return outcome;
}

/** Get penalty choices from player (before applying updates). */
async function getPenaltyChoices(
  system: AgentData,
  effectiveFace: DieFace,
  outcome: StressRollOutcome,
  stressDiceCount: number,
): Promise<{ meltdownSkill: SkillName | null; penaltySkill: SkillName | null }> {
  let meltdownSkill: SkillName | null = null;
  let penaltySkill: SkillName | null = null;

  if (effectiveFace === 1) {
    meltdownSkill = await getPlayerPenaltyChoice(system, stressDiceCount);
  } else if (outcome.skillPenalty > 0) {
    penaltySkill = await getPlayerPenaltyChoice(system, outcome.skillPenalty);
  }

  return { meltdownSkill, penaltySkill };
}

/** Build update data from stress roll outcome and choices. */
function buildStressUpdateData(
  system: AgentData,
  effectiveFace: DieFace,
  outcome: StressRollOutcome,
  meltdownSkill: SkillName | null,
  penaltySkill: SkillName | null,
  deathOutcome: DeathDismembermentOutcome | null,
  stressDiceCount: number,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  if (effectiveFace === 1) {
    updateData["system.cool"] = 0;
    if (meltdownSkill) {
      applySkillPenalty(updateData, system, stressDiceCount, meltdownSkill);
    }
  } else {
    if (outcome.coolGain > 0) {
      updateData["system.cool"] = system.cool + outcome.coolGain;
    }
    if (penaltySkill) {
      applySkillPenalty(updateData, system, outcome.skillPenalty, penaltySkill);
    }
  }

  if (deathOutcome) {
    if ("isDead" in deathOutcome && deathOutcome.isDead) {
      updateData["system.isDead"] = true;
    } else if ("daysOutOfAction" in deathOutcome) {
      updateData["system.daysOutOfAction"] = deathOutcome.daysOutOfAction;
      updateData["system.recoveryStartedAt"] = getCurrentDay();
    }
  }

  return updateData;
}

export async function executeStressRoll(
  agent: RollActor,
  params: StressRollParams,
  franchise: RollActor | null = null,
): Promise<void> {
  if (!game.user?.isGM) {
    throw new Error("Stress rolls can only be initiated by the GM");
  }

  // Recovery check is the responsibility of the UI layer (AgentSheet).
  // If an agent somehow rolls while recovering due to a UI race condition, the error should propagate to the caller.

  const system = agentSystemData(agent);
  const { stressDiceCount, coolDiceUsed } = params;

  const { roll, faces } = await rollDice(stressDiceCount);
  const effectiveFace = getStressOutcomeFace(faces, coolDiceUsed);
  const outcome = STRESS_ROLL_CHART[effectiveFace];

  const franchiseSystem = franchise ? getActorSystem<FranchiseData>(franchise) : null;
  const deathModeActive = franchiseSystem?.deathMode ?? false;
  const deathOutcome = await rollDeathOutcome(agent, deathModeActive, effectiveFace);

  // Issue #440: Validate all player inputs (penalty dialogs) BEFORE applying any state changes.
  const { meltdownSkill, penaltySkill } = await getPenaltyChoices(system, effectiveFace, outcome, stressDiceCount);

  const updateData = buildStressUpdateData(system, effectiveFace, outcome, meltdownSkill, penaltySkill, deathOutcome, stressDiceCount);

  if (Object.keys(updateData).length > 0) {
    try {
      await actorUpdate(agent, updateData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const failedFields = Object.keys(updateData).join(", ");
      ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorStressRollFailed") ?? "Failed to apply stress roll to agent");
      throw new Error(
        `Failed to apply stress roll to ${agent.name}: ${message}. Failed fields: ${failedFields}`,
      );
    }
  }

  if (!franchiseSystem?.debtMode) {
    // ChatMessage.getSpeaker requires the full Actor type; RollActor satisfies the needed fields at runtime
    const speaker = ChatMessage.getSpeaker({ actor: agent as Actor });
    const content = await foundry.applications.handlebars.renderTemplate("systems/inspectres/templates/roll-card.hbs", {
      rollType: "stress",
      title: game.i18n?.localize("INSPECTRES.StressRoll") ?? "Stress Roll",
      result: deathOutcome?.result ?? outcome.result,
      narration: deathOutcome?.narration ?? outcome.narration,
      stressDiceCount,
      coolDiceUsed,
      diceRolled: faces,
      effectiveFace,
      deathOutcome: deathOutcome ?? null,
      penaltyNote: !deathOutcome && effectiveFace <= 3 ? buildPenaltyNote(effectiveFace as 1 | 2 | 3, stressDiceCount) : null,
    });
    await postChatCard(content, speaker, [roll]);
  }
}

export function buildPenaltyNote(face: 1 | 2 | 3, stressDiceCount: number): string {
  switch (face) {
    case 3:
      return game.i18n?.localize("INSPECTRES.PenaltyNote.Minor") ?? "Minor consequence";
    case 2:
      return game.i18n?.localize("INSPECTRES.PenaltyNote.Major") ?? "Major consequence";
    case 1:
      return game.i18n?.format("INSPECTRES.PenaltyNote.Meltdown", { count: String(stressDiceCount) }) ?? `Meltdown (${stressDiceCount} stress dice)`;
    default: {
      const _exhaustive: never = face;
      throw new Error(`buildPenaltyNote: unexpected face value ${JSON.stringify(_exhaustive)}`);
    }
  }
}
