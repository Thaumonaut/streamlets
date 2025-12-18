# Data Model: Phase 1 MVP

**Feature**: Phase 1 MVP - Single-Tenant Gacha Extension
**Date**: 2025-12-18
**Database**: PostgreSQL (via Supabase)
**ORM**: Drizzle ORM

## Overview

This document defines the complete database schema for the Phase 1 MVP. The model supports:
- Viewer authentication and currency tracking
- Tiered pull system (single/5-pull/10-pull) with materials and bonus characters
- Crafting system with point-budget recipes
- Character collection with unique serial numbers
- Transaction logging for auditing

## Entity Relationship Diagram

```
┌─────────────┐
│   Viewers   │
└──────┬──────┘
       │ 1:1
       │
┌──────▼──────────────┐
│  Currency Balances  │
└─────────────────────┘

┌─────────────┐         ┌──────────────────┐
│   Viewers   │────1:N──│ Material         │
└──────┬──────┘         │   Inventory      │
       │                └──────────────────┘
       │ 1:N
       │
┌──────▼──────────────┐       ┌──────────────────┐
│   Character         │───N:1─│   Character      │
│   Instances         │       │   Definitions    │
└─────────────────────┘       └──────────────────┘

┌─────────────┐         ┌──────────────────┐
│   Viewers   │────1:N──│  Pull Results    │
└─────────────┘         │  (audit log)     │
                        └──────────────────┘

┌─────────────────┐         ┌──────────────────┐
│    Recipes      │────N:M──│    Materials     │
│                 │         │   (definitions)  │
└─────────────────┘         └──────────────────┘
       │ 1:1
       │
┌──────▼──────────────┐
│   Character         │
│   Definitions       │
└─────────────────────┘
```

## Core Entities

### 1. Viewers

**Purpose**: Twitch users interacting with the extension. Represents a single viewer across all sessions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `twitch_id` | `varchar(255)` | NOT NULL, UNIQUE | Twitch user ID from JWT (e.g., "12345678") |
| `twitch_username` | `varchar(255)` | NULL | Display name from Twitch (optional, for UI) |
| `dust_balance` | `integer` | NOT NULL, DEFAULT 250 | Current Dust currency balance |
| `last_watch_heartbeat` | `timestamp` | NULL | Last successful watch-time heartbeat |
| `created_at` | `timestamp` | DEFAULT NOW() | Account creation timestamp |
| `updated_at` | `timestamp` | DEFAULT NOW() | Last data modification |

**Indexes**:
- `idx_viewers_twitch_id` on `twitch_id` (unique lookup for auth)

**Validation Rules**:
- `dust_balance` >= 0 (enforced by application logic, no CHECK constraint for simplicity)
- `twitch_id` must match Twitch ID format (alphanumeric string)

**Initial Data**:
- First-time viewers created with 250 Dust (FR-039)

---

### 2. Material Definitions

**Purpose**: Defines available materials in the system. Hardcoded for Phase 1 MVP, seeded from `backend/src/lib/recipes.ts`.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `varchar(50)` | PRIMARY KEY | Material identifier (e.g., "FLUFF", "ESSENCE") |
| `name` | `varchar(100)` | NOT NULL | Display name (e.g., "Fluff", "Cosmic Dust") |
| `rarity` | `varchar(20)` | NOT NULL | Rarity tier: "common", "uncommon", "rare", "legendary" |
| `point_value` | `integer` | NOT NULL | Points for recipe budgets: 1, 5, 25, 100 |
| `description` | `text` | NULL | Flavor text (optional for MVP) |
| `icon_url` | `varchar(500)` | NULL | Asset URL (placeholder acceptable for MVP) |

**Indexes**:
- `idx_materials_rarity` on `rarity` (for pull distribution queries)

**Validation Rules**:
- `rarity` IN ('common', 'uncommon', 'rare', 'legendary')
- `point_value` IN (1, 5, 25, 100) matching rarity tiers

**Sample Data** (from research.md):
```sql
INSERT INTO material_definitions (id, name, rarity, point_value) VALUES
  ('FLUFF', 'Fluff', 'common', 1),
  ('DUST', 'Cosmic Dust', 'common', 1),
  ('SPARK', 'Spark', 'uncommon', 5),
  ('ESSENCE', 'Essence', 'rare', 25),
  ('CORE', 'Prism Core', 'legendary', 100);
```

---

### 3. Material Inventory

**Purpose**: Tracks quantities of materials owned by each viewer.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `viewer_id` | `integer` | NOT NULL, FOREIGN KEY → `viewers.id` | Owner of materials |
| `material_id` | `varchar(50)` | NOT NULL, FOREIGN KEY → `material_definitions.id` | Material type |
| `quantity` | `integer` | NOT NULL, DEFAULT 0 | Number owned |
| `updated_at` | `timestamp` | DEFAULT NOW() | Last modification |

