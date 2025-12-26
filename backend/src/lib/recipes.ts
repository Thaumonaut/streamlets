/**
 * Hardcoded materials, characters, and recipes for Phase 1 MVP
 * Based on: specs/001-phase-1-mvp/research.md
 */

import type { CharacterRarity, Rarity } from '@project-puff/shared';

// =============================================================================
// Material Point Values by Rarity
// =============================================================================
export const MATERIAL_POINT_VALUES = {
  common: 1,
  uncommon: 5,
  rare: 25,
  epic: 50,
  legendary: 100,
} as const;

// =============================================================================
// Material Definitions
// =============================================================================
export interface MaterialDef {
  id: string;
  name: string;
  rarity: Rarity;
  points: 1 | 5 | 25 | 50 | 100;
  description?: string;
}

export const MATERIALS: readonly MaterialDef[] = [
  // Common tier (1 point each) - 4-6 per spec
  { id: 'FLUFF', name: 'Fluff', rarity: 'common', points: 1, description: 'Soft and fluffy material' },
  { id: 'DUST', name: 'Cosmic Dust', rarity: 'common', points: 1, description: 'Shimmering space dust' },
  { id: 'WISP', name: 'Wisp', rarity: 'common', points: 1, description: 'Ethereal wisp of energy' },
  { id: 'EMBER', name: 'Ember', rarity: 'common', points: 1, description: 'Glowing ember' },

  // Uncommon tier (5 points each)
  { id: 'SPARK', name: 'Spark', rarity: 'uncommon', points: 5, description: 'Crackling spark of power' },
  { id: 'SHARD', name: 'Shard', rarity: 'uncommon', points: 5, description: 'Crystalline shard' },
  { id: 'GLOW', name: 'Glow', rarity: 'uncommon', points: 5, description: 'Radiant glow' },
  { id: 'CHARM', name: 'Charm', rarity: 'uncommon', points: 5, description: 'Magical charm' },

  // Rare tier (25 points each)
  { id: 'ESSENCE', name: 'Essence', rarity: 'rare', points: 25, description: 'Pure essence of magic' },
  { id: 'GEM', name: 'Gem', rarity: 'rare', points: 25, description: 'Precious gemstone' },
  { id: 'CRYSTAL', name: 'Crystal', rarity: 'rare', points: 25, description: 'Perfect crystal formation' },
  { id: 'ORB', name: 'Orb', rarity: 'rare', points: 25, description: 'Mysterious orb' },

  // Epic tier (50 points each)
  { id: 'NEXUS', name: 'Nexus Shard', rarity: 'epic', points: 50, description: 'A shard from the cosmic nexus' },
  { id: 'VOID_ESSENCE', name: 'Void Essence', rarity: 'epic', points: 50, description: 'Essence extracted from the void' },
  { id: 'ASTRAL_GEM', name: 'Astral Gem', rarity: 'epic', points: 50, description: 'A gem infused with astral energy' },

  // Legendary tier (100 points each)
  { id: 'CORE', name: 'Prism Core', rarity: 'legendary', points: 100, description: 'Legendary prism core' },
  { id: 'SOUL', name: 'Soul Fragment', rarity: 'legendary', points: 100, description: 'Fragment of a soul' },
  { id: 'STAR', name: 'Star Dust', rarity: 'legendary', points: 100, description: 'Dust from a fallen star' },
] as const;

// =============================================================================
// Character Definitions
// =============================================================================
export interface CharacterDef {
  id: string;
  name: string;
  rarity: CharacterRarity;
  description?: string;
}

