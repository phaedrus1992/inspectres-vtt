import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDistributionDialog, type PlayerInfo } from "./distribution-dialog.js";

describe("createDistributionDialog", () => {
  beforeEach(() => {
    // Mock foundry globals
    (globalThis as Record<string, unknown>)["game"] = {
      i18n: {
        localize: vi.fn((key: string) => `MOCKED[${key}]`),
        format: vi.fn((key: string, data: Record<string, unknown>) => `MOCKED[${key}:${JSON.stringify(data)}]`),
      },
    };
  });

  it("renders dialog with form using for/id labels", async () => {
    const players: PlayerInfo[] = [
      { id: "user1", name: "Alice" },
      { id: "user2", name: "Bob" },
    ];
    const result = await createDistributionDialog({ missionPool: 10, players });
    expect(result).toHaveProperty("content");
    const content = result.content as string;
    // Should use for/id pairing, not wrapping labels
    expect(content).toContain('id="player-user1"');
    expect(content).toContain('for="player-user1"');
    // Should NOT use wrapping label pattern
    expect(content).not.toMatch(/<label>[^<]*<input/);
  });

  it("includes all players in dialog", async () => {
    const players: PlayerInfo[] = [
      { id: "user1", name: "Alice" },
      { id: "user2", name: "Bob" },
    ];
    const result = await createDistributionDialog({ missionPool: 10, players });
    const content = result.content as string;
    expect(content).toContain("Alice");
    expect(content).toContain("Bob");
  });

  it("includes dialog buttons", async () => {
    const players: PlayerInfo[] = [{ id: "user1", name: "Alice" }];
    const result = await createDistributionDialog({ missionPool: 5, players });
    expect(result.buttons).toBeDefined();
    expect(Array.isArray(result.buttons)).toBe(true);
    const actions = result.buttons?.map((b) => b.action);
    expect(actions).toContain("confirm");
    expect(actions).toContain("cancel");
  });

  it("handles no players gracefully", async () => {
    const result = await createDistributionDialog({ missionPool: 5, players: [] });
    const content = result.content as string;
    expect(content).toContain("No active players");
  });
});