**Indexes**:
- `idx_inventory_viewer` on `viewer_id` (fast viewer inventory queries)
- `unique_viewer_material` on (`viewer_id`, `material_id`) (prevent duplicate rows)

**Validation Rules**:
- `quantity` >= 0 (materials consumed by crafting, never negative)
- Unique constraint ensures one row per (viewer, material) pair

**Behavior**:
- New materials: INSERT with initial quantity
- Additional materials: UPDATE existing row, increment quantity
- Crafting consumption: UPDATE existing row, decrement quantity (atomic)

---

### 4. Character Definitions

**Purpose**: Templates for character types that can be crafted or obtained from pulls.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `varchar(50)` | PRIMARY KEY | Character identifier (e.g., "GPUFF", "COWL") |
| `name` | `varchar(100)` | NOT NULL | Display name (e.g., "Golden Puff", "Cosmic Owl") |
| `rarity` | `varchar(20)` | NOT NULL | Character rarity: "common", "rare", "epic", "legendary" |
| `description` | `text` | NULL | Flavor text |
| `artwork_url` | `varchar(500)` | NULL | Asset URL (placeholder acceptable for MVP) |
| `season` | `integer` | NOT NULL, DEFAULT 1 | Season number (always 1 for MVP) |
| `created_at` | `timestamp` | DEFAULT NOW() | When character added to system |

**Indexes**:
- `idx_characters_rarity` on `rarity` (for bonus drop distribution)

**Validation Rules**:
- `rarity` IN ('common', 'rare', 'epic', 'legendary')
- `season` = 1 for MVP (multi-season deferred to Phase 3)

**Sample Data**:
```sql
INSERT INTO character_definitions (id, name, rarity, season) VALUES
  ('GPUFF', 'Golden Puff', 'common', 1),
  ('CBIRD', 'Cloud Bird', 'common', 1),
  ('STARF', 'Starfish', 'common', 1),
  ('COWL', 'Cosmic Owl', 'rare', 1),
  ('PHOENIX', 'Phoenix', 'rare', 1);

-- Create sequence for each character (serial number generation)
CREATE SEQUENCE char_gpuff_seq START 1;
CREATE SEQUENCE char_cbird_seq START 1;
CREATE SEQUENCE char_starf_seq START 1;
CREATE SEQUENCE char_cowl_seq START 1;
CREATE SEQUENCE char_phoenix_seq START 1;
```

---

### 5. Character Instances

**Purpose**: Individual owned copies of characters with unique serial numbers.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `serial_number` | `varchar(50)` | NOT NULL, UNIQUE | Globally unique serial (e.g., "S1-GPUFF-00047") |
| `char_id` | `varchar(50)` | NOT NULL, FOREIGN KEY → `character_definitions.id` | Character type |
| `owner_id` | `integer` | NOT NULL, FOREIGN KEY → `viewers.id` | Current owner |
| `acquisition_method` | `varchar(20)` | NOT NULL | How obtained: "pull" or "craft" |
| `created_at` | `timestamp` | DEFAULT NOW() | When obtained |

**Indexes**:
- `idx_instances_owner` on `owner_id` (viewer collection queries)
- `idx_instances_serial` on `serial_number` (verification lookups)
- `idx_instances_char` on `char_id` (character supply queries)

**Validation Rules**:
- `serial_number` format: `S1-{CHAR_ID}-{5-digit-number}` (enforced by generation function)
- `acquisition_method` IN ('pull', 'craft')

**Serial Number Generation**:
```sql
-- Function to generate next serial for a character
CREATE OR REPLACE FUNCTION generate_serial(p_char_id VARCHAR) RETURNS VARCHAR AS $$
DECLARE
  serial_num INTEGER;
BEGIN
  -- Get next sequence value (sequence name: char_{lowercase_char_id}_seq)
  EXECUTE format('SELECT nextval(%L)', 'char_' || lower(p_char_id) || '_seq') INTO serial_num;

  -- Format: S1-CHARDEF-00047 (zero-padded to 5 digits)
  RETURN 'S1-' || p_char_id || '-' || LPAD(serial_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

**Usage**:
```sql
-- Craft a character
INSERT INTO character_instances (serial_number, char_id, owner_id, acquisition_method)
VALUES (generate_serial('GPUFF'), 'GPUFF', 42, 'craft');
```

---

### 6. Recipes

**Purpose**: Defines crafting recipes (materials required to create a character).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `varchar(50)` | PRIMARY KEY | Recipe identifier (e.g., "RECIPE_GPUFF") |
| `char_id` | `varchar(50)` | NOT NULL, UNIQUE, FOREIGN KEY → `character_definitions.id` | Character produced |
| `total_point_cost` | `integer` | NOT NULL | Sum of material points (for validation) |
| `created_at` | `timestamp` | DEFAULT NOW() | When recipe added |

**Indexes**:
- `idx_recipes_char` on `char_id` (lookup recipe by character)

**Validation Rules**:
- `total_point_cost` must match sum of `recipe_materials.quantity * material_definitions.point_value`
- One recipe per character (1:1 relationship for MVP)

**Sample Data**:
```sql
INSERT INTO recipes (id, char_id, total_point_cost) VALUES
  ('RECIPE_GPUFF', 'GPUFF', 100),
  ('RECIPE_COWL', 'COWL', 500);
