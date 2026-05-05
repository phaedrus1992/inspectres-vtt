import type { Page } from "@playwright/test";
import { rejoinIfRedirected } from "./helpers.js";

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
    await this.safeClick(`${this.sheetSelector()} [data-action="bankRoll"]`);
  }

  async clickClientRoll(): Promise<void> {
    await this.safeClick(`${this.sheetSelector()} [data-action="clientRoll"]`);
  }

  async clickOpenMissionTracker(): Promise<void> {
    await this.safeClick(`${this.sheetSelector()} [data-action="openMissionTracker"]`);
  }

  async clickAdvanceDay(): Promise<void> {
    await this.safeClick(`${this.sheetSelector()} [data-action="advanceDay"]`);
  }

  async clickRegressDay(): Promise<void> {
    await this.safeClick(`${this.sheetSelector()} [data-action="regressDay"]`);
  }

  async clickToggleDebtMode(): Promise<void> {
    await this.safeClick(`${this.sheetSelector()} [data-action="toggleDebtMode"]`);
  }

  async clickToggleCardsLocked(): Promise<void> {
    await this.safeClick(`${this.sheetSelector()} [data-action="toggleCardsLocked"]`);
  }

  /**
   * Click a selector, guarding against /join redirects. If a redirect fires,
   * rejoin, wait for game.ready, re-render the sheet, then retry the click once
   * (also guarded). A second redirect on retry is handled by rejoin only — no
   * infinite retry loop.
   */
  private async safeClick(selector: string): Promise<void> {
    const wasRedirected = await this.clickWithRedirectGuard(selector);
    if (!wasRedirected) return;

    await this.rerenderSheet();
    await this.clickWithRedirectGuard(selector);
  }

  /** Click selector and detect /join redirects that fire async after the click. */
  private async clickWithRedirectGuard(selector: string): Promise<boolean> {
    await this.page.click(selector).catch(() => {});
    // Poll for /join for up to 2s after click — Foundry processes the action
    // server-side and may redirect asynchronously after the click resolves.
    // Polling avoids long-lived waitForURL promises that can outlive the test.
    let redirected = false;
    for (let i = 0; i < 8; i++) {
      await new Promise<void>(resolve => { setTimeout(resolve, 250); });
      if (this.page.url().includes("/join")) {
        redirected = true;
        break;
      }
    }
    await rejoinIfRedirected(this.page);
    return redirected;
  }

  /** Re-render this actor's sheet after a rejoin so the DOM is valid again. */
  private async rerenderSheet(): Promise<void> {
    // Wait for game to be ready before trying to render — rejoin is async and
    // game.actors may not be populated yet immediately after the redirect clears.
    await this.page.waitForFunction(
      // @ts-expect-error - Foundry runtime global
      () => globalThis.game?.ready === true,
      undefined,
      { timeout: 15_000 },
    ).catch(() => {});

    const id = this.actorId;
    await this.page.evaluate(async (actorId: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(actorId);
      if (actor) await actor.sheet.render(true);
    }, id).catch(() => {});
    await this.waitForVisible().catch(() => {});
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
