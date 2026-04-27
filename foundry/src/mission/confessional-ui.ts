let activeConfessionalSceneId: string | null = null;

export async function loadConfessionalScene(sceneId: string): Promise<string> {
  activeConfessionalSceneId = sceneId;
  return sceneId;
}

export async function returnFromConfessional(
  homeSceneId: string | null,
  confessionalSceneId: string,
): Promise<boolean> {
  if (!homeSceneId) {
    return false;
  }

  activeConfessionalSceneId = null;
  return true;
}

export function getConfessionalSceneId(): string | null {
  return activeConfessionalSceneId;
}
