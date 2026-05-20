import { vi } from "vitest";

export interface MockGameInstance {
  user: {
    id: string;
    isGM: boolean;
  };
  i18n: {
    localize: (key: string) => string;
  };
  actors: {
    get: (id: string) => unknown;
    contents: unknown[];
  };
  users: {
    size: number;
  };
}

export interface SetupMockGameOptions {
  userIsGM?: boolean;
  userId?: string;
}

/**
 * Create a configured mock of Foundry's global game object.
 * Handles: game.user, game.i18n, game.actors, game.users.
 * Use in beforeEach to avoid duplicating mock setup across 6+ test files.
 *
 * @param options - Optional overrides for user properties
 * @returns Configured mock game instance
 */
export function setupMockGame(options: SetupMockGameOptions = {}): MockGameInstance {
  const { userIsGM = true, userId = "test-user-id" } = options;

  return {
    user: {
      id: userId,
      isGM: userIsGM,
    },
    i18n: {
      localize: (key: string) => key, // Return key as-is when no translations provided
    },
    actors: {
      get: (_id: string) => null,
      contents: [],
    },
    users: {
      size: 1,
    },
  };
}

/**
 * Extract the first argument from a mocked function.
 * @param mock — A vitest mock function
 * @returns The first argument passed to the first call, or undefined
 */
export function getFirstMockCallArg<T>(mock: ReturnType<typeof vi.fn>): T | undefined {
  const callArgs = mock.mock.calls[0];
  if (!callArgs || callArgs.length === 0) return undefined;
  // Type narrowing: vitest mock.calls[0][0] is unknown; caller guarantees type T.
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

  // Type narrowing: globalThis is unknown; we construct a partial GameGlobal shape for tests.
  const g = globalThis as unknown as Partial<GameGlobal>;
  if (!g.game) g.game = { user: { isGM: false } };
  if (!g.game) {
    throw new Error("game global initialization failed: game namespace is null");
  }
  if (g.game && "user" in g.game) {
    // Type narrowing: g.game exists and has "user" property; cast to access isGM safely.
    (g.game as { user: { isGM: boolean } }).user.isGM = true;
  }
  const chatMessage = {
    create: chatMessageMock,
    getSpeaker: vi.fn(() => ({ actor: "test-actor", token: null })),
  };
  if (!g.ChatMessage) {
    // Type narrowing: chatMessage object satisfies minimal ChatMessage interface needed for tests.
    g.ChatMessage = chatMessage as unknown as { create: ReturnType<typeof vi.fn> };
  } else {
    // Type narrowing: g.ChatMessage exists; cast to Record for key access.
    const cm = g.ChatMessage as Record<string, unknown>;
    cm["create"] = chatMessageMock;
    cm["getSpeaker"] = chatMessage.getSpeaker;
  }
}
