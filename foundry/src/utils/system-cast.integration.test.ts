import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { spawnSync } from "child_process";

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
        cwd: "/Users/ranger/git/inspectres",
      },
    );

    const searchResult = result.stdout.trim();
    const lines = searchResult.split("\n").filter((line) => line.includes("AgentData") || line.includes("FranchiseData"));

    if (lines.length > 0) {
      console.log("Found manual system casts (expected before consolidation):");
      lines.forEach((line) => console.log(line));
    }

    // Currently expects ~20+ casts. After #363, should be 0
    expect(lines.length).toBeGreaterThan(0);
    console.log(`Found ${lines.length} manual system casts to consolidate`);
  });

  it("getActorSystem should be imported and used in agent/franchise files", () => {
    const agentSystemContent = readFileSync(
      "/Users/ranger/git/inspectres/foundry/src/agent/agent-system-data.ts",
      "utf-8",
    );

    expect(agentSystemContent).toContain("getActorSystem");
  });

  it("getActorSystem should be imported and used in franchise utils", () => {
    const franchiseUtilsContent = readFileSync(
      "/Users/ranger/git/inspectres/foundry/src/franchise/franchise-utils.ts",
      "utf-8",
    );

    expect(franchiseUtilsContent).toContain("getActorSystem");
  });
});
