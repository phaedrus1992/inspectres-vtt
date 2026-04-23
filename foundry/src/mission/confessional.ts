export interface ConfessionalTracker {
  sessionId: string;
  confessionalUsed: boolean;
  characteristics: Array<{ agentId: string; characteristicName: string }>;
}

export interface CharacteristicResult {
  allowed: boolean;
  error?: string;
  characteristics: Array<{ agentId: string; characteristicName: string }>;
  confessionalUsed: boolean;
}

export function createConfessionalTracker(sessionId: string): ConfessionalTracker {
  return {
    sessionId,
    confessionalUsed: false,
    characteristics: [],
  };
}

export function addCharacteristic(
  tracker: ConfessionalTracker,
  agentId: string,
  characteristicName: string,
): CharacteristicResult {
  if (tracker.confessionalUsed) {
    return {
      allowed: false,
      error: "Only one confessional per scene allowed.",
      characteristics: tracker.characteristics,
      confessionalUsed: tracker.confessionalUsed,
    };
  }

  return {
    allowed: true,
    characteristics: [...tracker.characteristics, { agentId, characteristicName }],
    confessionalUsed: true,
  };
}

export function getCharacteristicsForSession(
  tracker: ConfessionalTracker,
  agentId: string,
): string[] {
  return tracker.characteristics
    .filter((c) => c.agentId === agentId)
    .map((c) => c.characteristicName);
}
