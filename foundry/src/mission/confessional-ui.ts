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

  // #330: P0 blocker — validate scene exists (requires Foundry API)
  // TODO: Add Foundry scene validation: game.scenes?.get(sceneId)
  // if (!game.scenes?.get(sceneId)) {
  //   throw new Error(`Scene not found: ${sceneId}`);
  // }

  activeConfessionalSceneId = sceneId;
  return sceneId;
}

export async function returnFromConfessional(
  homeSceneId: string | null,
  confessionalSceneId: string,
): Promise<boolean> {
  // #330: P0 blocker — input validation (currently silently returns false)
  if (homeSceneId === null || homeSceneId === undefined) {
    throw new Error("Home scene ID required for returnFromConfessional");
  }
  validateSceneId(homeSceneId, "returnFromConfessional home scene");
  validateSceneId(confessionalSceneId, "returnFromConfessional confessional scene");

  // #330: P0 blocker — validate home scene exists (requires Foundry API)
  // TODO: Add Foundry scene validation: game.scenes?.get(homeSceneId)
  // if (!game.scenes?.get(homeSceneId)) {
  //   throw new Error(`Home scene not found: ${homeSceneId}`);
  // }

  activeConfessionalSceneId = null;
  return true;
}

export function getConfessionalSceneId(): string | null {
  return activeConfessionalSceneId;
}
