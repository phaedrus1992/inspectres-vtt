import { type FranchiseData } from "./franchise-schema.js";

export function findFranchiseActor(): Actor | null {
  if (!game.actors) return null;
  for (const actor of game.actors) {
    if ((actor.type as string) === "franchise") return actor;
  }
  return null;
}

export function franchiseSystemData(actor: { system: unknown } | Actor): FranchiseData {
  // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
  return actor.system as unknown as FranchiseData;
}
