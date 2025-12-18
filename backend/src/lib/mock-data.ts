/**
 * Mock/Development Data for Testing
 * Provides realistic test data for API responses
 */

import type {
  MaterialInventoryItem,
  CharacterInstance,
  Recipe,
  InventoryResponse,
  RecipesResponse,
  PullResponse,
} from '@project-puff/shared';

export const MOCK_MATERIALS: MaterialInventoryItem[] = [
  {
    materialId: 'FLUFF',
    name: 'Fluff',
    rarity: 'common',
    quantity: 45,
  },
  {
    materialId: 'SPARK',
    name: 'Cosmic Spark',
    rarity: 'uncommon',
    quantity: 28,
  },
  {
    materialId: 'ESSENCE',
    name: 'Essence Fragment',
    rarity: 'rare',
    quantity: 12,
  },
  {
    materialId: 'CORE',
    name: 'Cosmic Core',
    rarity: 'legendary',
    quantity: 3,
  },
];

export const MOCK_CHARACTERS: CharacterInstance[] = [
  {
    serialNumber: 'S1-GPUFF-00001',
    charId: 'GPUFF',
    name: 'Golden Puff',
    rarity: 'legendary',
    acquisitionMethod: 'pull',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
  },
  {
    serialNumber: 'S1-SPARK-00042',
    charId: 'SPARK',
    name: 'Spark Guardian',
    rarity: 'rare',
    acquisitionMethod: 'pull',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
  {
    serialNumber: 'S1-COMMON-00156',
    charId: 'CRAT',
    name: 'Craftling',
    rarity: 'common',
    acquisitionMethod: 'craft',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
];

export const MOCK_RECIPES: Recipe[] = [
  {
    id: 'RECIPE_GPUFF',
    charId: 'GPUFF',
    charName: 'Golden Puff',
    charRarity: 'legendary',
    materials: [
      {
        materialId: 'CORE',
        name: 'Cosmic Core',
        required: 2,
        owned: 3,
      },
      {
        materialId: 'ESSENCE',
        name: 'Essence Fragment',
        required: 5,
        owned: 12,
      },
    ],
    totalPointCost: 250,
    craftable: true,
  },
  {
    id: 'RECIPE_SPARK',
    charId: 'SPARK',
    charName: 'Spark Guardian',
    charRarity: 'rare',
    materials: [
      {
        materialId: 'ESSENCE',
        name: 'Essence Fragment',
        required: 3,
        owned: 12,
      },
      {
        materialId: 'SPARK',
        name: 'Cosmic Spark',
        required: 8,
        owned: 28,
      },
    ],
    totalPointCost: 100,
    craftable: true,
  },
  {
    id: 'RECIPE_FLUFF',
    charId: 'FLUFF',
    charName: 'Fluffer',
    charRarity: 'common',
    materials: [
      {
        materialId: 'FLUFF',
        name: 'Fluff',
        required: 20,
        owned: 45,
      },
    ],
    totalPointCost: 20,
    craftable: true,
  },
  {
    id: 'RECIPE_RARE_NEED',
    charId: 'RARE_NPC',
    charName: 'Rare Character',
    charRarity: 'rare',
    materials: [
      {
        materialId: 'CORE',
        name: 'Cosmic Core',
        required: 5,
        owned: 3, // Not enough!
      },
      {
        materialId: 'ESSENCE',
        name: 'Essence Fragment',
        required: 15,
        owned: 12, // Not enough!
      },
    ],
    totalPointCost: 200,
    craftable: false,
  },
];

export function getMockInventory(): InventoryResponse {
  return {
    success: true,
    viewer: {
      twitchId: 'viewer_123',
      username: 'TestViewer',
      dustBalance: 1250,
    },
    materials: MOCK_MATERIALS,
    characters: MOCK_CHARACTERS,
  };
}

export function getMockRecipes(): RecipesResponse {
  return {
    success: true,
    recipes: MOCK_RECIPES,
  };
}

export function getMockPull(tier: 'single' | '5' | '10'): PullResponse {
  const pullCost = tier === 'single' ? 160 : tier === '5' ? 800 : 1600;

  // Simulate getting materials from a pull
  const materials: Array<{
    materialId: string;
    name: string;
    rarity: 'common' | 'uncommon';
    quantity: number;
  }> = [
    {
      materialId: 'FLUFF',
      name: 'Fluff',
      rarity: 'common',
      quantity: Math.floor(Math.random() * 5) + 1,
    },
    {
      materialId: 'SPARK',
      name: 'Cosmic Spark',
      rarity: 'uncommon',
      quantity: Math.floor(Math.random() * 3) + 1,
    },
  ];

  // Rarely include a character
  const characters: CharacterInstance[] = [];
  if (Math.random() > 0.85) {
    characters.push({
      serialNumber: `S1-PULL-${Date.now()}`,
      charId: 'GPUFF',
      name: 'Golden Puff',
      rarity: 'legendary',
      acquisitionMethod: 'pull',
      createdAt: new Date().toISOString(),
    });
  }

  return {
    success: true,
    newBalance: 1250 - pullCost,
    materials,
    characters,
  };
}
