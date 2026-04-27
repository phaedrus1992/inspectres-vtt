export interface SceneTransitionResult {
  agentsMoved: string[];
  sceneId: string;
}

export interface AgentResetResult {
  success: boolean;
  agentId: string;
}

// Structural interface for Foundry Scene (avoids full Foundry type in this module)
export interface RollScene {
  readonly id: string;
  readonly name: string;
  activate(): Promise<Scene>;
}

// Structural interface for Foundry Actor (avoids full Foundry type in this module)
export interface RollActor {
  readonly id: string;
  readonly name: string;
  getActiveTokens(linked?: boolean): TokenDocument[];
}

export async function transitionToConfessionalScene(
  scene: RollScene,
  agents?: RollActor[],
): Promise<SceneTransitionResult> {
  // Activate the confessional scene
  await scene.activate();

  const agentsMoved: string[] = [];

  // Move each agent's token to confessional scene
  if (agents) {
    for (const agent of agents) {
      const tokens = agent.getActiveTokens(true);
      for (const token of tokens) {
        await token.update({ sceneId: scene.id, x: 400, y: 400 });
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
  // Validate original scene exists
  const originalScene = game.scenes?.get(originalSceneId);
  if (!originalScene) {
    return {
      success: false,
      agentId: agent.id,
    };
  }

  // Move agent tokens back to original scene
  const tokens = agent.getActiveTokens(true);
  for (const token of tokens) {
    await token.update({ sceneId: originalSceneId });
  }

  return {
    success: true,
    agentId: agent.id,
  };
}
