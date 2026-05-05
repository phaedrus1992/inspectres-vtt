import type { Page } from "@playwright/test";
import type { ConsoleBuffer } from "../console-capture.js";
import { AgentSheetPage } from "./AgentSheetPage.js";
import { FranchiseSheetPage } from "./FranchiseSheetPage.js";

const SHEET_WAIT_TIMEOUT = 15_000;
const REJOIN_TIMEOUT = 30_000;

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

/**
 * Poll until at least one new chat message has appeared since `beforeCount`.
 * Use after triggering a roll action to avoid fixed-duration sleeps.
 */
export async function waitForNewChatMessage(
  page: Page,
  beforeCount: number,
  timeout = 15_000,
): Promise<void> {
  await page.waitForFunction(
    (count: number) => {
      // @ts-expect-error - Foundry runtime global
      return (globalThis.game?.messages?.size ?? 0) > count;
    },
    beforeCount,
    { timeout },
  ).catch(() => {});
}

/**
 * Poll until a dot-path field on `actor.system` has changed from `previousValue`.
 * Use after UI interactions that trigger `actor.update()` on the server.
 *
 * @example
 * await waitForActorFieldChanged(page, agentId, "skills.academics.base", before);
 */
export async function waitForActorFieldChanged(
  page: Page,
  actorId: string,
  fieldPath: string,
  previousValue: unknown,
  timeout = 15_000,
): Promise<void> {
  await page.waitForFunction(
    (args: { id: string; path: string; prev: unknown }) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(args.id);
      if (!actor) return false;
      const parts = args.path.split(".");
      let value: unknown = actor.system;
      for (const part of parts) {
        if (value == null || typeof value !== "object") return false;
        value = (value as Record<string, unknown>)[part];
      }
      return value !== args.prev;
    },
    { id: actorId, path: fieldPath, prev: previousValue },
    { timeout },
  ).catch(() => {});
}

/**
 * Poll until a dot-path field on `actor.system` equals `expectedValue`.
 * Use after form submissions that trigger `actor.update()` on the server.
 *
 * @example
 * await waitForActorFieldEquals(page, franchiseId, "bank", 7);
 */
export async function waitForActorFieldEquals(
  page: Page,
  actorId: string,
  fieldPath: string,
  expectedValue: unknown,
  timeout = 15_000,
): Promise<void> {
  await page.waitForFunction(
    (args: { id: string; path: string; expected: unknown }) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(args.id);
      if (!actor) return false;
      const parts = args.path.split(".");
      let value: unknown = actor.system;
      for (const part of parts) {
        if (value == null || typeof value !== "object") return false;
        value = (value as Record<string, unknown>)[part];
      }
      return value === args.expected;
    },
    { id: actorId, path: fieldPath, expected: expectedValue },
    { timeout },
  ).catch(() => {});
}

/**
 * If the page has been redirected to /join (e.g. v14 dialog submit behaviour
 * or a mid-test session expiry), re-join the game using the first available
 * user slot so the session remains valid for fixture teardown's logOut call.
 *
 * Call this after any action that might trigger a page-level redirect on v14.
 */
export async function rejoinIfRedirected(page: Page): Promise<void> {
  if (!page.url().includes("/join")) return;

  const username = await page.evaluate(() => {
    const opts = Array.from(
      (document.querySelector('select[name="userid"]') as HTMLSelectElement | null)?.options ?? [],
    );
    return opts.find((o) => !o.disabled && o.value !== "")?.text ?? null;
  });

  if (!username) return;

  await page.selectOption('select[name="userid"]', { label: username }).catch(() => {});
  await page.click('button[type="submit"]:has-text("Join Game Session")').catch(() => {});
  await page.waitForURL(/\/game/, { timeout: REJOIN_TIMEOUT }).catch(() => {});
  await page.waitForFunction(
    // @ts-expect-error - Foundry runtime global
    () => globalThis.game?.ready === true,
    undefined,
    { timeout: REJOIN_TIMEOUT },
  ).catch(() => {});
}
