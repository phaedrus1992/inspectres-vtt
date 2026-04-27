import { type FranchiseData } from "./franchise-schema.js";

export function findFranchiseActor(): Actor | null {
  if (!game.actors) return null;
  return game.actors.find((actor) => (actor.type as string) === "franchise") ?? null;
}

export function franchiseSystemData(actor: { system: unknown } | Actor): FranchiseData {
  // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
  return actor.system as unknown as FranchiseData;
}
