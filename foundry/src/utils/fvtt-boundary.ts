/**
 * Consolidates the repeated `as unknown as Parameters<...>` casts at the
 * fvtt-types boundary. fvtt-types v13 requires full document data shapes for
 * `update()` and `ChatMessage.create()`; partial dot-path updates are safe at
 * runtime but cannot be expressed in the type system without TypeDataModel
 * registration.
 *
 * Use these helpers instead of inlining `as unknown as Parameters<typeof X>[0]`.
 * See foundry-vite.md "actor.system Casting" for full context.
 */

interface Updatable {
  update(data: Record<string, unknown>): Promise<unknown>;
}

/**
 * Apply a partial dot-path update to any Foundry document.
 *
 * @example
 * await updateDocument(this.actor, { "system.stress": 3 });
 */
export async function updateDocument(doc: Updatable, data: Record<string, unknown>): Promise<unknown> {
  return doc.update(data as unknown as Parameters<typeof doc.update>[0]);
}

interface ChatMessageStatic {
  create(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}

/**
 * Create a ChatMessage with partial data. fvtt-types requires the full
 * ChatMessageData shape; runtime accepts the partial form Foundry documents.
 *
 * @example
 * await createChatMessage({ content, speaker, flavor });
 */
export async function createChatMessage(
  data: Record<string, unknown>,
  options?: Record<string, unknown>,
): Promise<unknown> {
  const messageStatic = ChatMessage as unknown as ChatMessageStatic;
  return options ? messageStatic.create(data, options) : messageStatic.create(data);
}

interface SettingsApi {
  get(namespace: string, key: string): unknown;
  set(namespace: string, key: string, value: unknown): Promise<unknown>;
  register(namespace: string, key: string, data: unknown): void;
}

/**
 * Access game.settings with proper typing. fvtt-types lacks the full
 * settings API surface; this consolidates the cast.
 */
export function settingsApi(): SettingsApi {
  return game.settings as unknown as SettingsApi;
}
