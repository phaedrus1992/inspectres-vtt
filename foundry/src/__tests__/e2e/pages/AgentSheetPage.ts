import type { Page } from "@playwright/test";
import { rejoinIfRedirected } from "./helpers.js";

const SHEET_WAIT_TIMEOUT = 15_000;

export class AgentSheetPage {
  readonly page: Page;
  readonly actorId: string;

  constructor(page: Page, actorId: string) {
    this.page = page;
    this.actorId = actorId;
  }

  /** Selector scoped to this actor's sheet element. */
  sheetSelector(): string {
    return `.inspectres[id*="${this.actorId}"]`;
  }

  /** Wait until the sheet is visible in the DOM. */
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

  /** Click a tab by its data-tab value and wait for the panel to become visible. */
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

  /** Click the roll button for a named skill. */
  async clickSkillRoll(skill: string): Promise<void> {
    await this.safeClick(
      `${this.sheetSelector()} [data-action="skillRoll"][data-skill="${skill}"]`,
    );
  }

  /** Click the increase stepper for a named skill. */
  async clickSkillIncrease(skill: string): Promise<void> {
    await this.safeClick(
      `${this.sheetSelector()} [data-action="skillIncrease"][data-skill="${skill}"]`,
    );
  }

  /** Click the decrease stepper for a named skill. */
  async clickSkillDecrease(skill: string): Promise<void> {
    await this.safeClick(
      `${this.sheetSelector()} [data-action="skillDecrease"][data-skill="${skill}"]`,
    );
  }

  /** Set stress by filling the stress-meter input via evaluate. */
  async setStress(value: number): Promise<void> {
    await this.page.evaluate(
      (args: { actorId: string; value: number }) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.find(
          (a: { id: string }) => a.id === args.actorId,
        );
        if (!actor) throw new Error(`Actor ${args.actorId} not found`);
        return actor.update({ "system.stress": args.value });
      },
      { actorId: this.actorId, value },
    );
    // Wait for ApplicationV2 re-render to complete after the data update.
    await this.page.waitForFunction(
      (id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"]`);
        if (!el) return false;
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      this.actorId,
      { timeout: 10_000 },
    ).catch(() => {});
  }

  /** Click the stress roll button. */
  async clickStressRoll(): Promise<void> {
    await this.safeClick(`${this.sheetSelector()} [data-action="stressRoll"]`);
  }

  /** Click the toggle cool button for a pip index. */
  async clickToggleCool(pipIndex: number): Promise<void> {
    await this.safeClick(
      `${this.sheetSelector()} [data-action="toggleCool"][data-index="${pipIndex}"]`,
    );
  }

  /** Click the add characteristic button. */
  async clickAddCharacteristic(): Promise<void> {
    await this.safeClick(`${this.sheetSelector()} [data-action="addCharacteristic"]`);
  }

  /** Click the remove characteristic button for a given index. */
  async clickRemoveCharacteristic(index: number): Promise<void> {
    await this.safeClick(
      `${this.sheetSelector()} [data-action="removeCharacteristic"][data-index="${index}"]`,
    );
  }

  /**
   * Click a selector, guarding against the /join redirect that v14 (and
   * occasionally v13) triggers on action button clicks. If a redirect fires,
   * rejoin the session, re-render the sheet, and retry the click once so the
   * action actually executes rather than being silently swallowed.
   */
  private async safeClick(selector: string): Promise<void> {
    const wasRedirected = await this.clickWithRedirectGuard(selector);
    if (!wasRedirected) return;

    await this.rerenderSheet();
    // Retry once — a second redirect here would be a real environment problem.
    await this.page.click(selector).catch(() => {});
  }

  /** Race click vs /join redirect; return true if redirect fired. */
  private async clickWithRedirectGuard(selector: string): Promise<boolean> {
    const result = await Promise.race([
      this.page.click(selector).then(() => false as const),
      this.page.waitForURL(/\/join/, { timeout: 5_000 }).then(() => true as const),
    ]).catch(() => false as const);
    await rejoinIfRedirected(this.page);
    return result;
  }

  /** Re-render this actor's sheet after a rejoin so the DOM is valid again. */
  private async rerenderSheet(): Promise<void> {
    const id = this.actorId;
    await this.page.evaluate(async (actorId: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(actorId);
      if (actor) await actor.sheet.render(true);
    }, id).catch(() => {});
    await this.waitForVisible().catch(() => {});
  }

  /** Get the raw system data for this actor from the Foundry runtime. */
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
}
