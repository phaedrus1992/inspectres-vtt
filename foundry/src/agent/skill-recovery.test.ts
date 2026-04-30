import { describe, it, expect } from "vitest";
import { executeSkillRecovery } from "./skill-recovery.js";
import { makeAgent } from "../__mocks__/test-fixtures.js";
import type { AgentData } from "./agent-schema.js";
import type { RollActor } from "../utils/system-cast.js";

describe("executeSkillRecovery - mid-mission Cool → skill recovery", () => {
  it("restores 1 skill point per Cool die spent (1 Cool = +1 skill)", async () => {
    const agent = makeAgent({
      cool: 2,
      skills: {
        academics: { base: 1, penalty: 2 },
        athletics: { base: 2, penalty: 0 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 2, penalty: 1 },
      },
    });

    await executeSkillRecovery(agent as unknown as RollActor, "academics", 1);

    const updated = agent as unknown as { system: AgentData };
    expect(updated.system.skills.academics.penalty).toBe(1); // restored 1 point
    expect(updated.system.cool).toBe(1); // spent 1 cool
  });

  it("allows spending up to max Cool on a single skill", async () => {
    const agent = makeAgent({
      cool: 3,
      skills: {
        academics: { base: 2, penalty: 3 },
        athletics: { base: 2, penalty: 0 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 2, penalty: 0 },
      },
    });

    await executeSkillRecovery(agent as unknown as RollActor, "academics", 3);

    const updated = agent as unknown as { system: AgentData };
    expect(updated.system.skills.academics.penalty).toBe(0); // fully restored
    expect(updated.system.cool).toBe(0); // spent all 3
  });

  it("cannot spend Cool if agent is dead or recovering", async () => {
    const agent = makeAgent({
      cool: 2,
      isDead: true,
      skills: {
        academics: { base: 1, penalty: 2 },
        athletics: { base: 2, penalty: 0 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 2, penalty: 0 },
      },
    });

    const result = await executeSkillRecovery(agent as unknown as Actor, "academics", 1);

    expect(result.success).toBe(false);
    expect(result.reason).toContain("recovering");
  });

  it("cannot spend more Cool than available", async () => {
    const agent = makeAgent({
      cool: 1,
      skills: {
        academics: { base: 1, penalty: 3 },
        athletics: { base: 2, penalty: 0 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 2, penalty: 0 },
      },
    });

    const result = await executeSkillRecovery(agent as unknown as Actor, "academics", 2);

    expect(result.success).toBe(false);
    expect(result.reason).toContain("Cool");
  });

  it("restores skill penalty, never exceeding base skill", async () => {
    const agent = makeAgent({
      cool: 2,
      skills: {
        academics: { base: 2, penalty: 1 },
        athletics: { base: 2, penalty: 0 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 2, penalty: 0 },
      },
    });

    await executeSkillRecovery(agent as unknown as Actor, "academics", 2);

    const updated = agent as unknown as { system: AgentData };
    expect(updated.system.skills.academics.penalty).toBe(0); // capped at 0
    expect(updated.system.cool).toBe(0); // spent both cool
  });

  it("sends notification on success", async () => {
    const agent = makeAgent({
      cool: 1,
      skills: {
        academics: { base: 2, penalty: 1 },
        athletics: { base: 2, penalty: 0 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 2, penalty: 0 },
      },
    });

    const result = await executeSkillRecovery(agent as unknown as Actor, "academics", 1);

    expect(result.success).toBe(true);
    expect(result.notificationKey).toBe("INSPECTRES.NotifySkillRecovered");
  });
});
