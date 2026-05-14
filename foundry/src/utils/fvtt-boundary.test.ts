import { describe, it, expect, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

import { updateDocument, createChatMessage } from "./fvtt-boundary.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");

describe("updateDocument", () => {
  it("forwards data to the document's update method", async () => {
    const update = vi.fn().mockResolvedValue("ok");
    const doc = { update } as unknown as { update: typeof update };

    const result = await updateDocument(doc, { "system.stress": 3 });

    expect(update).toHaveBeenCalledWith({ "system.stress": 3 });
    expect(result).toBe("ok");
  });
});

describe("createChatMessage", () => {
  it("forwards data and options to ChatMessage.create", async () => {
    const create = vi.fn().mockResolvedValue("msg");
    const g = globalThis as unknown as { ChatMessage: { create: typeof create } };
    const previous = g.ChatMessage;
    g.ChatMessage = { create };

    try {
      const result = await createChatMessage({ content: "hi" }, { rollMode: "publicroll" });
      expect(create).toHaveBeenCalledWith({ content: "hi" }, { rollMode: "publicroll" });
      expect(result).toBe("msg");

      await createChatMessage({ content: "no opts" });
      expect(create).toHaveBeenLastCalledWith({ content: "no opts" });
    } finally {
      g.ChatMessage = previous;
    }
  });
});

describe("fvtt-boundary consolidation (#556)", () => {
  it("production code does not inline Parameters<typeof X.update>[0] casts", () => {
    const result = spawnSync(
      "grep",
      [
        "-rn",
        "as unknown as Parameters<typeof",
        "foundry/src",
        "--include=*.ts",
        "--exclude=*.test.ts",
        "--exclude-dir=__mocks__",
      ],
      { encoding: "utf-8", cwd: repoRoot },
    );

    const hits = result.stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .filter((line) => !line.includes("fvtt-boundary.ts"));

    if (hits.length > 0) {
      console.log("Found inline Parameters<typeof X> casts that should use fvtt-boundary helpers:");
      for (const hit of hits) console.log(`  ${hit}`);
    }

    expect(hits.length).toBe(0);
  });
});
