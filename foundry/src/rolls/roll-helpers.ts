import { type DieFace } from "./roll-types.js";
import { type RollActor } from "../utils/system-cast.js";
import { updateDocument, createChatMessage } from "../utils/fvtt-boundary.js";

export function isDieFace(n: number): n is DieFace {
  return n >= 1 && n <= 6;
}

export function extractFaces(roll: Roll): number[] {
  return roll.dice.flatMap((t) => t.results).filter((r) => r.active !== false).map((r) => r.result);
}

export async function actorUpdate(actor: RollActor, data: Record<string, unknown>): Promise<void> {
  await updateDocument(actor, data);
}

export async function rollDice(count: number): Promise<{ roll: Roll; faces: number[] }> {
  const roll = new Roll(`${count}d6`);
  await roll.evaluate();
  return { roll, faces: extractFaces(roll) };
}

export function getOutcomeClassification(highestFace: number): "good" | "partial" | "bad" {
  if (highestFace < 1 || highestFace > 6) {
    throw new Error(`getOutcomeClassification: die face must be 1-6, got ${highestFace}`);
  }
  if (highestFace >= 5) return "good";
  if (highestFace >= 3) return "partial";
  return "bad";
}

export async function postChatCard(
  content: string,
  speaker: ReturnType<typeof ChatMessage.getSpeaker>,
  rolls: Roll[],
): Promise<void> {
  await createChatMessage({ content, speaker, rolls });
}
