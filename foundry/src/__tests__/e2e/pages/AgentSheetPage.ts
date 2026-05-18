import type { Page } from "@playwright/test";
import { wrapDiagnosticError } from "./helpers.js";

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

  /** Selector for the stress meter element. */
  stressMeterSelector(): string {
    return `${this.sheetSelector()} stress-meter`;
  }

  /** Selector for all stress meter pips. */
  stressMeterPips(): string {
    return `${this.stressMeterSelector()} .inspectres-pip`;
  }

  /** Selector for filled stress meter pips. */
  filledPips(): string {
    return `${this.stressMeterSelector()} .inspectres-pip.filled`;
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
    // force: true bypasses overlay-intercept checks. Foundry first-time tours
    // can re-render `.tour-overlay` between tab clicks; globalSetup marks them
    // completed but this guards against re-launch races during the test.
    await this.page.click(
      `${this.sheetSelector()} [role="tab"][data-tab="${tabName}"]`,
      { force: true },
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
    try {
      await this.page.waitForFunction(
        (id: string) => {
          const el = document.querySelector(`.inspectres[id*="${id}"]`);
          if (!el) return false;
          const rect = (el as HTMLElement).getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        },
        this.actorId,
        { timeout: 10_000 },
      );
    } catch (err) {
      throw wrapDiagnosticError(
        err,
        `setStress(${value}): sheet for actor ${this.actorId} did not re-render within 10s`,
      );
    }
  }

  /** Click the stress roll button. */
  async clickStressRoll(): Promise<void> {
    await this.page.click(`${this.sheetSelector()} [data-action="stressRoll"]`);
  }

  /** Click the toggle cool button for a pip index. */
  async clickToggleCool(pipIndex: number): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="toggleCool"][data-index="${pipIndex}"]`,
    );
  }

  /** Click the add characteristic button. */
  async clickAddCharacteristic(): Promise<void> {
    await this.page.click(`${this.sheetSelector()} [data-action="addCharacteristic"]`);
  }

  /** Click the remove characteristic button for a given index. */
  async clickRemoveCharacteristic(index: number): Promise<void> {
    await this.page.click(
      `${this.sheetSelector()} [data-action="removeCharacteristic"][data-index="${index}"]`,
    );
  }

  /** Re-render this actor's sheet (e.g. after a data update that doesn't auto-render). */
  async rerender(): Promise<void> {
    try {
      await this.page.waitForFunction(
        // @ts-expect-error - Foundry runtime global
        () => globalThis.game?.ready === true,
        undefined,
        { timeout: 15_000 },
      );
    } catch (err) {
      throw wrapDiagnosticError(err, "rerender: game.ready did not become true within 15s");
    }

    const id = this.actorId;
    try {
      await this.page.evaluate(async (actorId: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(actorId);
        if (actor) await actor.sheet.render(true);
      }, id);
    } catch (err) {
      throw wrapDiagnosticError(
        err,
        `rerender: actor.sheet.render(true) failed for actor ${this.actorId}`,
      );
    }

    try {
      await this.waitForVisible();
    } catch (err) {
      throw wrapDiagnosticError(
        err,
        `rerender: sheet for actor ${this.actorId} did not become visible after re-render`,
      );
    }
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
