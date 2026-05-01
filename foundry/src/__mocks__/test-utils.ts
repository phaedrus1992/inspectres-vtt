import { vi } from "vitest";

/**
 * Extract the first argument from a mocked function.
 * @param mock — A vitest mock function
 * @returns The first argument passed to the first call, or undefined
 */
export function getFirstMockCallArg<T>(mock: ReturnType<typeof vi.fn>): T | undefined {
  const callArgs = mock.mock.calls[0];
  if (!callArgs || callArgs.length === 0) return undefined;
  return callArgs[0] as T;
}

/**
 * Set up global Foundry mocks for testing: game, ChatMessage, foundry.applications.handlebars.
 * @param chatMessageMock — A vitest mock for ChatMessage.create
 */
export function setupGlobalMocks(chatMessageMock: ReturnType<typeof vi.fn>): void {
  interface GameGlobal {
    game: { user: { isGM: boolean } };
    ChatMessage: { create: ReturnType<typeof vi.fn> };
  }

  const g = globalThis as unknown as Partial<GameGlobal>;
  if (!g.game) g.game = { user: { isGM: false } };
  if (g.game && "user" in g.game) {
    (g.game as { user: { isGM: boolean } }).user.isGM = true;
  }
  const chatMessage = {
    create: chatMessageMock,
    getSpeaker: vi.fn(() => ({ actor: "test-actor", token: null })),
  };
  if (!g.ChatMessage) {
    g.ChatMessage = chatMessage as unknown as { create: ReturnType<typeof vi.fn> };
  } else {
    const cm = g.ChatMessage as Record<string, unknown>;
    cm["create"] = chatMessageMock;
    cm["getSpeaker"] = chatMessage.getSpeaker;
  }
}
