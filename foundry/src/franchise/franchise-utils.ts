import { getActorSystem, type RollActor } from "../utils/system-cast.js";
import { type FranchiseData } from "./franchise-schema.js";

export function findFranchiseActor(): Actor | null {
  if (!game.actors) return null;
  return game.actors.find((actor) => (actor.type as string) === "franchise") ?? null;
}

export function franchiseSystemData(actor: RollActor | Actor): FranchiseData {
  return getActorSystem<FranchiseData>(actor);
}
