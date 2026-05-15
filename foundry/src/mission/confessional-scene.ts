export interface SceneTransitionResult {
  agentsMoved: string[];
  sceneId: string;
}

export interface AgentResetResult {
  success: boolean;
  agentId: string;
}

// Structural interface for Foundry Scene (avoids full Foundry type in this module).
// Includes createEmbeddedDocuments for moving tokens between scenes (#572: TokenDocument.update
// does not accept sceneId — tokens are scene-embedded and must be re-created on the target).
export interface RollScene {
  readonly id: string;
  readonly name: string;
  activate(): Promise<Scene>;
  createEmbeddedDocuments(type: string, data: Record<string, unknown>[]): Promise<unknown>;
}

// Structural interface for Foundry Actor (avoids full Foundry type in this module)
export interface RollActor {
  readonly id: string;
  readonly name: string;
  getActiveTokens(linked?: boolean): TokenDocument[];
}

// Structural interface for the subset of TokenDocument used during scene transition.
// Real TokenDocument exposes parent (the Scene), toObject() (snapshot for re-create), and delete().
export interface RollToken {
  readonly parent: { readonly id: string } | null;
  toObject(): Record<string, unknown>;
  delete(): Promise<unknown>;
}

interface SceneRegistry {
  scenes?: { get(id: string): RollScene | null };
}

function getScene(id: string): RollScene | null {
  const registry = globalThis as unknown as { game?: SceneRegistry };
  return registry.game?.scenes?.get(id) ?? null;
}

async function moveToken(token: TokenDocument, targetScene: RollScene, x?: number, y?: number): Promise<void> {
  const t = token as unknown as RollToken;
  const base = t.toObject();
  const data: Record<string, unknown> = { ...base };
  if (x !== undefined) data["x"] = x;
  if (y !== undefined) data["y"] = y;
  await targetScene.createEmbeddedDocuments("Token", [data]);
  await t.delete();
}

export async function transitionToConfessionalScene(
  scene: RollScene,
  agents?: RollActor[],
): Promise<SceneTransitionResult> {
  await scene.activate();

  const agentsMoved: string[] = [];

  if (agents) {
    for (const agent of agents) {
      const tokens = agent.getActiveTokens(true);
      for (const token of tokens) {
        await moveToken(token, scene, 400, 400);
        agentsMoved.push(agent.id);
      }
    }
  }

  return {
    agentsMoved,
    sceneId: scene.id,
  };
}

export async function resetConfessionalScene(
  agent: RollActor,
  originalSceneId: string,
): Promise<AgentResetResult> {
  const originalScene = getScene(originalSceneId);
  if (!originalScene) {
    return {
      success: false,
      agentId: agent.id,
    };
  }

  const tokens = agent.getActiveTokens(true);
  for (const token of tokens) {
    await moveToken(token, originalScene);
  }

  return {
    success: true,
    agentId: agent.id,
  };
}
