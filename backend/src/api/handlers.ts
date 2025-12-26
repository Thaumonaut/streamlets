/**
 * API Route Handlers for Streamlets
 * Handles all business logic for API endpoints with real database logic
 */

import type { Response } from 'express';
import type { AuthenticatedRequest } from '../lib/auth';
import { db } from '../db/index';
import {
  viewers,
  materialInventory,
  characterInstances,
  materialDefinitions,
  characterDefinitions,
  recipes,
  recipeMaterials,
  pullResults,
} from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { rollMaterials, rollBonusCharacters, aggregateMaterials } from '../lib/gacha';
import { canPull, getRemainingCooldown } from '../lib/rate-limit';
import { MATERIALS, CHARACTERS } from '../lib/recipes';

// Pull tier costs (from spec FR-006)
const PULL_COSTS = {
  single: 50,
  '5': 225,
  '10': 400,
} as const;

const DUST_PER_HEARTBEAT = 8; // 16 Dust per 2-minute heartbeat => 480 Dust/hour (~400 Dust in 50 min)

/**
 * Helper: Get or create viewer
 */
async function getOrCreateViewer(twitchId: string) {
  let viewer = await db.select().from(viewers).where(eq(viewers.twitchId, twitchId)).limit(1);

  if (viewer.length === 0) {
    // Create new viewer with 250 starting Dust
    const newViewer = await db
      .insert(viewers)
      .values({
        twitchId,
        dustBalance: 250,
      })
      .returning();
    return newViewer[0]!;
  }

  return viewer[0]!;
}

/**
 * POST /api/watch-time
 * Award watch time currency to viewer
 */