export const CHARACTERS: readonly CharacterDef[] = [
  // Common characters
  { id: 'GPUFF', name: 'Golden Puff', rarity: 'common', description: 'A fluffy golden creature' },
  { id: 'CBIRD', name: 'Cloud Bird', rarity: 'common', description: 'A bird made of clouds' },
  { id: 'STARF', name: 'Starfish', rarity: 'common', description: 'A cosmic starfish' },

  // Rare characters
  { id: 'COWL', name: 'Cosmic Owl', rarity: 'rare', description: 'A wise owl from the cosmos' },
  { id: 'PHOENIX', name: 'Phoenix', rarity: 'rare', description: 'A legendary firebird' },

  // Epic characters
  { id: 'NEBULA', name: 'Nebula Dragon', rarity: 'epic', description: 'A majestic dragon born from cosmic nebulae' },
  { id: 'ASTRAL', name: 'Astral Guardian', rarity: 'epic', description: 'An ancient guardian of the stars' },
  { id: 'VOID', name: 'Void Walker', rarity: 'epic', description: 'A mysterious entity that walks between dimensions' },

  // Legendary characters
  { id: 'COSMOS', name: 'Cosmos Emperor', rarity: 'legendary', description: 'The supreme ruler of all cosmic realms' },
  { id: 'CELESTIAL', name: 'Celestial Phoenix', rarity: 'legendary', description: 'A divine phoenix that embodies the universe itself' },
] as const;

// =============================================================================
// Recipe Definitions
// =============================================================================
export interface RecipeDef {
  id: string;
  charId: string;
  charName: string;
  charRarity: CharacterRarity;
  materials: Record<string, number>;
  totalPoints: number;
}

export const RECIPES: readonly RecipeDef[] = [
  // Common characters (85-115 point budget per spec)
  {
    id: 'RECIPE_GPUFF',
    charId: 'GPUFF',
    charName: 'Golden Puff',
    charRarity: 'common',
    materials: {
      FLUFF: 50,  // 50 * 1 = 50
      DUST: 40,   // 40 * 1 = 40
      SPARK: 2,   // 2 * 5 = 10
    },
    totalPoints: 100,
  },
  {
    id: 'RECIPE_CBIRD',
    charId: 'CBIRD',
    charName: 'Cloud Bird',
    charRarity: 'common',
    materials: {
      WISP: 60,   // 60 * 1 = 60
      EMBER: 30,  // 30 * 1 = 30
      GLOW: 2,    // 2 * 5 = 10
    },
    totalPoints: 100,
  },
  {
    id: 'RECIPE_STARF',
    charId: 'STARF',
    charName: 'Starfish',
    charRarity: 'common',
    materials: {
      DUST: 70,   // 70 * 1 = 70
      SPARK: 3,   // 3 * 5 = 15
      SHARD: 3,   // 3 * 5 = 15
    },
    totalPoints: 100,
  },

  // Rare characters (425-575 point budget per spec)
  {
    id: 'RECIPE_COWL',
    charId: 'COWL',
    charName: 'Cosmic Owl',
    charRarity: 'rare',
    materials: {
      FLUFF: 100,  // 100 * 1 = 100
      SPARK: 20,   // 20 * 5 = 100
      ESSENCE: 12, // 12 * 25 = 300
    },
    totalPoints: 500,
  },
  {
    id: 'RECIPE_PHOENIX',
    charId: 'PHOENIX',
    charName: 'Phoenix',
    charRarity: 'rare',
    materials: {
      EMBER: 150,  // 150 * 1 = 150
      CHARM: 30,   // 30 * 5 = 150
      GEM: 8,      // 8 * 25 = 200
    },
    totalPoints: 500,
  },
] as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all material definitions as array for database seeding
 */
export function getMaterialsForSeeding() {
  return MATERIALS.map(m => ({
    id: m.id,
    name: m.name,
    rarity: m.rarity,
    pointValue: m.points,
    description: m.description || null,
    iconUrl: null,
  }));
}

/**
 * Get all character definitions as array for database seeding
 */
export function getCharactersForSeeding() {
  return CHARACTERS.map(c => ({
    id: c.id,
    name: c.name,
    rarity: c.rarity,
    description: c.description || null,
    artworkUrl: null,
    season: 1,
  }));
}

/**
 * Get all recipes for database seeding
 */
export function getRecipesForSeeding() {
  return RECIPES.map(r => ({
    id: r.id,
    charId: r.charId,
    totalPointCost: r.totalPoints,
  }));
}

/**
 * Get recipe materials for database seeding (junction table entries)
 */
export function getRecipeMaterialsForSeeding() {
  const entries: Array<{ recipeId: string; materialId: string; quantity: number }> = [];

  for (const recipe of RECIPES) {
    for (const [materialId, quantity] of Object.entries(recipe.materials)) {
      entries.push({
        recipeId: recipe.id,
        materialId,
        quantity,
      });
    }
  }

  return entries;
}
