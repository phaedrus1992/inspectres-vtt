import { vi } from "vitest";

/**
 * Set up ChatMessage and foundry.applications.handlebars mocks for Foundry tests.
 * Call this in beforeEach() or setupGlobalMocks() to initialize the test environment.
 */
export function setupChatMessageMocks(): void {
  const g = globalThis as unknown as Record<string, unknown>;

  // Mock foundry.applications.handlebars.renderTemplate
  if (!g["foundry"]) g["foundry"] = {};
  const foundry = g["foundry"] as Record<string, unknown>;
  if (foundry === null) {
    throw new Error("foundry global initialization failed: foundry namespace is null");
  }
  if (!foundry["applications"]) foundry["applications"] = {};
  const applications = foundry["applications"] as Record<string, unknown>;
  if (applications === null) {
    throw new Error("foundry global initialization failed: applications namespace is null");
  }
  if (!applications["handlebars"]) applications["handlebars"] = {};
  const handlebars = applications["handlebars"] as Record<string, unknown>;
  if (handlebars === null) {
    throw new Error("foundry global initialization failed: handlebars namespace is null");
  }
  handlebars["renderTemplate"] = vi.fn(() => Promise.resolve("<div>mocked</div>"));
}
