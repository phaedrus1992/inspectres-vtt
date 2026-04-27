import { type AgentData } from "./agent-schema.js";

export function agentSystemData(actor: { system: unknown } | Actor): AgentData {
  // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
  return actor.system as unknown as AgentData;
}
