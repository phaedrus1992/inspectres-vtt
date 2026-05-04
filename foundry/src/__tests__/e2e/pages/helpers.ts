import type { Page } from "@playwright/test";
import type { ConsoleBuffer } from "../console-capture.js";
import { AgentSheetPage } from "./AgentSheetPage.js";
import { FranchiseSheetPage } from "./FranchiseSheetPage.js";

const SHEET_WAIT_TIMEOUT = 15_000;

/** Create a new actor in Foundry and return its ID. */
export async function createActor(
  page: Page,
  type: "agent" | "franchise",
  name: string,
): Promise<string> {
  const actorId = await page.evaluate(
    async (args: { type: string; name: string }) => {
      // @ts-expect-error - Foundry runtime globals
      const ActorCls = globalThis.CONFIG?.Actor?.documentClass ?? globalThis.Actor;
      const actor = await ActorCls.create({ name: args.name, type: args.type });
      if (!actor?.id) throw new Error(`Failed to create actor "${args.name}"`);
      return actor.id as string;
    },
    { type, name },
  );
  return actorId;
}

/** Delete an actor by ID. No-op if already deleted. */
export async function deleteActor(page: Page, actorId: string): Promise<void> {
  await page.evaluate(async (id: string) => {
    // @ts-expect-error - Foundry runtime global
    const actor = globalThis.game?.actors?.get(id);
    if (actor) await actor.delete();
  }, actorId);
}

/** Open an actor's sheet and return the appropriate page object. */
export async function openAgentSheet(
  page: Page,
  actorId: string,
): Promise<AgentSheetPage> {
  await page.evaluate(async (id: string) => {
    // @ts-expect-error - Foundry runtime global
    const actor = globalThis.game?.actors?.get(id);
    if (!actor) throw new Error(`Actor ${id} not found`);
    await actor.sheet.render(true);
  }, actorId);

  const sheetPage = new AgentSheetPage(page, actorId);
  await sheetPage.waitForVisible();
  return sheetPage;
}

/** Open a franchise actor's sheet and return the page object. */
export async function openFranchiseSheet(
  page: Page,
  actorId: string,
): Promise<FranchiseSheetPage> {
  await page.evaluate(async (id: string) => {
    // @ts-expect-error - Foundry runtime global
    const actor = globalThis.game?.actors?.get(id);
    if (!actor) throw new Error(`Actor ${id} not found`);
    await actor.sheet.render(true);
  }, actorId);

  const sheetPage = new FranchiseSheetPage(page, actorId);
  await sheetPage.waitForVisible();
  return sheetPage;
}

/** Assert that the console buffer has no errors. */
export function assertNoConsoleErrors(buffer: ConsoleBuffer): void {
  const errors = buffer.lines.filter((line) => line.startsWith("[error]") || line.startsWith("[pageerror]"));
  if (errors.length > 0) {
    throw new Error(
      `Expected no console errors, but found ${errors.length}:\n${errors.join("\n")}`,
    );
  }
}

/** Wait for a sheet element to be present AND visible. */
export async function waitForSheet(page: Page, actorId: string): Promise<void> {
  await page.waitForFunction(
    (id: string) => {
      const el = document.querySelector(`.inspectres[id*="${id}"]`);
      if (!el) return false;
      const rect = (el as HTMLElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    actorId,
    { timeout: SHEET_WAIT_TIMEOUT },
  );
}

/** Count chat messages in the Foundry runtime. */
export async function getChatMessageCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    // @ts-expect-error - Foundry runtime global
    return (globalThis.game?.messages?.size as number) ?? 0;
  });
}
