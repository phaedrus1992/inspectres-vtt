/**
 * Vacation Calculator dialog — allows agents to spend Bank dice to reduce stress
 * Per rules: Bank dice spent on vacation reduce stress by 1 per die, up to current stress
 */

import { type FranchiseData } from "../franchise/franchise-schema.js";
import { type AgentData } from "./agent-schema.js";

export interface VacationOptions {
  agentStress: number;
  agentName: string;
  franchiseBank: number;
  franchiseInDebt: boolean;
}

export interface VacationResult {
  bankDiceSpent: number;
  stressReduction: number;
}

export async function buildVacationDialog(options: VacationOptions): Promise<VacationResult | null> {
  const { agentStress, agentName, franchiseBank, franchiseInDebt } = options;

  if (franchiseInDebt) {
    ui.notifications?.warn(
      game.i18n?.localize("INSPECTRES.WarnVacationDebtMode") ?? "Cannot take vacation while franchise is in debt.",
    );
    return null;
  }

  if (agentStress === 0) {
    ui.notifications?.info(
      game.i18n?.localize("INSPECTRES.InfoVacationNoStress") ?? "Agent has no stress to recover from.",
    );
    return null;
  }

  const maxSpendable = Math.min(agentStress, franchiseBank);

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n?.localize("INSPECTRES.DialogVacationTitle") ?? "Vacation" },
    content: `
      <form>
        <fieldset class="inspectres-vacation-form">
          <legend>${game.i18n?.localize("INSPECTRES.VacationBankSpending") ?? "Bank Dice Spending"}</legend>
          <p class="hint">
            ${game.i18n?.localize("INSPECTRES.VacationBankHint") ?? "Spend Bank dice to reduce stress (1 die = 1 stress point). Agent has"}
            <strong>${agentStress}</strong>
            ${game.i18n?.localize("INSPECTRES.StressLabel") ?? "stress"}. Franchise has
            <strong>${franchiseBank}</strong>
            Bank dice available.
          </p>
          <div class="form-group">
            <label for="bankSpend">${game.i18n?.localize("INSPECTRES.BankDiceToSpend") ?? "Bank Dice to Spend"}</label>
            <input type="number" name="bankSpend" id="bankSpend" min="0" max="${maxSpendable}" value="0" required />
          </div>
        </fieldset>
      </form>
    `,
    buttons: [
      {
        action: "spend",
        label: game.i18n?.localize("INSPECTRES.ButtonSpendBank") ?? "Spend Bank & Recover",
        default: true,
        callback: (_event, _button, dialog) => {
          const form = dialog.querySelector("form") as HTMLFormElement;
          const data = new FormData(form);
          const bankSpent = Math.max(0, Math.min(maxSpendable, Number(data.get("bankSpend") ?? 0)));
          return { bankDiceSpent: bankSpent, stressReduction: bankSpent } as VacationResult;
        },
      },
      {
        action: "skip",
        label: game.i18n?.localize("INSPECTRES.ButtonSkipVacation") ?? "Skip Vacation",
        callback: (): VacationResult | null => null,
      },
    ],
  });

  return (result as VacationResult | null) ?? null;
}
