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

export function gateAugmentationsForPrivateLife(
  augmentations: Augmentations,
  isPrivateLife: boolean,
): Augmentations {
  if (!isPrivateLife) {
    return augmentations;
  }

  return {
    cool: augmentations.cool,
    card: { available: false, selected: false },
    bank: { available: false, selected: false },
    talent: { available: false, selected: false },
  };
}
