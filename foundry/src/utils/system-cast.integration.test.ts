import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
const foundryRoot = resolve(repoRoot, "foundry");

describe("system-cast consolidation (#363)", () => {
  it("should not have manual actor.system casts after #363 consolidation", () => {
    // After consolidation, all `.system as unknown as AgentData/FranchiseData`
    // patterns should be replaced with getActorSystem<T>(actor)

    const result = spawnSync(
      "grep",
      [
        "-r",
        ".system as unknown as",
        "foundry/src",
        "--include=*.ts",
      ],
      {
        encoding: "utf-8",
        cwd: repoRoot,
      },
    );

    const searchResult = result.stdout.trim();
    const lines = searchResult
      .split("\n")
      .filter((line) => {
        // Skip comments and documentation
        if (line.includes("//") || line.includes("*")) return false;
        return line.includes("AgentData") || line.includes("FranchiseData");
      })
      .filter((line) => line.length > 0);

    if (lines.length > 0) {
      console.log("Found manual system casts that should use getActorSystem():");
      lines.forEach((line) => console.log(line));
    }

    // After #363 consolidation completes, should have 0 manual casts
    expect(lines.length).toBe(0);
  });

  it("getActorSystem should be imported and used in agent/franchise files", () => {
    const agentSystemContent = readFileSync(
      resolve(foundryRoot, "src/agent/agent-system-data.ts"),
      "utf-8",
    );

    expect(agentSystemContent).toContain("getActorSystem");
  });

  it("getActorSystem should be imported and used in franchise utils", () => {
    const franchiseUtilsContent = readFileSync(
      resolve(foundryRoot, "src/franchise/franchise-utils.ts"),
      "utf-8",
    );

    expect(franchiseUtilsContent).toContain("getActorSystem");
  });
});
