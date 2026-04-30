let activeConfessionalSceneId: string | null = null;

function validateSceneId(sceneId: unknown, context: string): asserts sceneId is string {
  if (typeof sceneId !== "string") {
    throw new TypeError(`Scene ID required for ${context}: received ${typeof sceneId}`);
  }
  if (sceneId.trim() === "") {
    throw new Error(`Scene ID cannot be empty for ${context}`);
  }
}

export async function loadConfessionalScene(sceneId: string): Promise<string> {
  // #330: P0 blocker — input validation
  validateSceneId(sceneId, "loadConfessionalScene");

  // #330: P0 blocker — validate scene exists
  const scene = game.scenes?.get(sceneId);
  if (!scene) {
    throw new Error(`Scene not found: ${sceneId}`);
  }

  activeConfessionalSceneId = sceneId;
  return sceneId;
}

export async function returnFromConfessional(
  homeSceneId: string | null,
  confessionalSceneId: string,
): Promise<boolean> {
  // #330: P0 blocker — input validation
  if (homeSceneId === null || homeSceneId === undefined) {
    throw new Error("Home scene ID required for returnFromConfessional");
  }
  validateSceneId(homeSceneId, "returnFromConfessional home scene");
  validateSceneId(confessionalSceneId, "returnFromConfessional confessional scene");

  // #330: P0 blocker — validate home scene exists
  const homeScene = game.scenes?.get(homeSceneId);
  if (!homeScene) {
    throw new Error(`Home scene not found: ${homeSceneId}`);
  }

  activeConfessionalSceneId = null;
  return true;
}

export function getConfessionalSceneId(): string | null {
  return activeConfessionalSceneId;
}
