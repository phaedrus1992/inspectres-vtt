/**
 * Bankruptcy mechanics: debt mode, Card lock, loan repayment
 * Per rules: Bank hits zero → borrow up to 10 dice, Cards lock, debt mode = true
 * End of mission: repay loan + 1 die interest, then evaluate franchise total
 */

import { type FranchiseData } from "./franchise-schema.js";

export const MAX_LOAN_AMOUNT = 10;
export const LOAN_INTEREST_RATE = 1; // +1 die interest per repayment

export interface BankruptcyState {
  inDebt: boolean;
  cardsLocked: boolean;
  loanAmount: number;
}

export function computeBankruptcyState(system: FranchiseData): BankruptcyState {
  return {
    inDebt: system.debtMode,
    cardsLocked: system.cardsLocked,
    loanAmount: system.loanAmount,
  };
}

/**
 * Enter debt when Bank hits zero during a roll/spending event
 * Lock Cards and offer borrow up to MAX_LOAN_AMOUNT
 */
export async function enterDebtMode(franchiseActor: Actor, attemptedSpend: number): Promise<boolean> {
  const system = franchiseActor.system as unknown as FranchiseData;
  if (system.debtMode) {
    ui.notifications?.warn(
      game.i18n?.localize("INSPECTRES.ErrorAlreadyInDebt") ?? "Franchise is already in debt.",
    );
    return false;
  }

  const borrowResult = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n?.localize("INSPECTRES.DialogBankruptcyTitle") ?? "Franchise Bankrupt" },
    content: `
      <form>
        <fieldset class="inspectres-bankruptcy-form">
          <legend>${game.i18n?.localize("INSPECTRES.BankruptcyNotice") ?? "Bank Empty"}</legend>
          <p class="notice">
            ${game.i18n?.localize("INSPECTRES.BankruptcyExplain") ?? "Franchise Bank is depleted. Cards become inaccessible (seized as collateral). You may borrow up to"}
            <strong>${MAX_LOAN_AMOUNT}</strong>
            ${game.i18n?.localize("INSPECTRES.BankruptcyExplainSuffix") ?? "dice to continue play. You must repay the loan + 1 die interest by mission end."}
          </p>
          <div class="form-group">
            <label for="borrowAmount">${game.i18n?.localize("INSPECTRES.BorrowAmount") ?? "Borrow Amount"}</label>
            <input type="number" name="borrowAmount" id="borrowAmount" min="0" max="${MAX_LOAN_AMOUNT}" value="${Math.min(attemptedSpend, MAX_LOAN_AMOUNT)}" required />
          </div>
        </fieldset>
      </form>
    `,
    buttons: [
      {
        action: "borrow",
        label: game.i18n?.localize("INSPECTRES.ButtonBorrow") ?? "Borrow & Continue",
        default: true,
        callback: (_event, _button, dialog) => {
          const form = dialog.querySelector("form") as HTMLFormElement;
          const data = new FormData(form);
          const amount = Math.max(0, Math.min(MAX_LOAN_AMOUNT, Number(data.get("borrowAmount") ?? 0)));
          return amount;
        },
      },
      {
        action: "decline",
        label: game.i18n?.localize("INSPECTRES.ButtonDeclineLoan") ?? "End Mission",
        callback: () => null,
      },
    ],
  });

  if (borrowResult === null) return false;

  // Enter debt mode
  const updateData = {
    "system.debtMode": true,
    "system.cardsLocked": true,
    "system.loanAmount": borrowResult,
    "system.bank": borrowResult,
  } as unknown as Parameters<typeof franchiseActor.update>[0];
  await franchiseActor.update(updateData);

  ui.notifications?.warn(
    game.i18n?.localize("INSPECTRES.NotifyDebtEntered") ?? `Franchise entered debt: borrowed ${borrowResult} dice.`,
  );

  return true;
}

/**
 * Attempt repayment at end of mission: repay loan + interest, evaluate franchise total
 * Returns: { debtCleared: boolean; franchise updated or stayed in debt }
 */
export async function attemptLoanRepayment(
  franchiseActor: Actor,
  earnedDiceThisMission: number,
): Promise<{ success: boolean; debtCleared: boolean }> {
  const system = franchiseActor.system as unknown as FranchiseData;

  if (!system.debtMode) {
    ui.notifications?.info(
      game.i18n?.localize("INSPECTRES.InfoNotInDebt") ?? "Franchise is not in debt.",
    );
    return { success: false, debtCleared: false };
  }

  const repaymentNeeded = system.loanAmount + LOAN_INTEREST_RATE;

  if (earnedDiceThisMission < repaymentNeeded) {
    ui.notifications?.warn(
      game.i18n?.localize("INSPECTRES.WarnInsufficientRepayment") ??
        `Insufficient earned dice. Needed: ${repaymentNeeded}, Earned: ${earnedDiceThisMission}.`,
    );
    return { success: false, debtCleared: false };
  }

  const franchiseTotal = earnedDiceThisMission - repaymentNeeded;

  if (franchiseTotal >= 0) {
    // Debt cleared, Cards restored
    const updateData = {
      "system.debtMode": false,
      "system.cardsLocked": false,
      "system.loanAmount": 0,
      "system.bank": franchiseTotal,
    } as unknown as Parameters<typeof franchiseActor.update>[0];
    await franchiseActor.update(updateData);

    ui.notifications?.info(
      game.i18n?.localize("INSPECTRES.NotifyDebtCleared") ??
        `Debt repaid! Franchise recovered with ${franchiseTotal} dice.`,
    );

    return { success: true, debtCleared: true };
  } else {
    // Franchise ends mission with negative total after repayment: permanent bankruptcy
    const updateData = {
      "system.debtMode": false,
      "system.cardsLocked": false,
      "system.loanAmount": 0,
      "system.bank": 0,
    } as unknown as Parameters<typeof franchiseActor.update>[0];
    await franchiseActor.update(updateData);

    ui.notifications?.error(
      game.i18n?.localize("INSPECTRES.NotifyFranchiseBankrupt") ??
        "Franchise bankrupt! Must restart with new franchise.",
    );

    return { success: true, debtCleared: false };
  }
}
