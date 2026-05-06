/**
 * Vacation & End-of-Session Automation
 * Hazard Pay, Characteristics Bonus, Bankruptcy Restart
 */

import { getActorSystem } from "../utils/system-cast.js";
import { calculateHazardPay } from "./end-of-session-bonuses.js";
import { type FranchiseData } from "./franchise-schema.js";
import { stopDialogSubmitPropagation } from "../utils/dialog-utils.js";

function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface EndOfSessionContext {
  readonly franchiseActor: Actor;
  readonly deathMode: boolean;
  readonly agentCount: number;
  readonly nonWeirdAgentCount: number;
}

export interface BankruptcyRestartResult {
  success: boolean;
  restarted: boolean;
}

/**
 * Apply end-of-session bonuses: hazard pay + characteristics bonus
 */
export async function applyEndOfSessionBonuses(context: EndOfSessionContext): Promise<void> {
  const system = getActorSystem<FranchiseData>(context.franchiseActor);

  let banUpdate = system.bank;

  // Apply hazard pay: +1 franchise die per non-weird agent (death mode only)
  // Get all agents from the world, not items on the franchise actor
  const actors = game.actors ?? [];
  const agentActors: Array<{ isWeird: boolean }> = [];
  for (const actor of actors) {
    if ((actor as unknown as Record<string, unknown>)["type"] === "agent") {
      const system = actor.system as Record<string, unknown>;
      agentActors.push({ isWeird: (system["isWeird"] ?? false) as boolean });
    }
  }
  const hazardPay = calculateHazardPay(agentActors, context.deathMode);
  if (hazardPay > 0) {
    banUpdate += hazardPay;
    ui.notifications?.info(
      game.i18n?.format("INSPECTRES.NotifyHazardPay", { amount: String(hazardPay) }) ??
        `Hazard pay awarded: +${hazardPay} dice (${context.nonWeirdAgentCount} non-weird agents in death mode).`,
    );
  }

  // Characteristics bonus: +1 to random unused characteristic (if available)
  // For now, log that bonus is available; actual application done via dialog/UI
  ui.notifications?.info(
    game.i18n?.localize("INSPECTRES.NotifyCharacteristicsBonus") ??
      "Characteristics bonus available: +1 to unused characteristic (select at agent sheet).",
  );

  // Update franchise bank
  if (banUpdate !== system.bank) {
    try {
      // Type: Actor.update() uses dotted paths; cast matches Foundry API
      const updateData = { "system.bank": banUpdate } as unknown as Parameters<typeof context.franchiseActor.update>[0];
      await context.franchiseActor.update(updateData);
    } catch (err: unknown) {
      const message = extractErrorMessage(err);
      ui.notifications?.error(`Failed to apply hazard pay: ${message}`);
      throw err;
    }
  }
}

/**
 * Initiate bankruptcy restart: confirm with GM, wipe agent Cool, reset franchise
 */
export async function initiateBankruptcyRestart(franchiseActor: Actor): Promise<BankruptcyRestartResult> {
  if (!game.user?.isGM) {
    ui.notifications?.error(
      game.i18n?.localize("INSPECTRES.ErrorBankruptcyRestartGMOnly") ?? "Only the GM can initiate bankruptcy restart.",
    );
    return { success: false, restarted: false };
  }

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n?.localize("INSPECTRES.DialogBankruptcyRestart") ?? "Franchise Bankruptcy Restart" },
    render: stopDialogSubmitPropagation,
    content: `
      <p>${game.i18n?.localize("INSPECTRES.BankruptcyRestartWarning") ?? "Franchise is bankrupt. Restart requires:"}</p>
      <ul>
        <li>${game.i18n?.localize("INSPECTRES.BankruptcyRestartStep1") ?? "Wipe all agent Cool (all agents)"}</li>
        <li>${game.i18n?.localize("INSPECTRES.BankruptcyRestartStep2") ?? "Reset franchise: bank = 0, no debt, no loans"}</li>
        <li>${game.i18n?.localize("INSPECTRES.BankruptcyRestartStep3") ?? "Begin new campaign with fresh franchise"}</li>
      </ul>
      <p><strong>${game.i18n?.localize("INSPECTRES.BankruptcyRestartConfirm") ?? "Proceed with restart?"}</strong></p>
    `,
  });

  if (!confirmed) {
    ui.notifications?.info(
      game.i18n?.localize("INSPECTRES.BankruptcyRestartCancelled") ?? "Bankruptcy restart cancelled.",
    );
    return { success: false, restarted: false };
  }

  // Wipe Cool from all agents in the world
  const actors = game.actors ?? [];
  for (const actor of actors) {
    if ((actor as unknown as Record<string, unknown>)["type"] === "agent") {
      const systemData = actor.system as Record<string, unknown>;
      if (systemData["cool"] !== undefined) {
        try {
          // Type: Actor.update() uses dotted paths; cast matches Foundry API
          const updateData = { "system.cool": 0 } as unknown as Parameters<typeof actor.update>[0];
          await actor.update(updateData);
        } catch (err: unknown) {
          const message = extractErrorMessage(err);
          ui.notifications?.error(`Failed to wipe Cool from ${actor.name}: ${message}`);
          throw err;
        }
      }
    }
  }

  // Reset franchise
  try {
    // Type: Actor.update() uses dotted paths; cast matches Foundry API
    const resetData = {
      "system.bank": 0,
      "system.debtMode": false,
      "system.cardsLocked": false,
      "system.loanAmount": 0,
      "system.missionPool": 0,
      "system.missionGoal": 0,
    } as unknown as Parameters<typeof franchiseActor.update>[0];
    await franchiseActor.update(resetData);
  } catch (err: unknown) {
    const message = extractErrorMessage(err);
    ui.notifications?.error(`Failed to reset franchise: ${message}`);
    throw err;
  }

  ui.notifications?.warn(
    game.i18n?.localize("INSPECTRES.NotifyBankruptcyRestart") ??
      "Franchise restarted: all agent Cool wiped, franchise reset. Begin new campaign.",
  );

  return { success: true, restarted: true };
}
