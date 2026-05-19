import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupMockGame } from "./test-utils.js";
import type { MockGameInstance } from "./test-utils.js";

describe("setupMockGame() helper", () => {
  let game: MockGameInstance;

  beforeEach(() => {
    // Test isolation: clear mocks between tests
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    vi.clearAllMocks();
  });

  it("returns a configured game mock with user, i18n, actors, users", () => {
    game = setupMockGame();

    expect(game).toBeDefined();
    expect(game.user).toBeDefined();
    expect(game.i18n).toBeDefined();
    expect(game.actors).toBeDefined();
    expect(game.users).toBeDefined();
  });

  it("user mock includes id and isGM properties", () => {
    game = setupMockGame();

    expect(game.user.id).toBeDefined();
    expect(typeof game.user.isGM).toBe("boolean");
  });

  it("i18n.localize returns key when no localization provided", () => {
    game = setupMockGame();

    const result = game.i18n.localize("INSPECTRES.TestKey");
    expect(result).toBe("INSPECTRES.TestKey");
  });

  it("accepts options to override defaults", () => {
    const customOptions = {
      userIsGM: false,
      userId: "custom-user-id",
    };
    game = setupMockGame(customOptions);

    expect(game.user.isGM).toBe(false);
    expect(game.user.id).toBe("custom-user-id");
  });

  it("actors mock includes get and contents methods", () => {
    game = setupMockGame();

    expect(typeof game.actors.get).toBe("function");
    expect(Array.isArray(game.actors.contents)).toBe(true);
  });

  it("users mock includes size property", () => {
    game = setupMockGame();

    expect(typeof game.users.size).toBe("number");
  });
});
