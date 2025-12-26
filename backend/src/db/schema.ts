/**
 * Database schema for Streamlets Phase 1 MVP
 * Using Drizzle ORM with PostgreSQL
 */

import { pgTable, serial, integer, varchar, timestamp, text, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// =============================================================================
// Viewers Table
// =============================================================================
export const viewers = pgTable('viewers', {
  id: serial('id').primaryKey(),
  twitchId: varchar('twitch_id', { length: 255 }).notNull().unique(),
  twitchUsername: varchar('twitch_username', { length: 255 }),
  dustBalance: integer('dust_balance').notNull().default(250),
  lastWatchHeartbeat: timestamp('last_watch_heartbeat'),
  pityCounter: integer('pity_counter').notNull().default(0), // Pulls since last legendary (resets at 90)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  twitchIdIdx: index('idx_viewers_twitch_id').on(table.twitchId),
}));

// =============================================================================
// Material Definitions Table
// =============================================================================
export const materialDefinitions = pgTable('material_definitions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(),
  pointValue: integer('point_value').notNull(),
  description: text('description'),
  iconUrl: varchar('icon_url', { length: 500 }),
}, (table) => ({
  rarityIdx: index('idx_materials_rarity').on(table.rarity),
}));

// =============================================================================
// Material Inventory Table
// =============================================================================
export const materialInventory = pgTable('material_inventory', {
  id: serial('id').primaryKey(),
  viewerId: integer('viewer_id').notNull().references(() => viewers.id),
  materialId: varchar('material_id', { length: 50 }).notNull().references(() => materialDefinitions.id),
  quantity: integer('quantity').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  viewerIdx: index('idx_inventory_viewer').on(table.viewerId),
  uniqueViewerMaterial: unique('unique_viewer_material').on(table.viewerId, table.materialId),
}));

// =============================================================================
// Character Definitions Table
// =============================================================================
export const characterDefinitions = pgTable('character_definitions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(),
  description: text('description'),
  artworkUrl: varchar('artwork_url', { length: 500 }),
  season: integer('season').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  rarityIdx: index('idx_characters_rarity').on(table.rarity),
}));

// =============================================================================
// Character Instances Table
// =============================================================================
export const characterInstances = pgTable('character_instances', {
  id: serial('id').primaryKey(),
  serialNumber: varchar('serial_number', { length: 50 }).notNull().unique(),
  charId: varchar('char_id', { length: 50 }).notNull().references(() => characterDefinitions.id),
  ownerId: integer('owner_id').notNull().references(() => viewers.id),
  acquisitionMethod: varchar('acquisition_method', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  ownerIdx: index('idx_instances_owner').on(table.ownerId),
  serialIdx: index('idx_instances_serial').on(table.serialNumber),
  charIdx: index('idx_instances_char').on(table.charId),
}));

// =============================================================================
// Recipes Table
// =============================================================================
export const recipes = pgTable('recipes', {
  id: varchar('id', { length: 50 }).primaryKey(),
  charId: varchar('char_id', { length: 50 }).notNull().unique().references(() => characterDefinitions.id),
  totalPointCost: integer('total_point_cost').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  charIdx: index('idx_recipes_char').on(table.charId),
}));

// =============================================================================
// Recipe Materials Junction Table
// =============================================================================
export const recipeMaterials = pgTable('recipe_materials', {
  id: serial('id').primaryKey(),
  recipeId: varchar('recipe_id', { length: 50 }).notNull().references(() => recipes.id),
  materialId: varchar('material_id', { length: 50 }).notNull().references(() => materialDefinitions.id),
  quantity: integer('quantity').notNull(),
}, (table) => ({
  recipeIdx: index('idx_recipe_materials_recipe').on(table.recipeId),
  uniqueRecipeMaterial: unique('unique_recipe_material').on(table.recipeId, table.materialId),
}));

// =============================================================================
// Pull Results Audit Log Table
// =============================================================================
export const pullResults = pgTable('pull_results', {
  id: serial('id').primaryKey(),
  viewerId: integer('viewer_id').notNull().references(() => viewers.id),
  tier: varchar('tier', { length: 10 }).notNull(),
  dustCost: integer('dust_cost').notNull(),
  materialsReceived: jsonb('materials_received').notNull(),
  charactersReceived: jsonb('characters_received'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  viewerIdx: index('idx_pull_results_viewer').on(table.viewerId),
  createdIdx: index('idx_pull_results_created').on(table.createdAt),
}));

// =============================================================================
// Type exports for Drizzle ORM queries
// =============================================================================
export type Viewer = typeof viewers.$inferSelect;
export type NewViewer = typeof viewers.$inferInsert;

export type MaterialDefinition = typeof materialDefinitions.$inferSelect;
export type NewMaterialDefinition = typeof materialDefinitions.$inferInsert;

export type MaterialInventoryItem = typeof materialInventory.$inferSelect;
export type NewMaterialInventoryItem = typeof materialInventory.$inferInsert;

export type CharacterDefinition = typeof characterDefinitions.$inferSelect;
export type NewCharacterDefinition = typeof characterDefinitions.$inferInsert;

export type CharacterInstance = typeof characterInstances.$inferSelect;
export type NewCharacterInstance = typeof characterInstances.$inferInsert;

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export type RecipeMaterial = typeof recipeMaterials.$inferSelect;
export type NewRecipeMaterial = typeof recipeMaterials.$inferInsert;

export type PullResult = typeof pullResults.$inferSelect;
export type NewPullResult = typeof pullResults.$inferInsert;
