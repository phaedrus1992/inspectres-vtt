export interface AugmentationState {
  available: boolean;
  selected: boolean;
}

export interface Augmentations {
  cool: AugmentationState;
  card: AugmentationState;
  bank: AugmentationState;
  talent: AugmentationState;
}

function validateAugmentationState(state: unknown): asserts state is AugmentationState {
  if (typeof state !== "object" || state === null) {
    throw new Error("Augmentation state must be an object");
  }
  const obj = state as Record<string, unknown>;
  if (typeof obj["available"] !== "boolean") {
    throw new Error("Augmentation state must be boolean for 'available' property");
  }
  if (typeof obj["selected"] !== "boolean") {
    throw new Error("Augmentation state must be boolean for 'selected' property");
  }
}

function validateAugmentations(augmentations: unknown): asserts augmentations is Augmentations {
  if (typeof augmentations !== "object" || augmentations === null) {
    throw new Error("Augmentations object required for gating evaluation");
  }
  const obj = augmentations as Record<string, unknown>;

  for (const key of ["cool", "card", "bank", "talent"] as const) {
    if (!(key in obj)) {
      throw new Error(`Augmentation ${key} state required but missing`);
    }
    validateAugmentationState(obj[key]);
  }
}

export function gateAugmentationsForPrivateLife(
  augmentations: Augmentations,
  isPrivateLife: boolean,
): Augmentations {
  validateAugmentations(augmentations);

  if (!isPrivateLife) {
    // Return fresh object even when not gating
    return {
      cool: { ...augmentations.cool },
      card: { ...augmentations.card },
      bank: { ...augmentations.bank },
      talent: { ...augmentations.talent },
    };
  }

  // Gate augmentations: return new objects with card/bank/talent unavailable
  return {
    cool: { ...augmentations.cool },
    card: { available: false, selected: false },
    bank: { available: false, selected: false },
    talent: { available: false, selected: false },
  };
}
