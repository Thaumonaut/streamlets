/**
 * API Route Handlers for Streamlets
 * Handles all business logic for API endpoints
 */

import type { Response } from 'express';
import type { AuthenticatedRequest } from '../lib/auth';
import { getMockInventory, getMockRecipes, getMockPull } from '../lib/mock-data';

/**
 * POST /api/watch-time
 * Award watch time currency to viewer
 */
export async function watchTimeHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      res.status(400).json({ error: 'Missing channelId' });
      return;
    }

    // TODO: Implement actual database logic
    // For now, return mock response
    const awardedAmount = 10;
    const newBalance = 1250 + awardedAmount;

    res.json({
      success: true,
      newBalance,
      awarded: awardedAmount,
    });
  } catch (error) {
    console.error('Watch time handler error:', error);
    res.status(500).json({ error: 'Failed to process watch time' });
  }
}

/**
 * POST /api/pulls
 * Execute a gacha pull for the viewer
 */
export async function pullsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tier } = req.body;

    if (!tier || !['single', '5', '10'].includes(tier)) {
      res.status(400).json({ error: 'Invalid pull tier' });
      return;
    }

    // TODO: Implement actual database logic
    // For now, return mock response
    const pullResult = getMockPull(tier);

    res.json(pullResult);
  } catch (error) {
    console.error('Pulls handler error:', error);
    res.status(500).json({ error: 'Failed to execute pull' });
  }
}

/**
 * POST /api/craft
 * Craft a character from a recipe
 */
export async function craftHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { recipeId } = req.body;

    if (!recipeId) {
      res.status(400).json({ error: 'Missing recipeId' });
      return;
    }

    // TODO: Implement actual database logic
    // For now, return mock response
    const inventory = getMockInventory();
    const recipe = getMockRecipes().recipes.find((r) => r.id === recipeId);

    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    if (!recipe.craftable) {
      res.status(400).json({
        error: 'Insufficient materials',
        missing: recipe.materials
          .filter((m) => m.owned < m.required)
          .map((m) => ({
            materialId: m.materialId,
            required: m.required,
            owned: m.owned,
          })),
      });
      return;
    }

    // Simulate successful craft
    res.json({
      success: true,
      character: {
        serialNumber: `S1-${Date.now()}`,
        charId: recipe.charId,
        name: recipe.charName,
        rarity: recipe.charRarity,
        acquisitionMethod: 'craft',
        createdAt: new Date().toISOString(),
      },
      remainingMaterials: inventory.materials,
    });
  } catch (error) {
    console.error('Craft handler error:', error);
    res.status(500).json({ error: 'Failed to craft character' });
  }
}

/**
 * GET /api/inventory
 * Get viewer's current inventory
 */
export async function inventoryHandler(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // TODO: Implement actual database lookup using _req.viewer?.user_id
    // For now, return mock response
    const inventory = getMockInventory();

    res.json(inventory);
  } catch (error) {
    console.error('Inventory handler error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

/**
 * GET /api/recipes
 * Get all available recipes for crafting
 */
export async function recipesHandler(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // TODO: Implement actual database lookup with viewer's current materials
    // For now, return mock response
    const recipes = getMockRecipes();

    res.json(recipes);
  } catch (error) {
    console.error('Recipes handler error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
}
