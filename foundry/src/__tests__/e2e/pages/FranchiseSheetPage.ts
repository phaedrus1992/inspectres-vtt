import type { Page } from "@playwright/test";

const SHEET_WAIT_TIMEOUT = 15_000;

export class FranchiseSheetPage {
  readonly page: Page;
  readonly actorId: string;

  constructor(page: Page, actorId: string) {
    this.page = page;
    this.actorId = actorId;
  }

  sheetSelector(): string {
    return `.inspectres[id*="${this.actorId}"]`;
  }

  async waitForVisible(): Promise<void> {
    const id = this.actorId;
    await this.page.waitForFunction(
      (actorId: string) => {
        const el = document.querySelector(`.inspectres[id*="${actorId}"]`);
        if (!el) return false;
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      id,
      { timeout: SHEET_WAIT_TIMEOUT },
    );
  }

  async openTab(tabName: string): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [role="tab"][data-tab="${tabName}"]`,
    );
    await this.page.waitForFunction(
      (args: { actorId: string; tabName: string }) => {
        const panel = document.querySelector(
          `.inspectres[id*="${args.actorId}"] [data-tab="${args.tabName}"]`,
        );
        if (!panel) return false;
        const rect = (panel as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      { actorId: this.actorId, tabName },
      { timeout: SHEET_WAIT_TIMEOUT },
    );
  }

  async clickBankRoll(): Promise<void> {
    await this.page.click(`${this.sheetSelector()} [data-action="bankRoll"]`);
  }

  async clickClientRoll(): Promise<void> {
    await this.page.click(`${this.sheetSelector()} [data-action="clientRoll"]`);
  }

  async clickOpenMissionTracker(): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="openMissionTracker"]`,
    );
  }

  async clickAdvanceDay(): Promise<void> {
    await this.page.click(`${this.sheetSelector()} [data-action="advanceDay"]`);
  }

  async clickRegressDay(): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="regressDay"]`,
    );
  }

  async clickToggleDebtMode(): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="toggleDebtMode"]`,
    );
  }

  async clickToggleCardsLocked(): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="toggleCardsLocked"]`,
    );
  }

  async getSystemData(): Promise<Record<string, unknown>> {
    return await this.page.evaluate((actorId: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.find(
        (a: { id: string }) => a.id === actorId,
      );
      if (!actor) throw new Error(`Actor ${actorId} not found`);
      return JSON.parse(JSON.stringify(actor.system)) as Record<string, unknown>;
    }, this.actorId);
  }

  async getCurrentDaySetting(): Promise<number> {
    return await this.page.evaluate(() => {
      try {
        return (
          // @ts-expect-error - Foundry runtime global
          (globalThis.game?.settings?.get("inspectres", "currentDay") as number) ?? 1
        );
      } catch {
        return 1;
      }
    });
  }
}
