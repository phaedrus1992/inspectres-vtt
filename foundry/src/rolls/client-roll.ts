import { CLIENT_GENERATION_TABLE } from "./roll-charts.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";
import { getActorSystem, type RollActor } from "../utils/system-cast.js";
import { createChatMessage } from "../utils/fvtt-boundary.js";
import { getDevLogger } from "../utils/dev-logger.js";
import { rollDice } from "./roll-helpers.js";

export async function executeClientRoll(franchise: RollActor): Promise<void> {
  // Client rolls require a franchise actor — cannot be run as a standalone tool.
  // The franchise provides the GM context for generating random client attributes.
  // #274: Validate that franchise system is valid before proceeding.
  try {
    getActorSystem<FranchiseData>(franchise);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    getDevLogger().error("client-roll", "Client roll validation failed", {
      franchiseId: franchise.id,
      franchiseName: franchise.name,
      errorMessage: message,
    });
    ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorClientRollFailed") ?? "Client roll requires valid franchise actor");
    throw new Error(
      `Client roll requires valid franchise actor with system data. ${franchise.name} (ID: ${franchise.id}): ${message}`,
    );
  }

  const attributes = ["personality", "clientType", "occurrence", "location"] as const;
  const rolls: Roll[] = [];
  const generated: Record<string, string> = {};

  for (const attr of attributes) {
    const { roll, faces } = await rollDice(2);
    rolls.push(roll);
    const sum = faces.reduce((acc, f) => acc + f, 0);
    // 2d6 sums range 2–12; clamp to valid keys
    const key = Math.max(2, Math.min(12, sum));
    const table = CLIENT_GENERATION_TABLE[attr] as Record<number, string>;
    generated[attr] = table[key] ?? "";
  }

  // ChatMessage.getSpeaker requires the full Actor type; RollActor satisfies the needed fields at runtime
  const speaker = ChatMessage.getSpeaker({ actor: franchise as Actor });
  const content = await foundry.applications.handlebars.renderTemplate("systems/inspectres/templates/roll-card.hbs", {
    rollType: "client",
    title: game.i18n?.localize("INSPECTRES.ClientRoll") ?? "Client Roll",
    client: generated,
  });
  // Client roll results are GM prep — whisper to all GMs only
  const gmIds = (game.users?.filter((u) => u.isGM).map((u) => u.id).filter((id): id is string => id !== null)) ?? [];
  await createChatMessage({ content, speaker, rolls, whisper: gmIds });
}
