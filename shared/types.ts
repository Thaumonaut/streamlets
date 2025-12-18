/**
 * Shared TypeScript types for Streamlets Phase 1 MVP
 * Used by both extension frontend and backend API
 *
 * Generated from: specs/001-phase-1-mvp/data-model.md
 * API Contract: specs/001-phase-1-mvp/contracts/api.openapi.yaml
 */

// ============================================================================
// Domain Enums
// ============================================================================

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type CharacterRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type PullTier = 'single' | '5' | '10';
export type AcquisitionMethod = 'pull' | 'craft';

// ============================================================================
// Core Domain Entities
// ============================================================================

export interface Viewer {
  id: number;
  twitchId: string;
  twitchUsername: string | null;
  dustBalance: number;
  lastWatchHeartbeat: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialDefinition {
  id: string; // e.g., "FLUFF", "SPARK", "ESSENCE", "CORE"
  name: string; // e.g., "Fluff", "Cosmic Dust"
  rarity: Rarity;
  pointValue: 1 | 5 | 25 | 100; // Material point system
  description?: string;
  iconUrl?: string;
}

export interface MaterialInventoryItem {
  materialId: string;
  name: string;
  rarity: Rarity;
  quantity: number;
}

export interface CharacterDefinition {
  id: string; // e.g., "GPUFF", "COWL"
  name: string; // e.g., "Golden Puff", "Cosmic Owl"
  rarity: CharacterRarity;
  description?: string;
  artworkUrl?: string;
  season: number; // Always 1 for MVP
  createdAt: Date;
}

export interface CharacterInstance {
  serialNumber: string; // e.g., "S1-GPUFF-00047"
  charId: string;
  name: string;
  rarity: CharacterRarity;
  acquisitionMethod: AcquisitionMethod;
  createdAt: string; // ISO 8601 timestamp
}

export interface Recipe {
  id: string; // e.g., "RECIPE_GPUFF"
  charId: string;
  charName: string;
  charRarity: CharacterRarity;
  materials: RecipeMaterial[];
  totalPointCost: number;
  craftable: boolean; // Computed based on viewer inventory
}

export interface RecipeMaterial {
  materialId: string;
  name: string;
  required: number;
  owned: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// POST /api/watch-time
export interface WatchTimeRequest {
  channelId: string;
}

export interface WatchTimeResponse {
  success: boolean;
  newBalance: number;
  awarded: number;
}

// POST /api/pulls
export interface PullRequest {
  tier: PullTier;
}

export interface PullResponse {
  success: boolean;
  newBalance: number;
  materials: Array<{
    materialId: string;
    name: string;
    rarity: Rarity;
    quantity: number;
  }>;
  characters: CharacterInstance[];
}

// POST /api/craft
export interface CraftRequest {
  recipeId: string;
}

export interface CraftResponse {
  success: boolean;
  character: CharacterInstance;
  remainingMaterials: MaterialInventoryItem[];
}

export interface CraftErrorResponse {
  error: string;
  missing?: Array<{
    materialId: string;
    required: number;
    owned: number;
  }>;
}

// GET /api/inventory
export interface InventoryResponse {
  success: boolean;
  viewer: {
    twitchId: string;
    username: string;
    dustBalance: number;
  };
  materials: MaterialInventoryItem[];
  characters: CharacterInstance[];
}

// GET /api/recipes
export interface RecipesResponse {
  success: boolean;
  recipes: Recipe[];
}

// ============================================================================
// Error Response Types
// ============================================================================

export interface ErrorResponse {
  error: string;
  retryAfter?: number; // For rate limiting
}

// ============================================================================
// Pull System Configuration (from spec clarifications)
// ============================================================================

export const PULL_COSTS = {
  single: 50,
  '5': 225,   // 10% discount
  '10': 400,  // 20% discount
} as const;

export const STARTING_DUST = 250;

export const MATERIAL_RARITY_DISTRIBUTION = {
  common: 0.60,     // 60%
  uncommon: 0.25,   // 25%
  rare: 0.12,       // 12%
  legendary: 0.03,  // 3%
} as const;

export const BONUS_CHARACTER_CHANCE = 0.05; // 5% per pull

export const BONUS_CHARACTER_RARITY_DISTRIBUTION = {
  common: 0.70,     // 70%
  rare: 0.20,       // 20%
  epic: 0.08,       // 8%
  legendary: 0.02,  // 2%
} as const;

export const PULL_MATERIAL_YIELDS = {
  single: { min: 1, max: 3 },
  '5': { min: 10, max: 20 },
  '10': { min: 1, max: 50 }, // up to 50
} as const;

export const RATE_LIMIT_PULLS_MS = 2000; // 2 seconds between pulls
export const WATCH_TIME_HEARTBEAT_INTERVAL_MS = 60000; // 60 seconds
export const DUST_PER_HEARTBEAT = 2; // 10 Dust per 5 minutes

// ============================================================================
// Recipe Point Budgets (from constitution & spec)
// ============================================================================

export const RECIPE_POINT_BUDGETS = {
  common: { min: 85, max: 115, target: 100 },
  rare: { min: 425, max: 575, target: 500 },
  epic: { min: 1700, max: 2300, target: 2000 },
  legendary: { min: 6800, max: 9200, target: 8000 },
} as const;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type guard to check if a string is a valid PullTier
 */
export function isPullTier(value: unknown): value is PullTier {
  return value === 'single' || value === '5' || value === '10';
}

/**
 * Type guard to check if a string is a valid Rarity
 */
export function isRarity(value: unknown): value is Rarity {
  return (
    value === 'common' ||
    value === 'uncommon' ||
    value === 'rare' ||
    value === 'legendary'
  );
}

/**
 * Type guard to check if a string is a valid CharacterRarity
 */
export function isCharacterRarity(value: unknown): value is CharacterRarity {
  return (
    value === 'common' ||
    value === 'rare' ||
    value === 'epic' ||
    value === 'legendary'
  );
}

/**
 * Calculate total point cost for a recipe
 */
export function calculateRecipePointCost(
  materials: Array<{ materialId: string; quantity: number }>,
  materialDefinitions: Map<string, MaterialDefinition>
): number {
  return materials.reduce((total, { materialId, quantity }) => {
    const material = materialDefinitions.get(materialId);
    if (!material) {
      throw new Error(`Unknown material: ${materialId}`);
    }
    return total + material.pointValue * quantity;
  }, 0);
}

/**
 * Check if viewer can craft a recipe
 */
export function canCraftRecipe(
  recipe: Recipe,
  inventory: MaterialInventoryItem[]
): boolean {
  const inventoryMap = new Map(inventory.map((item) => [item.materialId, item.quantity]));

  return recipe.materials.every((required) => {
    const owned = inventoryMap.get(required.materialId) || 0;
    return owned >= required.required;
  });
}

/**
 * Format serial number for display
 */
export function formatSerialNumber(serial: string): string {
  // S1-GPUFF-00047 → #47
  const parts = serial.split('-');
  if (parts.length === 3) {
    return `#${parseInt(parts[2], 10)}`;
  }
  return serial;
}

/**
 * Parse Twitch JWT (client-side only, validation happens server-side)
 */
export interface TwitchJWTPayload {
  user_id: string; // Viewer's Twitch ID
  channel_id: string; // Channel being watched
  role: 'viewer' | 'broadcaster' | 'moderator';
  exp: number; // Expiration timestamp
}

/**
 * Extract JWT from Twitch extension URL fragment
 * Example: #token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
export function extractTwitchJWT(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.slice(1); // Remove '#'
  const params = new URLSearchParams(hash);
  return params.get('token');
}
