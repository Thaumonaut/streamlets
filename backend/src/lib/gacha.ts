/**
 * Gacha mechanics for pull system
 * Handles material rarity distribution and bonus character drops with pity system
 */

import type { Rarity, CharacterRarity } from '@project-puff/shared';
import { MATERIALS, CHARACTERS } from './recipes';

// Material rarity distribution
// Base weights for non-legendary materials (legendary uses pity system)
const MATERIAL_RARITY_WEIGHTS = {
  common: 60,      // 60%
  uncommon: 25,    // 25%
  rare: 12,        // 12%
  epic: 3,         // 3%
} as const;

// Bonus character rarity distribution (adjusted for balanced gameplay)
// Base weights (used when NOT getting a legendary from pity)
const CHARACTER_RARITY_WEIGHTS = {
  common: 85,      // 85% (increased for more common drops)
  rare: 11,        // 11%
  epic: 3.4,       // 3.4% (should see epics every ~30 pulls)
  legendary: 0.6,  // 0.6% base rate (pity system handles the rest)
} as const;

// Bonus character drop chance per pull
const BONUS_CHARACTER_CHANCE = 0.05; // 5%

// Pity system constants
const PITY_MAX = 90; // Hard guarantee at 90 pulls

/**
 * Calculate legendary rate based on pity counter using two-phase system
 * - Phase 1 (pulls 1-74): 0% (legendaries impossible)
 * - Phase 2 (pulls 75-90): Aggressive cubic scaling
 *   - Formula: rate = ((pityCounter - 74)^3) / 4096
 *   - Pull 75: ~0.024% (nearly impossible)
 *   - Pull 80: ~5.27%
 *   - Pull 85: ~32.5%
 *   - Pull 90: 100% (guaranteed at hard pity)
 */
export function calculateLegendaryRate(pityCounter: number): number {
  if (pityCounter >= PITY_MAX) {
    return 1.0; // 100% guaranteed at hard pity
  }

  // Phase 1: No legendaries before pull 75
  if (pityCounter < 75) {
    return 0;
  }

  // Phase 2: Aggressive cubic scaling from pull 75 to 90
  const adjustedPity = pityCounter - 74;
  const rate = Math.pow(adjustedPity, 3) / 4096;
  return Math.min(1.0, rate);
}

/**
 * Roll a random rarity based on weighted distribution using cumulative weights
 * This approach is more numerically stable than subtracting weights
 */
function rollWeightedRarity<T extends string>(weights: Record<T, number>): T {
  const items = Object.keys(weights) as T[];
  const weightValues = Object.values(weights);

  if (items.length !== weightValues.length) {
    throw new Error('Items and weights must be of the same size');
  }

  if (!items.length) {
    throw new Error('Items must not be empty');
  }

  // Build cumulative weights array
  // For weights [85, 11, 3.4], cumulative would be [85, 96, 99.4]
  const cumulativeWeights: number[] = [];
  for (let i = 0; i < weightValues.length; i++) {
    cumulativeWeights[i] = (weightValues[i] as number) + (cumulativeWeights[i - 1] || 0);
  }

  // Get random number in range [0...sum(weights)]
  const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1]!;
  const randomNumber = maxCumulativeWeight * Math.random();

  // Pick the item based on cumulative weights
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    if (cumulativeWeights[itemIndex]! >= randomNumber) {
      return items[itemIndex]!;
    }
  }

  // Fallback to last item (should never reach here)
  return items[items.length - 1]!;
}

/**
 * Roll a material rarity using pity system for legendaries
 */
export function rollMaterialRarity(pityCounter: number): Rarity {
  // Check if this roll hits legendary pity
  const legendaryRate = calculateLegendaryRate(pityCounter);

  if (Math.random() < legendaryRate) {
    return 'legendary';
  }

  // Otherwise, roll from non-legendary materials
  return rollWeightedRarity(MATERIAL_RARITY_WEIGHTS);
}

/**
 * Get a random material of a specific rarity
 */
export function getRandomMaterial(rarity: Rarity): string {
  const materialsOfRarity = MATERIALS.filter((m) => m.rarity === rarity);
  if (materialsOfRarity.length === 0) {
    throw new Error(`No materials found for rarity: ${rarity}`);
  }
  const randomIndex = Math.floor(Math.random() * materialsOfRarity.length);
  return materialsOfRarity[randomIndex]!.id;
}

/**
 * Roll materials for a pull with unified pity tracking
 * Pity increments once per PULL, not per material
 * Returns array of material IDs and updated pity counter
 */
