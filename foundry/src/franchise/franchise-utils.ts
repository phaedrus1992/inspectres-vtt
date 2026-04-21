import { type FranchiseData } from "./franchise-schema.js";

export function findFranchiseActor(): Actor | null {
  if (!game.actors) return null;
  for (const actor of game.actors) {
    if ((actor.type as string) === "franchise") return actor;
  }
  return null;
}

export function franchiseSystemData(actor: Actor): FranchiseData {
  return actor.system as unknown as FranchiseData;
}