export async function watchTimeHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.viewer) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { channelId } = req.body;

    if (!channelId) {
      res.status(400).json({ error: 'Missing channelId' });
      return;
    }

    const viewerId = req.viewer.user_id;

    // Get or create viewer
    let viewer = await getOrCreateViewer(viewerId);

    // TODO: Validate stream is live via Twitch Helix API
    // For MVP, we'll award currency on every heartbeat

    // Check if enough time has passed since last heartbeat (55s minimum)
    const now = new Date();
    if (viewer.lastWatchHeartbeat) {
      const elapsed = now.getTime() - viewer.lastWatchHeartbeat.getTime();
      if (elapsed < 55000) {
        res.status(429).json({
          error: 'Heartbeat too frequent',
          retryAfter: Math.ceil((55000 - elapsed) / 1000),
        });
        return;
      }
    }

    // Award Dust and update timestamp
    const updated = await db
      .update(viewers)
      .set({
        dustBalance: sql`${viewers.dustBalance} + ${DUST_PER_HEARTBEAT}`,
        lastWatchHeartbeat: now,
        updatedAt: now,
      })
      .where(eq(viewers.twitchId, viewerId))
      .returning();

    const newBalance = updated[0]!.dustBalance;

    res.json({
      success: true,
      newBalance,
      awarded: DUST_PER_HEARTBEAT,
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
    console.log('[PullHandler] ===== New pull request =====');

    if (!req.viewer) {
      console.log('[PullHandler] ERROR: Not authenticated');
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { tier } = req.body;

    if (!tier || !['single', '5', '10'].includes(tier)) {
      console.log('[PullHandler] ERROR: Invalid pull tier:', tier);
      res.status(400).json({ error: 'Invalid pull tier' });
      return;
    }

    const viewerId = req.viewer.user_id;
    const cost = PULL_COSTS[tier as keyof typeof PULL_COSTS];

    console.log(`[PullHandler] ViewerId: ${viewerId}, Tier: ${tier}, Cost: ${cost}`);

    // Check rate limit
    if (!canPull(viewerId)) {
      const remaining = getRemainingCooldown(viewerId);
      console.log(`[PullHandler] ERROR: Rate limited, retry after ${remaining}ms`);
      res.status(429).json({
        error: 'Rate limited',
        retryAfter: Math.ceil(remaining / 1000),
      });
      return;
    }

    // Get viewer
    let viewer = await getOrCreateViewer(viewerId);
    console.log(`[PullHandler] Viewer loaded: Balance=${viewer.dustBalance}, PityCounter=${viewer.pityCounter}`);

    // Check balance
    if (viewer.dustBalance < cost) {
      console.log(`[PullHandler] ERROR: Insufficient dust. Required: ${cost}, Current: ${viewer.dustBalance}`);
      res.status(402).json({
        error: 'Insufficient Dust',
        required: cost,
        current: viewer.dustBalance,
      });
      return;
    }

    // Roll materials with pity tracking (pity resets on legendary material)
    const { materials: rolledMaterialIds, newPityCounter: pityAfterMaterials } = rollMaterials(tier, viewer.pityCounter);

    // Roll bonus characters with updated pity (pity resets on legendary character)
    const { characters: rolledCharacterIds, newPityCounter: finalPityCounter } = rollBonusCharacters(tier, pityAfterMaterials);

    console.log(`[PullHandler] Gacha rolls complete: ${rolledMaterialIds.length} materials, ${rolledCharacterIds.length} characters`);
    console.log(`[PullHandler] Pity counter updated: ${viewer.pityCounter} -> ${pityAfterMaterials} (after materials) -> ${finalPityCounter} (final)`);

    // Aggregate materials
    const materialCounts = aggregateMaterials(rolledMaterialIds);

    // Begin transaction
    console.log('[PullHandler] Starting database transaction...');
    await db.transaction(async (tx) => {
      // Deduct Dust and update pity counter
      console.log(`[PullHandler] Updating viewer: deducting ${cost} dust, setting pityCounter to ${finalPityCounter}`);
      await tx
        .update(viewers)
        .set({
          dustBalance: sql`${viewers.dustBalance} - ${cost}`,
          pityCounter: finalPityCounter,
          updatedAt: new Date(),
        })
        .where(eq(viewers.id, viewer.id));

      // Add materials to inventory (batch upsert)
      for (const { materialId, quantity } of materialCounts) {
        await tx
          .insert(materialInventory)
          .values({
            viewerId: viewer.id,
            materialId,
            quantity,
          })
          .onConflictDoUpdate({
            target: [materialInventory.viewerId, materialInventory.materialId],
            set: {
              quantity: sql`${materialInventory.quantity} + ${quantity}`,
              updatedAt: new Date(),
            },
          });
      }

      // Add bonus characters
      const createdCharacters: Array<{ id: number; serialNumber: string; charId: string; ownerId: number; acquisitionMethod: string; createdAt: Date | null }> = [];
      for (const charId of rolledCharacterIds) {
        const result = await tx.execute(sql`SELECT generate_serial(${charId}) as serial`);
        const serialNumber = (result as any)[0]?.serial;

        if (!serialNumber) {
          throw new Error('Failed to generate serial number');
        }

        const char = await tx
          .insert(characterInstances)
          .values({
            serialNumber,
            charId,
            ownerId: viewer.id,
            acquisitionMethod: 'pull',
          })
          .returning();

        if (char[0]) {
          createdCharacters.push(char[0]);
        }
      }

      // Log pull result
      await tx.insert(pullResults).values({
        viewerId: viewer.id,
        tier,
        dustCost: cost,
        materialsReceived: materialCounts,
        charactersReceived: createdCharacters.map((c) => ({
          charId: c.charId,
          serialNumber: c.serialNumber,
        })),
      });

      console.log('[PullHandler] Transaction complete - all data saved');
    });

    // Get updated balance and pity counter
    const updated = await db.select().from(viewers).where(eq(viewers.id, viewer.id)).limit(1);
    const newBalance = updated[0]!.dustBalance;
    const updatedPityCounter = updated[0]!.pityCounter;
    console.log(`[PullHandler] Final state: Balance=${newBalance}, PityCounter=${updatedPityCounter}`);

    // Format response
    const materialsWithDetails = materialCounts.map((mc) => {
      const def = MATERIALS.find((m) => m.id === mc.materialId)!;
      return {
        materialId: mc.materialId,
        name: def.name,
        rarity: def.rarity,
        quantity: mc.quantity,
      };
    });

    const charactersWithDetails = rolledCharacterIds.map((charId) => {
      const def = CHARACTERS.find((c) => c.id === charId)!;
      return {
        charId,
        name: def.name,
        rarity: def.rarity,
      };
    });

    console.log(`[PullHandler] Sending successful response with ${materialsWithDetails.length} material types, ${charactersWithDetails.length} characters`);
    res.json({
      success: true,
      newBalance,
      pityCounter: updatedPityCounter,
      materials: materialsWithDetails,
      characters: charactersWithDetails,
    });
    console.log('[PullHandler] ===== Pull request complete =====');
  } catch (error) {
    console.error('[PullHandler] ===== FATAL ERROR =====');
    console.error('[PullHandler] Error details:', error);
    console.error('[PullHandler] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: 'Failed to execute pull' });
  }
}

/**
 * POST /api/craft
 * Craft a character from a recipe
 */
export async function craftHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.viewer) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { recipeId } = req.body;

    if (!recipeId) {
      res.status(400).json({ error: 'Missing recipeId' });
      return;
    }

    const viewerId = req.viewer.user_id;
    let viewer = await getOrCreateViewer(viewerId);

    // Get recipe with material requirements
    const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);

    if (recipe.length === 0) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    const recipeData = recipe[0]!;

    // Get material requirements
    const requirements = await db.select().from(recipeMaterials).where(eq(recipeMaterials.recipeId, recipeId));

    // Check viewer's materials
    const viewerMaterials = await db
      .select()
      .from(materialInventory)
      .where(eq(materialInventory.viewerId, viewer.id));

    const materialMap = new Map(viewerMaterials.map((m) => [m.materialId, m.quantity]));

    // Validate sufficient materials
    const missing = [];
    for (const req of requirements) {
      const owned = materialMap.get(req.materialId) || 0;
      if (owned < req.quantity) {
        missing.push({
          materialId: req.materialId,
          required: req.quantity,
          owned,
        });
      }
    }

    if (missing.length > 0) {
      res.status(402).json({
        error: 'Insufficient materials',
        missing,
      });
      return;
    }

    // Begin transaction
    let createdCharacter: { id: number; serialNumber: string; charId: string; ownerId: number; acquisitionMethod: string; createdAt: Date | null } | undefined;
    await db.transaction(async (tx) => {
      // Deduct materials
      for (const req of requirements) {
        await tx
          .update(materialInventory)
          .set({
            quantity: sql`${materialInventory.quantity} - ${req.quantity}`,
            updatedAt: new Date(),
          })
          .where(and(eq(materialInventory.viewerId, viewer.id), eq(materialInventory.materialId, req.materialId)));
      }

      // Generate serial number and create character
      const result = await tx.execute(sql`SELECT generate_serial(${recipeData.charId}) as serial`);
      const serialNumber = (result as any)[0]?.serial;

      if (!serialNumber) {
        throw new Error('Failed to generate serial number');
      }

      const char = await tx
        .insert(characterInstances)
        .values({
          serialNumber,
          charId: recipeData.charId,
          ownerId: viewer.id,
          acquisitionMethod: 'craft',
        })
        .returning();

      createdCharacter = char[0];
    });

    if (!createdCharacter) {
      throw new Error('Failed to create character');
    }

    // Get character details
    const charDef = CHARACTERS.find((c) => c.id === createdCharacter!.charId)!;

    res.json({
      success: true,
      character: {
        serialNumber: createdCharacter.serialNumber,
        charId: createdCharacter.charId,
        name: charDef.name,
        rarity: charDef.rarity,
        acquisitionMethod: 'craft',
        createdAt: createdCharacter.createdAt,
      },
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
export async function inventoryHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.viewer) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const viewerId = req.viewer.user_id;
    let viewer = await getOrCreateViewer(viewerId);

    // Get materials
    const materials = await db
      .select({
        materialId: materialInventory.materialId,
        quantity: materialInventory.quantity,
        name: materialDefinitions.name,
        rarity: materialDefinitions.rarity,
      })
      .from(materialInventory)
      .innerJoin(materialDefinitions, eq(materialInventory.materialId, materialDefinitions.id))
      .where(eq(materialInventory.viewerId, viewer.id));

    // Get characters
    const characters = await db
      .select({
        id: characterInstances.id,
        serialNumber: characterInstances.serialNumber,
        charId: characterInstances.charId,
        name: characterDefinitions.name,
        rarity: characterDefinitions.rarity,
        acquisitionMethod: characterInstances.acquisitionMethod,
        createdAt: characterInstances.createdAt,
      })
      .from(characterInstances)
      .innerJoin(characterDefinitions, eq(characterInstances.charId, characterDefinitions.id))
      .where(eq(characterInstances.ownerId, viewer.id));

    res.json({
      viewer: {
        twitchId: viewer.twitchId,
        username: viewer.twitchUsername || 'Viewer',
        dustBalance: viewer.dustBalance,
        pityCounter: viewer.pityCounter,
      },
      materials,
      characters,
    });
  } catch (error) {
    console.error('Inventory handler error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

/**
 * GET /api/recipes
 * Get all available recipes with craftability status
 */
export async function recipesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.viewer) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const viewerId = req.viewer.user_id;
    let viewer = await getOrCreateViewer(viewerId);

    // Get all recipes
    const allRecipes = await db.select().from(recipes);

    // Get viewer's materials
    const viewerMaterials = await db
      .select()
      .from(materialInventory)
      .where(eq(materialInventory.viewerId, viewer.id));

    const materialMap = new Map(viewerMaterials.map((m) => [m.materialId, m.quantity]));

    // Build response with craftability
    const recipesWithDetails = await Promise.all(
      allRecipes.map(async (recipe) => {
        const charDef = CHARACTERS.find((c) => c.id === recipe.charId)!;
        const requirements = await db.select().from(recipeMaterials).where(eq(recipeMaterials.recipeId, recipe.id));

        const materialsWithStatus = requirements.map((req) => {
          const matDef = MATERIALS.find((m) => m.id === req.materialId)!;
          const owned = materialMap.get(req.materialId) || 0;

          return {
            materialId: req.materialId,
            name: matDef.name,
            rarity: matDef.rarity,
            required: req.quantity,
            owned,
          };
        });

        const craftable = materialsWithStatus.every((m) => m.owned >= m.required);

        return {
          id: recipe.id,
          charId: recipe.charId,
          charName: charDef.name,
          charRarity: charDef.rarity,
          totalPointCost: recipe.totalPointCost,
          materials: materialsWithStatus,
          craftable,
        };
      })
    );

    res.json({
      recipes: recipesWithDetails,
    });
  } catch (error) {
    console.error('Recipes handler error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
}