export function rollMaterials(
  tier: 'single' | '5' | '10',
  currentPityCounter: number
): { materials: string[]; newPityCounter: number } {
  let count: number;

  switch (tier) {
    case 'single':
      count = Math.floor(Math.random() * 3) + 1; // 1-3 materials
      break;
    case '5':
      count = Math.floor(Math.random() * 11) + 10; // 10-20 materials
      break;
    case '10':
      count = Math.floor(Math.random() * 26) + 25; // 25-50 materials
      break;
    default:
      throw new Error(`Invalid tier: ${tier}`);
  }

  const materials: string[] = [];
  let pityCounter = currentPityCounter + 1; // Increment pity ONCE per pull
  let legendaryDropped = false;

  // At hard pity (90), guarantee a legendary material drop
  if (pityCounter >= PITY_MAX) {
    const materialId = getRandomMaterial('legendary');
    materials.push(materialId);
    legendaryDropped = true;
    pityCounter = 0; // Reset pity counter
    count--; // One less material to roll
  }

  // Check if legendary drops based on pity (only if not already dropped from hard pity)
  if (!legendaryDropped) {
    const legendaryRate = calculateLegendaryRate(pityCounter);
    if (Math.random() < legendaryRate) {
      const materialId = getRandomMaterial('legendary');
      materials.push(materialId);
      legendaryDropped = true;
      pityCounter = 0; // Reset pity counter
      count--; // One less material to roll
    }
  }

  // Roll remaining materials (non-legendary)
  for (let i = 0; i < count; i++) {
    const rarity = rollWeightedRarity(MATERIAL_RARITY_WEIGHTS);
    const materialId = getRandomMaterial(rarity);
    materials.push(materialId);
  }

  return {
    materials,
    newPityCounter: pityCounter,
  };
}

/**
 * Check if a bonus character drops (5% chance per pull)
 */
export function rollBonusCharacterDrop(): boolean {
  return Math.random() < BONUS_CHARACTER_CHANCE;
}

/**
 * Roll a character rarity for bonus drops (excluding pity legendary)
 * This is used for non-pity character drops
 */
export function rollCharacterRarity(): CharacterRarity {
  // Use weights without legendary for non-pity rolls
  const nonLegendaryWeights = {
    common: CHARACTER_RARITY_WEIGHTS.common,
    rare: CHARACTER_RARITY_WEIGHTS.rare,
    epic: CHARACTER_RARITY_WEIGHTS.epic,
  };

  return rollWeightedRarity(nonLegendaryWeights) as CharacterRarity;
}

/**
 * Get a random character of a specific rarity
 */
export function getRandomCharacter(rarity: CharacterRarity): string {
  const charactersOfRarity = CHARACTERS.filter((c) => c.rarity === rarity);
  if (charactersOfRarity.length === 0) {
    throw new Error(`No characters found for rarity: ${rarity}`);
  }
  const randomIndex = Math.floor(Math.random() * charactersOfRarity.length);
  return charactersOfRarity[randomIndex]!.id;
}

/**
 * Roll bonus characters for a pull with unified pity system
 * Pity increments once per sub-pull (10-pull = 10 pity)
 * Returns object with character IDs and updated pity counter
 */
export function rollBonusCharacters(
  tier: 'single' | '5' | '10',
  currentPityCounter: number
): { characters: string[]; newPityCounter: number } {
  let pullCount: number;

  switch (tier) {
    case 'single':
      pullCount = 1;
      break;
    case '5':
      pullCount = 5;
      break;
    case '10':
      pullCount = 10;
      break;
    default:
      throw new Error(`Invalid tier: ${tier}`);
  }

  const characters: string[] = [];
  let pityCounter = currentPityCounter;

  for (let i = 0; i < pullCount; i++) {
    pityCounter++; // Increment pity for each sub-pull

    // At hard pity (90), guarantee a legendary drop
    if (pityCounter >= PITY_MAX) {
      const characterId = getRandomCharacter('legendary');
      characters.push(characterId);
      pityCounter = 0; // Reset pity counter
      continue;
    }

    // Normal bonus character check (5% chance)
    if (rollBonusCharacterDrop()) {
      // Check if this pull hits legendary pity
      const legendaryRate = calculateLegendaryRate(pityCounter);
      const isLegendary = Math.random() < legendaryRate;

      if (isLegendary) {
        // Legendary drop - reset pity
        const characterId = getRandomCharacter('legendary');
        characters.push(characterId);
        pityCounter = 0; // Reset pity counter
      } else {
        // Normal drop (common/rare/epic)
        const rarity = rollCharacterRarity();
        const characterId = getRandomCharacter(rarity);
        characters.push(characterId);
      }
    }
  }

  return {
    characters,
    newPityCounter: pityCounter,
  };
}

/**
 * Aggregate materials by ID and count
 */
export function aggregateMaterials(materialIds: string[]): Array<{ materialId: string; quantity: number }> {
  const counts = new Map<string, number>();

  for (const id of materialIds) {
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([materialId, quantity]) => ({
    materialId,
    quantity,
  }));
}
