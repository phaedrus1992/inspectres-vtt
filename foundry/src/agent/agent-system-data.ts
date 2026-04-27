import { type AgentData } from "./agent-schema.js";
import { validateCoolCapPostLoad } from "../validation/gating-validation.js";

export function agentSystemData(actor: { system: unknown } | Actor): AgentData {
  // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
  return actor.system as unknown as AgentData;
}

// #282: Enforce 3-die Cool cap for normal agents post-load
export function validateAndFixCoolCap(actor: Actor): Record<string, unknown> | null {
  const system = agentSystemData(actor);
  const agentType = system.isWeird ? "weird" : "normal";
  const validation = validateCoolCapPostLoad(agentType, system.cool);

  if (validation.shouldReset && validation.resetValue !== undefined) {
    return { "system.cool": validation.resetValue };
  }
  return null;
}
