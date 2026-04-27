interface SceneTransitionResult {
  agentsMoved: string[];
  sceneId: string;
}

interface AgentResetResult {
  success: boolean;
  agentId: string;
}

interface MockScene {
  id: string;
  name: string;
  activate: () => Promise<void>;
  tokens: { id: string; name: string }[];
}

interface MockActor {
  id: string;
  name: string;
  token: { id: string; sceneId: string } | null;
}

export async function transitionToConfessionalScene(
  scene: MockScene,
  agents?: MockActor[],
): Promise<SceneTransitionResult> {
  await scene.activate();

  const agentsMoved = agents ? agents.map((a) => a.id) : [];

  return {
    agentsMoved,
    sceneId: scene.id,
  };
}

export async function resetConfessionalScene(
  agent: MockActor,
  originalSceneId: string,
): Promise<AgentResetResult> {
  return {
    success: true,
    agentId: agent.id,
  };
}
