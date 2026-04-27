/**
 * Vacation & End-of-Session Automation
 * Hazard Pay, Characteristics Bonus, Bankruptcy Restart
 */

import { calculateHazardPay, selectRandomCharacteristic } from "./end-of-session-bonuses.js";
import { type FranchiseData } from "./franchise-schema.js";

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
  const system = context.franchiseActor.system as unknown as FranchiseData;

  let banUpdate = system.bank;

  // Apply hazard pay: +1 franchise die per non-weird agent (death mode only)
  const items = context.franchiseActor.items?.contents ?? [];
  const hazardPay = calculateHazardPay(
    items.map((item: any) => ({ isWeird: item.isWeird ?? false })),
    context.deathMode,
  );
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
    const updateData = {
      "system.bank": banUpdate,
    } as unknown as Parameters<typeof context.franchiseActor.update>[0];
    await context.franchiseActor.update(updateData);
  }
}

/**
 * Initiate bankruptcy restart: confirm with GM, wipe agent Cool, reset franchise
 */
export async function initiateBankruptcyRestart(franchiseActor: Actor): Promise<BankruptcyRestartResult> {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n?.localize("INSPECTRES.DialogBankruptcyRestart") ?? "Franchise Bankruptcy Restart" },
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

  // Wipe Cool from all agents
  const items = franchiseActor.items?.contents ?? [];
  for (const agent of items) {
    const agentData = agent as any;
    if (agentData.system?.cool !== undefined) {
      const updateData = {
        "system.cool": 0,
      } as unknown as Parameters<typeof agentData.update>[0];
      await agentData.update(updateData);
    }
  }

  // Reset franchise
  const system = franchiseActor.system as unknown as FranchiseData;
  const resetData = {
    "system.bank": 0,
    "system.debtMode": false,
    "system.cardsLocked": false,
    "system.loanAmount": 0,
    "system.missionPool": 0,
    "system.missionGoal": 0,
  } as unknown as Parameters<typeof franchiseActor.update>[0];
  await franchiseActor.update(resetData);

  ui.notifications?.warn(
    game.i18n?.localize("INSPECTRES.NotifyBankruptcyRestart") ??
      "Franchise restarted: all agent Cool wiped, franchise reset. Begin new campaign.",
  );

  return { success: true, restarted: true };
}
