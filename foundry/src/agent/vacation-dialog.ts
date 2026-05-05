/**
 * Vacation Calculator dialog — allows agents to spend Bank dice to reduce stress
 * Per rules: Bank dice spent on vacation reduce stress by 1 per die, up to current stress
 */


export interface VacationOptions {
  agentStress: number;
  franchiseBank: number;
  franchiseInDebt: boolean;
  agentCool?: number;
  agentIsWeird?: boolean;
}

export interface VacationResult {
  bankDiceSpent: number;
  stressReduction: number;
  coolRestored?: number;
}

export async function buildVacationDialog(options: VacationOptions): Promise<VacationResult | null> {
  const { agentStress, franchiseBank, franchiseInDebt, agentCool = 0, agentIsWeird = false } = options;

  if (franchiseInDebt) {
    ui.notifications?.warn(
      game.i18n?.localize("INSPECTRES.WarnVacationDebtMode") ?? "Cannot take vacation while franchise is in debt.",
    );
    return null;
  }

  if (agentStress === 0 && (!agentIsWeird || agentCool === 0)) {
    ui.notifications?.info(
      game.i18n?.localize("INSPECTRES.InfoVacationNoStress") ?? "Agent has no stress to recover from.",
    );
    return null;
  }

  const maxStressSpendable = Math.min(agentStress, franchiseBank);
  const maxCoolRestorable = agentIsWeird ? franchiseBank - maxStressSpendable : 0;

  let formHtml = `
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
          <input type="number" name="bankSpend" id="bankSpend" min="0" max="${maxStressSpendable}" value="0" required />
        </div>
  `;

  if (agentIsWeird) {
    formHtml += `
        <fieldset class="inspectres-vacation-form inspectres-weird-cool-restore">
          <legend>${game.i18n?.localize("INSPECTRES.VacationWeirdCoolRestore") ?? "Weird Agent: Restore Cool"}</legend>
          <p class="hint">
            ${game.i18n?.localize("INSPECTRES.VacationWeirdCoolHint") ?? "Spend additional Bank dice to restore Cool (1 die = 1 Cool). Agent has"}
            <strong>${agentCool}</strong>
            ${game.i18n?.localize("INSPECTRES.CoolLabel") ?? "Cool"}.
          </p>
          <div class="form-group">
            <label for="coolRestore">${game.i18n?.localize("INSPECTRES.BankDiceToRestoreCool") ?? "Bank Dice to Restore Cool"}</label>
            <input type="number" name="coolRestore" id="coolRestore" min="0" max="${maxCoolRestorable}" value="0" required />
          </div>
        </fieldset>
    `;
  }

  formHtml += `
      </fieldset>
    </form>
  `;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n?.localize("INSPECTRES.DialogVacationTitle") ?? "Vacation" },
    content: formHtml,
    buttons: [
      {
        action: "spend",
        label: game.i18n?.localize("INSPECTRES.ButtonSpendBank") ?? "Spend Bank & Recover",
        default: true,
        callback: (_event, _button, dialog) => {
          const form = dialog.element.querySelector("form") as HTMLFormElement | null;
          if (!form) return null;
          const data = new FormData(form);
          const bankSpendRaw = Number(data.get("bankSpend") ?? 0);
          const coolRestoreRaw = Number(data.get("coolRestore") ?? 0);

          if (!Number.isFinite(bankSpendRaw) || !Number.isFinite(coolRestoreRaw)) {
            throw new TypeError("Invalid input: bank spending must be valid numbers");
          }

          const bankSpentOnStress = Math.max(0, Math.min(maxStressSpendable, bankSpendRaw));
          const coolRestored = agentIsWeird ? Math.max(0, Math.min(maxCoolRestorable, coolRestoreRaw)) : 0;
          const totalBankSpent = bankSpentOnStress + coolRestored;

          if (totalBankSpent < 0 || totalBankSpent > franchiseBank) {
            throw new Error(`Invalid bank spending: spent ${totalBankSpent}, available ${franchiseBank}`);
          }

          return {
            bankDiceSpent: totalBankSpent,
            stressReduction: bankSpentOnStress,
            coolRestored,
          } as VacationResult;
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