```

---

### 7. Recipe Materials (Junction Table)

**Purpose**: Defines material requirements for each recipe.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `recipe_id` | `varchar(50)` | NOT NULL, FOREIGN KEY → `recipes.id` | Recipe |
| `material_id` | `varchar(50)` | NOT NULL, FOREIGN KEY → `material_definitions.id` | Required material |
| `quantity` | `integer` | NOT NULL | How many needed |

**Indexes**:
- `idx_recipe_materials_recipe` on `recipe_id` (load all materials for a recipe)
- `unique_recipe_material` on (`recipe_id`, `material_id`) (prevent duplicates)

**Validation Rules**:
- `quantity` > 0

**Sample Data**:
```sql
-- Golden Puff recipe (100 points total)
INSERT INTO recipe_materials (recipe_id, material_id, quantity) VALUES
  ('RECIPE_GPUFF', 'FLUFF', 50),  -- 50 * 1 = 50 points
  ('RECIPE_GPUFF', 'DUST', 40),   -- 40 * 1 = 40 points
  ('RECIPE_GPUFF', 'SPARK', 2);   -- 2 * 5 = 10 points
```

---

### 8. Pull Results (Audit Log)

**Purpose**: Transaction log for all pulls. Enables auditing and analytics.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `viewer_id` | `integer` | NOT NULL, FOREIGN KEY → `viewers.id` | Who pulled |
| `tier` | `varchar(10)` | NOT NULL | Pull type: "single", "5", "10" |
| `dust_cost` | `integer` | NOT NULL | Currency deducted (50, 225, 400) |
| `materials_received` | `jsonb` | NOT NULL | Array of {material_id, quantity, rarity} |
| `characters_received` | `jsonb` | NULL | Array of {char_id, serial_number} (if bonus drops) |
| `created_at` | `timestamp` | DEFAULT NOW() | Pull timestamp |

**Indexes**:
- `idx_pull_results_viewer` on `viewer_id` (viewer pull history)
- `idx_pull_results_created` on `created_at` (analytics queries)

**Validation Rules**:
- `tier` IN ('single', '5', '10')
- `dust_cost` matches tier (50/225/400)

**Sample Data**:
```json
{
  "materials_received": [
    {"material_id": "FLUFF", "quantity": 2, "rarity": "common"},
    {"material_id": "SPARK", "quantity": 1, "rarity": "uncommon"}
  ],
  "characters_received": [
    {"char_id": "GPUFF", "serial_number": "S1-GPUFF-00047"}
  ]
}
```

**Usage**: Analytics can aggregate rarity distribution, bonus drop rates, and currency economy over time.

---

## Queries

### Common Operations

#### 1. Get Viewer's Complete State (for /api/inventory)
```sql
-- Viewer info + currency
SELECT id, twitch_id, twitch_username, dust_balance
FROM viewers
WHERE twitch_id = $1;

-- Material inventory
SELECT mi.material_id, md.name, md.rarity, mi.quantity
FROM material_inventory mi
JOIN material_definitions md ON mi.material_id = md.id
WHERE mi.viewer_id = $2
ORDER BY md.rarity DESC, md.name ASC;

-- Character collection
SELECT ci.serial_number, ci.char_id, cd.name, cd.rarity, ci.acquisition_method, ci.created_at
FROM character_instances ci
JOIN character_definitions cd ON ci.char_id = cd.id
WHERE ci.owner_id = $2
ORDER BY cd.rarity DESC, ci.created_at DESC;
```

#### 2. Check Craftability (for /api/recipes)
```sql
-- Get recipe with material requirements
SELECT r.id, r.char_id, cd.name, cd.rarity,
       rm.material_id, md.name AS material_name, rm.quantity AS required,
       COALESCE(mi.quantity, 0) AS owned
FROM recipes r
JOIN character_definitions cd ON r.char_id = cd.id
JOIN recipe_materials rm ON r.id = rm.recipe_id
JOIN material_definitions md ON rm.material_id = md.id
LEFT JOIN material_inventory mi ON mi.material_id = rm.material_id AND mi.viewer_id = $1
WHERE r.id = $2;

