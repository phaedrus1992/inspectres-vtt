import type { Page } from "@playwright/test";

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
    await this.page.click(
      `${this.sheetSelector()} [data-action="skillRoll"][data-skill="${skill}"]`,
    );
  }

  /** Click the increase stepper for a named skill. */
  async clickSkillIncrease(skill: string): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="skillIncrease"][data-skill="${skill}"]`,
    );
  }

  /** Click the decrease stepper for a named skill. */
  async clickSkillDecrease(skill: string): Promise<void> {
    await this.page.click(
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
    await this.page.click(
      `${this.sheetSelector()} [data-action="stressRoll"]`,
    );
  }

  /** Click the toggle cool button for a pip index. */
  async clickToggleCool(pipIndex: number): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="toggleCool"][data-index="${pipIndex}"]`,
    );
  }

  /** Click the add characteristic button. */
  async clickAddCharacteristic(): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="addCharacteristic"]`,
    );
  }

  /** Click the remove characteristic button for a given index. */
  async clickRemoveCharacteristic(index: number): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="removeCharacteristic"][data-index="${index}"]`,
    );
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