-- Craftable if ALL materials have owned >= required
```

#### 3. Execute Pull (Transaction)
```sql
BEGIN;

-- 1. Deduct currency
UPDATE viewers
SET dust_balance = dust_balance - $2, updated_at = NOW()
WHERE id = $1 AND dust_balance >= $2;

-- 2. Add materials to inventory (batch upsert)
INSERT INTO material_inventory (viewer_id, material_id, quantity)
VALUES ($1, 'FLUFF', 3), ($1, 'SPARK', 1)
ON CONFLICT (viewer_id, material_id)
DO UPDATE SET quantity = material_inventory.quantity + EXCLUDED.quantity,
              updated_at = NOW();

-- 3. Add bonus characters (if any)
INSERT INTO character_instances (serial_number, char_id, owner_id, acquisition_method)
VALUES (generate_serial('GPUFF'), 'GPUFF', $1, 'pull');

-- 4. Log pull result
INSERT INTO pull_results (viewer_id, tier, dust_cost, materials_received, characters_received)
VALUES ($1, '5', 225, '[...]'::jsonb, '[...]'::jsonb);

COMMIT;
```

#### 4. Craft Character (Transaction)
```sql
BEGIN;

-- 1. Deduct materials (one UPDATE per material type)
UPDATE material_inventory
SET quantity = quantity - $3, updated_at = NOW()
WHERE viewer_id = $1 AND material_id = $2 AND quantity >= $3;

-- 2. Create character instance
INSERT INTO character_instances (serial_number, char_id, owner_id, acquisition_method)
VALUES (generate_serial($4), $4, $1, 'craft');

COMMIT;
```

---

## Migration Strategy

### Initial Schema Migration
```sql
-- 001_create_core_tables.sql
CREATE TABLE viewers (
  id SERIAL PRIMARY KEY,
  twitch_id VARCHAR(255) NOT NULL UNIQUE,
  twitch_username VARCHAR(255),
  dust_balance INTEGER NOT NULL DEFAULT 250,
  last_watch_heartbeat TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_viewers_twitch_id ON viewers(twitch_id);

-- (repeat for all tables above)
```

### Seed Data
```sql
-- 002_seed_materials_and_characters.sql
-- Insert material definitions
-- Insert character definitions
-- Create sequences for serial numbers
```

---

## Drizzle ORM Schema Definition

```typescript
// backend/src/db/schema.ts
import { pgTable, serial, integer, varchar, timestamp, text, jsonb, unique } from 'drizzle-orm/pg-core';

export const viewers = pgTable('viewers', {
  id: serial('id').primaryKey(),
  twitchId: varchar('twitch_id', { length: 255 }).notNull().unique(),
  twitchUsername: varchar('twitch_username', { length: 255 }),
  dustBalance: integer('dust_balance').notNull().default(250),
  lastWatchHeartbeat: timestamp('last_watch_heartbeat'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const materialDefinitions = pgTable('material_definitions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(),
  pointValue: integer('point_value').notNull(),
  description: text('description'),
  iconUrl: varchar('icon_url', { length: 500 }),
});

export const materialInventory = pgTable('material_inventory', {
  id: serial('id').primaryKey(),
  viewerId: integer('viewer_id').notNull().references(() => viewers.id),
  materialId: varchar('material_id', { length: 50 }).notNull().references(() => materialDefinitions.id),
  quantity: integer('quantity').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueViewerMaterial: unique().on(table.viewerId, table.materialId),
}));

// (define remaining tables similarly)
```

---

## Future Considerations (Phase 3+)

### Multi-Tenant Migration
- Add `streamer_id` to materials, recipes, characters
- Scope all queries by `streamer_id`
- Migrate sequences to include streamer prefix: `char_{streamer_id}_{char_id}_seq`

### Character Leveling
- Add `level` (1-5) to `character_instances`
- Add `experience_points` for duplicate conversion

### Trading System
- Add `character_transfers` table for trade history
- Update `owner_id` on transfer with audit log

---

## Summary

This data model supports all Phase 1 MVP requirements (FR-001 through FR-046) with:
- ✅ Persistent viewer data (FR-036, FR-037)
- ✅ Currency tracking and transactions (FR-001, FR-004, FR-005)
- ✅ Tiered pull system (FR-006, FR-007)
- ✅ Material rarity distribution (FR-008, FR-015)
- ✅ Bonus character drops (FR-009, FR-010)
- ✅ Crafting with atomic consumption (FR-021, FR-022)
- ✅ Unique serial numbers (FR-026)
- ✅ Transaction audit logging (pull_results table)

**Schema is ready for Drizzle migration generation**.
