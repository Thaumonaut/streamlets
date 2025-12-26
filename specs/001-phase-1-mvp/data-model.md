# Data Model: Phase 1 MVP

**Feature**: Phase 1 MVP - Single-Tenant Gacha Extension
**Date**: 2025-12-19 (Updated from 2025-12-18)
**Database**: PostgreSQL (via Supabase)
**ORM**: Drizzle ORM

## Overview

This document defines the complete database schema for the Phase 1 MVP. The model supports:
- Viewer authentication and currency tracking
- Tiered pull system (single/5-pull/10-pull) with materials and bonus characters
- **Material quality variants (Low/Normal/High 0.5x/1.0x/2.0x)** *(2025-12-19)*
- Crafting system with point-budget recipes
- Character collection with unique serial numbers and **deterministic trait generation** *(2025-12-19)*
- **Quest system with 4-state lifecycle and party formation** *(2025-12-19)*
- **Encounter system with collaborative attacks and MVP rewards** *(2025-12-19)*
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
│  (dust_balance)     │
└─────────────────────┘

┌─────────────┐         ┌──────────────────────┐
│   Viewers   │────1:N──│ Material Inventory   │
└──────┬──────┘         │ (quality-separated)  │
       │                └──────────────────────┘
       │ 1:N
       │
┌──────▼──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Character         │───N:1─│   Character      │───N:M─│     Trait        │
│   Instances         │       │   Definitions    │       │   Definitions    │
│   (with traits)     │       └──────────────────┘       └──────────────────┘
└─────────────────────┘

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

┌──────────────┐         ┌──────────────────┐         ┌─────────────┐
│ Quest Zones  │────1:N──│     Quests       │───N:M───│   Viewers   │
│              │         │ (4-state model)  │         │             │
└──────────────┘         └──────────────────┘         └─────────────┘
                                  │
                                  │ via
                                  │
                         ┌────────▼─────────────┐
                         │ Quest Participants   │
                         └──────────────────────┘

┌──────────────┐         ┌──────────────────────┐         ┌─────────────┐
│ Encounters   │────N:M──│     Viewers          │         │ Characters  │
│ (4-state)    │         │                      │         │ (deployed)  │
└──────────────┘         └──────────────────────┘         └─────────────┘
       │                          │
       │ via                      │
       │                          │
       └────────┬─────────────────┘
                │
       ┌────────▼──────────────────┐
       │ Encounter Participants    │
       │ (attack tracking)         │
       └───────────────────────────┘
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

**Purpose**: Tracks quantities of materials owned by each viewer. **Separate rows per quality tier** for granular tracking with consolidated UI presentation *(2025-12-19)*.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `viewer_id` | `integer` | NOT NULL, FOREIGN KEY → `viewers.id` | Owner of materials |
| `material_id` | `varchar(50)` | NOT NULL, FOREIGN KEY → `material_definitions.id` | Material type |
| `quality` | `varchar(10)` | NOT NULL | Quality tier: 'low', 'normal', 'high' |
| `quantity` | `integer` | NOT NULL, DEFAULT 0 | Number owned |
| `updated_at` | `timestamp` | DEFAULT NOW() | Last modification |

**Indexes**:
- `idx_inventory_viewer` on `viewer_id` (fast viewer inventory queries)
- `unique_viewer_material_quality` on (`viewer_id`, `material_id`, `quality`) (prevent duplicate stacks)

**Validation Rules**:
- `quantity` >= 0 (materials consumed by crafting, never negative)
- `quality` IN ('low', 'normal', 'high')
- Unique constraint ensures one row per (viewer, material, quality) triplet

**Quality Multipliers** (from research.md Section 9):
- `low`: 0.5x point value (e.g., 1 Low Fluff = 0.5 points)
- `normal`: 1.0x point value (e.g., 1 Normal Fluff = 1 point)
- `high`: 2.0x point value (e.g., 1 High Fluff = 2 points)

**UI Presentation** (FR-074):
- Display consolidated view showing total point value per material
- On hover/click, reveal breakdown: "Fluff (105 pts): 10 Low, 50 Normal, 20 High"

**Behavior**:
- New materials: INSERT with initial quantity and quality
- Additional materials: UPDATE existing row for matching quality, increment quantity
- Crafting consumption: Consume highest-quality materials first (greedy algorithm)

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

**Purpose**: Individual owned copies of characters with unique serial numbers and **procedurally-generated traits** *(2025-12-19)*.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `serial_number` | `varchar(50)` | NOT NULL, UNIQUE | Globally unique serial (e.g., "S1-GPUFF-00047") |
| `char_id` | `varchar(50)` | NOT NULL, FOREIGN KEY → `character_definitions.id` | Character type |
| `owner_id` | `integer` | NOT NULL, FOREIGN KEY → `viewers.id` | Current owner |
| `acquisition_method` | `varchar(20)` | NOT NULL | How obtained: "pull" or "craft" |
| `trait_seed` | `varchar(100)` | NOT NULL | Deterministic seed for trait generation (reproducible) |
| `traits` | `jsonb` | NOT NULL | Array of trait IDs: `["SCAVENGER", "LUCKY_CHARM"]` |
| `created_at` | `timestamp` | DEFAULT NOW() | When obtained |

**Indexes**:
- `idx_instances_owner` on `owner_id` (viewer collection queries)
- `idx_instances_serial` on `serial_number` (verification lookups)
- `idx_instances_char` on `char_id` (character supply queries)

**Validation Rules**:
- `serial_number` format: `S1-{CHAR_ID}-{5-digit-number}` (enforced by generation function)
- `acquisition_method` IN ('pull', 'craft')
- `traits` must be array with 1-3 trait IDs (based on character rarity)

**Trait Generation** (FR-083, research.md Section 10):
- Seed format: `${characterId}-${timestamp}-${uuid}` for uniqueness
- Stored in `trait_seed` column for debugging and reproducibility
- Rarity-based trait count: Common (1), Rare (2), Epic (2), Legendary (3)

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

### 9. Trait Definitions

**Purpose**: Defines the pool of procedural traits that can be assigned to characters *(2025-12-19)*. Traits are cosmetic flavor text with no gameplay impact.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `varchar(50)` | PRIMARY KEY | Trait identifier (e.g., "SCAVENGER", "LUCKY_CHARM") |
| `name` | `varchar(100)` | NOT NULL | Display name (e.g., "Scavenger", "Lucky Charm") |
| `description` | `text` | NOT NULL | Flavor text (e.g., "Always finds the best loot") |
| `icon_url` | `varchar(500)` | NULL | Optional icon asset |

**Indexes**:
- None (small reference table, < 50 rows expected)

**Sample Data**:
```sql
INSERT INTO trait_definitions (id, name, description) VALUES
  ('SCAVENGER', 'Scavenger', 'Has a knack for finding extra materials'),
  ('LUCKY_CHARM', 'Lucky Charm', 'Brings good fortune to their team'),
  ('BRAVE', 'Brave', 'Never backs down from a challenge'),
  ('STRATEGIST', 'Strategist', 'Always has a plan'),
  ('NIGHT_OWL', 'Night Owl', 'Most active during late hours');
```

**Usage**:
- Referenced by `character_instances.traits` (jsonb array of trait IDs)
- Traits selected randomly during character creation using deterministic seed

---

### 10. Quest Zones

**Purpose**: System-managed zones where quests spawn. Fixed list for MVP *(2025-12-19)*.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `varchar(50)` | PRIMARY KEY | Zone identifier (e.g., "FOREST", "CAVE") |
| `name` | `varchar(100)` | NOT NULL | Display name (e.g., "Enchanted Forest") |
| `description` | `text` | NULL | Flavor text |
| `icon_url` | `varchar(500)` | NULL | Zone artwork |

**Sample Data**:
```sql
INSERT INTO quest_zones (id, name, description) VALUES
  ('FOREST', 'Enchanted Forest', 'A mystical woodland filled with ancient trees'),
  ('CAVE', 'Crystal Caverns', 'Deep underground tunnels with glowing crystals'),
  ('MOUNTAIN', 'Misty Peaks', 'Towering mountains shrouded in clouds');
```

---

### 11. Quests

**Purpose**: Tracks active and completed quests with 4-state lifecycle *(2025-12-19)*.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `zone_id` | `varchar(50)` | NOT NULL, FOREIGN KEY → `quest_zones.id` | Quest location |
| `tier` | `varchar(10)` | NOT NULL | Quest tier: 'short', 'medium', 'long' |
| `state` | `quest_state` | NOT NULL | Lifecycle state (PostgreSQL ENUM) |
| `leader_id` | `integer` | NOT NULL, FOREIGN KEY → `viewers.id` | Quest creator |
| `party_size` | `integer` | NOT NULL, DEFAULT 1 | Current participant count |
| `max_party_size` | `integer` | NOT NULL | Maximum participants (1-5 based on tier) |
| `pending_duration_sec` | `integer` | NOT NULL | PENDING phase timer (30/60/90 by tier) |
| `active_duration_sec` | `integer` | NOT NULL | ACTIVE phase timer (300/1200/2700 by tier) |
| `pending_expires_at` | `timestamp` | NULL | When PENDING phase ends (NULL if force-started) |
| `active_expires_at` | `timestamp` | NULL | When quest auto-fails if incomplete |
| `success_rate` | `integer` | NOT NULL | Base success probability (50-80% by tier) |
| `created_at` | `timestamp` | DEFAULT NOW() | Quest creation time |
| `started_at` | `timestamp` | NULL | When transitioned to ACTIVE |
| `completed_at` | `timestamp` | NULL | When transitioned to SUCCESS/FAILED |
| `claimed_at` | `timestamp` | NULL | When rewards auto-claimed |

**Custom Type**:
```sql
CREATE TYPE quest_state AS ENUM ('PENDING', 'ACTIVE', 'SUCCESS', 'FAILED', 'CLAIMED');
```

**Indexes**:
- `idx_quests_state` on `state` (find active/pending quests)
- `idx_quests_leader` on `leader_id` (viewer quest history)
- `idx_quests_zone` on `zone_id` (zone-specific queries)

**Validation Rules**:
- `tier` IN ('short', 'medium', 'long')
- `party_size` <= `max_party_size`
- State transitions must follow: PENDING → ACTIVE → (SUCCESS | FAILED) → CLAIMED

**Tier Configuration** (FR-056b):
| Tier | PENDING | ACTIVE | Max Party | Success Rate |
|------|---------|--------|-----------|--------------|
| short | 30s | 5min | 2 | 50% |
| medium | 60s | 20min | 3 | 65% |
| long | 90s | 45min | 5 | 80% |

---

### 12. Quest Participants

**Purpose**: Junction table tracking which viewers joined which quests *(2025-12-19)*.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `quest_id` | `integer` | NOT NULL, FOREIGN KEY → `quests.id` | Quest reference |
| `viewer_id` | `integer` | NOT NULL, FOREIGN KEY → `viewers.id` | Participant |
| `character_id` | `integer` | NOT NULL, FOREIGN KEY → `character_instances.id` | Deployed character |
| `joined_at` | `timestamp` | DEFAULT NOW() | When joined party |

**Indexes**:
- `idx_quest_participants_quest` on `quest_id` (list party members)
- `idx_quest_participants_viewer` on `viewer_id` (viewer's active quests)
- `unique_quest_viewer` on (`quest_id`, `viewer_id`) (prevent double-join)

**Validation Rules**:
- Cannot join if quest state is ACTIVE, SUCCESS, FAILED, or CLAIMED
- Character cannot be deployed to multiple active quests simultaneously

---

### 13. Encounters

**Purpose**: Collaborative boss fights with health tracking and 4-state lifecycle *(2025-12-19)*.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `boss_id` | `varchar(50)` | NOT NULL | Boss identifier (e.g., "DRAGON_01") |
| `state` | `encounter_state` | NOT NULL | Lifecycle state (PostgreSQL ENUM) |
| `max_hp` | `integer` | NOT NULL | Starting health points |
| `current_hp` | `integer` | NOT NULL | Remaining health points |
| `participant_count` | `integer` | NOT NULL, DEFAULT 0 | Number of attackers |
| `expires_at` | `timestamp` | NOT NULL | When encounter auto-fails |
| `created_at` | `timestamp` | DEFAULT NOW() | Encounter spawn time |
| `completed_at` | `timestamp` | NULL | When defeated or timed out |
| `claimed_at` | `timestamp` | NULL | When rewards auto-claimed |

**Custom Type**:
```sql
CREATE TYPE encounter_state AS ENUM ('PENDING', 'ACTIVE', 'SUCCESS', 'FAILED', 'CLAIMED');
```

**Indexes**:
- `idx_encounters_state` on `state` (find active encounters)
- `idx_encounters_created` on `created_at` (recent encounters)

**Validation Rules**:
- `current_hp` >= 0
- State transitions: PENDING → ACTIVE → (SUCCESS | FAILED) → CLAIMED
- SUCCESS when `current_hp` reaches 0
- FAILED when `expires_at` timestamp passes

**Boss Scaling** (FR-067):
- HP scales with expected participant count
- Attack damage scales with character rarity and traits

---

### 14. Encounter Participants

**Purpose**: Tracks attack contributions and determines MVP rewards *(2025-12-19)*.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY | Internal auto-increment ID |
| `encounter_id` | `integer` | NOT NULL, FOREIGN KEY → `encounters.id` | Encounter reference |
| `viewer_id` | `integer` | NOT NULL, FOREIGN KEY → `viewers.id` | Attacker |
| `character_id` | `integer` | NOT NULL, FOREIGN KEY → `character_instances.id` | Deployed character |
| `total_damage` | `integer` | NOT NULL, DEFAULT 0 | Cumulative damage dealt |
| `attack_count` | `integer` | NOT NULL, DEFAULT 0 | Number of attacks performed |
| `joined_at` | `timestamp` | DEFAULT NOW() | First attack timestamp |

**Indexes**:
- `idx_encounter_participants_encounter` on `encounter_id` (list attackers)
- `idx_encounter_participants_damage` on (`encounter_id`, `total_damage` DESC) (MVP ranking)
- `unique_encounter_viewer` on (`encounter_id`, `viewer_id`) (prevent duplicate entries)

**Validation Rules**:
- `total_damage` >= 0
- Character cannot be deployed to multiple active encounters simultaneously

**MVP Calculation** (FR-068):
- Top 3 contributors by `total_damage` receive bonus rewards
- Ties broken by `attack_count`, then `joined_at` (earliest wins)

---

## Queries

### Common Operations

#### 1. Get Viewer's Complete State (for /api/inventory)
```sql
-- Viewer info + currency
SELECT id, twitch_id, twitch_username, dust_balance
FROM viewers
WHERE twitch_id = $1;

-- Material inventory (quality-separated, aggregated for UI)
SELECT
  mi.material_id,
  md.name,
  md.rarity,
  md.point_value,
  SUM(mi.quantity *
    CASE mi.quality
      WHEN 'low' THEN 0.5
      WHEN 'normal' THEN 1.0
      WHEN 'high' THEN 2.0
    END * md.point_value
  ) AS total_points,
  jsonb_object_agg(mi.quality, mi.quantity) AS quality_breakdown
FROM material_inventory mi
JOIN material_definitions md ON mi.material_id = md.id
WHERE mi.viewer_id = $2
GROUP BY mi.material_id, md.name, md.rarity, md.point_value
ORDER BY md.rarity DESC, md.name ASC;

-- Character collection (with traits)
SELECT
  ci.serial_number,
  ci.char_id,
  cd.name,
  cd.rarity,
  ci.acquisition_method,
  ci.traits,
  ci.created_at
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

-- 2. Add materials to inventory (batch upsert with quality)
INSERT INTO material_inventory (viewer_id, material_id, quality, quantity)
VALUES
  ($1, 'FLUFF', 'normal', 3),
  ($1, 'SPARK', 'high', 1),
  ($1, 'DUST', 'low', 2)
ON CONFLICT (viewer_id, material_id, quality)
DO UPDATE SET quantity = material_inventory.quantity + EXCLUDED.quantity,
              updated_at = NOW();

-- 3. Add bonus characters (if any) with trait generation
INSERT INTO character_instances (serial_number, char_id, owner_id, acquisition_method, trait_seed, traits)
VALUES (
  generate_serial('GPUFF'),
  'GPUFF',
  $1,
  'pull',
  'GPUFF-' || extract(epoch from now()) || '-' || gen_random_uuid(),
  '["SCAVENGER"]'::jsonb
);

-- 4. Log pull result
INSERT INTO pull_results (viewer_id, tier, dust_cost, materials_received, characters_received)
VALUES ($1, '5', 225, '[{"material_id":"FLUFF","quantity":3,"quality":"normal"}]'::jsonb, '[{"char_id":"GPUFF","serial_number":"S1-GPUFF-00047"}]'::jsonb);

COMMIT;
```

#### 4. Craft Character (Transaction)
```sql
BEGIN;

-- 1. Deduct materials (greedy consume highest quality first)
-- Example: Need 10 Fluff (10 points) - consume High first, then Normal, then Low
UPDATE material_inventory
SET quantity = quantity - $3, updated_at = NOW()
WHERE viewer_id = $1 AND material_id = $2 AND quality = $3 AND quantity >= $4;

-- 2. Create character instance with trait generation
INSERT INTO character_instances (serial_number, char_id, owner_id, acquisition_method, trait_seed, traits)
VALUES (
  generate_serial($5),
  $5,
  $1,
  'craft',
  $5 || '-' || extract(epoch from now()) || '-' || gen_random_uuid(),
  '["STRATEGIST", "BRAVE"]'::jsonb
);

COMMIT;
```

#### 5. Create Quest with Party Formation (Transaction)
```sql
BEGIN;

-- 1. Create quest in PENDING state
INSERT INTO quests (
  zone_id, tier, state, leader_id, party_size, max_party_size,
  pending_duration_sec, active_duration_sec,
  pending_expires_at, success_rate
) VALUES (
  'FOREST',
  'medium',
  'PENDING',
  $1, -- leader_id
  1,  -- party_size (just leader initially)
  3,  -- max_party_size for medium tier
  60, -- pending phase: 60 seconds
  1200, -- active phase: 20 minutes
  NOW() + INTERVAL '60 seconds',
  65  -- 65% success rate for medium tier
) RETURNING id;

-- 2. Add leader as first participant
INSERT INTO quest_participants (quest_id, viewer_id, character_id)
VALUES ($2, $1, $3); -- $2 = quest.id from RETURNING, $3 = character_id

COMMIT;
```

#### 6. Complete Quest and Auto-Claim Rewards (Transaction)
```sql
BEGIN;

-- 1. Determine outcome based on success_rate
-- (Application logic calculates if quest succeeded or failed)

-- 2. Update quest state to SUCCESS/FAILED
UPDATE quests
SET state = 'SUCCESS', completed_at = NOW()
WHERE id = $1;

-- 3. Distribute rewards to all participants
INSERT INTO material_inventory (viewer_id, material_id, quality, quantity)
SELECT
  qp.viewer_id,
  'ESSENCE',
  'normal',
  3 -- 3 Essence per participant for medium tier
FROM quest_participants qp
WHERE qp.quest_id = $1
ON CONFLICT (viewer_id, material_id, quality)
DO UPDATE SET quantity = material_inventory.quantity + EXCLUDED.quantity,
              updated_at = NOW();

-- 4. Mark quest as CLAIMED (auto-claim)
UPDATE quests
SET state = 'CLAIMED', claimed_at = NOW()
WHERE id = $1;

COMMIT;
```

#### 7. Attack Encounter and Update HP (Transaction)
```sql
BEGIN;

-- 1. Calculate damage based on character rarity
-- (Application logic: Common=10, Rare=20, Epic=35, Legendary=50)

-- 2. Upsert participant record
INSERT INTO encounter_participants (encounter_id, viewer_id, character_id, total_damage, attack_count)
VALUES ($1, $2, $3, $4, 1)
ON CONFLICT (encounter_id, viewer_id)
DO UPDATE SET
  total_damage = encounter_participants.total_damage + EXCLUDED.total_damage,
  attack_count = encounter_participants.attack_count + 1;

-- 3. Reduce encounter HP
UPDATE encounters
SET current_hp = GREATEST(0, current_hp - $4),
    participant_count = (SELECT COUNT(DISTINCT viewer_id) FROM encounter_participants WHERE encounter_id = $1)
WHERE id = $1;

-- 4. Check if defeated (current_hp = 0)
UPDATE encounters
SET state = 'SUCCESS', completed_at = NOW()
WHERE id = $1 AND current_hp = 0 AND state = 'ACTIVE';

COMMIT;
```

#### 8. Get Active Quests (for quest board UI)
```sql
SELECT
  q.id,
  q.zone_id,
  qz.name AS zone_name,
  q.tier,
  q.state,
  q.party_size,
  q.max_party_size,
  q.pending_expires_at,
  v.twitch_username AS leader_name,
  jsonb_agg(jsonb_build_object(
    'viewer_id', qp.viewer_id,
    'character_id', qp.character_id,
    'joined_at', qp.joined_at
  )) AS participants
FROM quests q
JOIN quest_zones qz ON q.zone_id = qz.id
JOIN viewers v ON q.leader_id = v.id
LEFT JOIN quest_participants qp ON q.id = qp.quest_id
WHERE q.state IN ('PENDING', 'ACTIVE')
GROUP BY q.id, qz.name, v.twitch_username
ORDER BY q.created_at DESC;
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
import { pgTable, pgEnum, serial, integer, varchar, timestamp, text, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

// ============================================================
// ENUMS (2025-12-19: State machines for quests/encounters)
// ============================================================
export const questStateEnum = pgEnum('quest_state', ['PENDING', 'ACTIVE', 'SUCCESS', 'FAILED', 'CLAIMED']);
export const encounterStateEnum = pgEnum('encounter_state', ['PENDING', 'ACTIVE', 'SUCCESS', 'FAILED', 'CLAIMED']);

// ============================================================
// CORE ENTITIES
// ============================================================
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

// 2025-12-19: Added quality column for material quality variants (Low/Normal/High)
export const materialInventory = pgTable('material_inventory', {
  id: serial('id').primaryKey(),
  viewerId: integer('viewer_id').notNull().references(() => viewers.id),
  materialId: varchar('material_id', { length: 50 }).notNull().references(() => materialDefinitions.id),
  quality: varchar('quality', { length: 10 }).notNull(), // 'low' | 'normal' | 'high'
  quantity: integer('quantity').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueViewerMaterialQuality: uniqueIndex('idx_inventory_stack').on(table.viewerId, table.materialId, table.quality),
}));

export const characterDefinitions = pgTable('character_definitions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(),
  description: text('description'),
  artworkUrl: varchar('artwork_url', { length: 500 }),
  season: integer('season').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2025-12-19: Added trait_seed and traits for deterministic trait generation
export const characterInstances = pgTable('character_instances', {
  id: serial('id').primaryKey(),
  serialNumber: varchar('serial_number', { length: 50 }).notNull().unique(),
  charId: varchar('char_id', { length: 50 }).notNull().references(() => characterDefinitions.id),
  ownerId: integer('owner_id').notNull().references(() => viewers.id),
  acquisitionMethod: varchar('acquisition_method', { length: 20 }).notNull(),
  traitSeed: varchar('trait_seed', { length: 100 }).notNull(), // 2025-12-19: Deterministic seed
  traits: jsonb('traits').$type<string[]>().notNull(), // 2025-12-19: Array of trait IDs
  createdAt: timestamp('created_at').defaultNow(),
});

export const recipes = pgTable('recipes', {
  id: varchar('id', { length: 50 }).primaryKey(),
  charId: varchar('char_id', { length: 50 }).notNull().unique().references(() => characterDefinitions.id),
  totalPointCost: integer('total_point_cost').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const recipeMaterials = pgTable('recipe_materials', {
  id: serial('id').primaryKey(),
  recipeId: varchar('recipe_id', { length: 50 }).notNull().references(() => recipes.id),
  materialId: varchar('material_id', { length: 50 }).notNull().references(() => materialDefinitions.id),
  quantity: integer('quantity').notNull(),
}, (table) => ({
  uniqueRecipeMaterial: uniqueIndex('idx_recipe_material').on(table.recipeId, table.materialId),
}));

export const pullResults = pgTable('pull_results', {
  id: serial('id').primaryKey(),
  viewerId: integer('viewer_id').notNull().references(() => viewers.id),
  tier: varchar('tier', { length: 10 }).notNull(),
  dustCost: integer('dust_cost').notNull(),
  materialsReceived: jsonb('materials_received').notNull(),
  charactersReceived: jsonb('characters_received'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================
// 2025-12-19: QUEST & ENCOUNTER SYSTEM
// ============================================================
export const traitDefinitions = pgTable('trait_definitions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  iconUrl: varchar('icon_url', { length: 500 }),
});

export const questZones = pgTable('quest_zones', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  iconUrl: varchar('icon_url', { length: 500 }),
});

export const quests = pgTable('quests', {
  id: serial('id').primaryKey(),
  zoneId: varchar('zone_id', { length: 50 }).notNull().references(() => questZones.id),
  tier: varchar('tier', { length: 10 }).notNull(), // 'short' | 'medium' | 'long'
  state: questStateEnum('state').notNull(),
  leaderId: integer('leader_id').notNull().references(() => viewers.id),
  partySize: integer('party_size').notNull().default(1),
  maxPartySize: integer('max_party_size').notNull(),
  pendingDurationSec: integer('pending_duration_sec').notNull(),
  activeDurationSec: integer('active_duration_sec').notNull(),
  pendingExpiresAt: timestamp('pending_expires_at'),
  activeExpiresAt: timestamp('active_expires_at'),
  successRate: integer('success_rate').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  claimedAt: timestamp('claimed_at'),
});

export const questParticipants = pgTable('quest_participants', {
  id: serial('id').primaryKey(),
  questId: integer('quest_id').notNull().references(() => quests.id),
  viewerId: integer('viewer_id').notNull().references(() => viewers.id),
  characterId: integer('character_id').notNull().references(() => characterInstances.id),
  joinedAt: timestamp('joined_at').defaultNow(),
}, (table) => ({
  uniqueQuestViewer: uniqueIndex('idx_quest_viewer').on(table.questId, table.viewerId),
}));

export const encounters = pgTable('encounters', {
  id: serial('id').primaryKey(),
  bossId: varchar('boss_id', { length: 50 }).notNull(),
  state: encounterStateEnum('state').notNull(),
  maxHp: integer('max_hp').notNull(),
  currentHp: integer('current_hp').notNull(),
  participantCount: integer('participant_count').notNull().default(0),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  claimedAt: timestamp('claimed_at'),
});

export const encounterParticipants = pgTable('encounter_participants', {
  id: serial('id').primaryKey(),
  encounterId: integer('encounter_id').notNull().references(() => encounters.id),
  viewerId: integer('viewer_id').notNull().references(() => viewers.id),
  characterId: integer('character_id').notNull().references(() => characterInstances.id),
  totalDamage: integer('total_damage').notNull().default(0),
  attackCount: integer('attack_count').notNull().default(0),
  joinedAt: timestamp('joined_at').defaultNow(),
}, (table) => ({
  uniqueEncounterViewer: uniqueIndex('idx_encounter_viewer').on(table.encounterId, table.viewerId),
}));
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

This data model supports all Phase 1 MVP requirements (FR-001 through FR-090) with:

### Core Systems (FR-001 through FR-046)
- ✅ Persistent viewer data (FR-036, FR-037)
- ✅ Currency tracking and transactions (FR-001, FR-004, FR-005)
- ✅ Tiered pull system (FR-006, FR-007)
- ✅ Material rarity distribution (FR-008, FR-015)
- ✅ Bonus character drops (FR-009, FR-010)
- ✅ Crafting with atomic consumption (FR-021, FR-022)
- ✅ Unique serial numbers (FR-026)
- ✅ Transaction audit logging (pull_results table)

### 2025-12-19 Additions (FR-056 through FR-090)
- ✅ **Material quality variants** (Low 0.5x, Normal 1.0x, High 2.0x) with separate DB rows (FR-074)
- ✅ **Quest system** with 4-state lifecycle (PENDING → ACTIVE → SUCCESS/FAILED → CLAIMED) (FR-056a)
- ✅ **Party formation** with variable PENDING timers (30s/60s/90s by tier) and leader early-start (FR-056b)
- ✅ **Quest rewards** with auto-claim mechanics (FR-056d)
- ✅ **Encounter system** with collaborative HP reduction and state machine (FR-066a, FR-066b)
- ✅ **MVP rewards** based on damage contribution ranking (FR-068)
- ✅ **Character traits** with deterministic seed generation for reproducibility (FR-083)
- ✅ **Trait definitions** reference table for procedural generation

### Technical Features
- PostgreSQL ENUMs for type-safe state transitions
- Composite unique indexes for material quality stacks
- Deterministic trait seed format: `{characterId}-{timestamp}-{uuid}`
- Auto-claim implemented as single transaction (rewards + state update)
- Quality-aware inventory queries with aggregation for UI
- Quest/encounter participant tracking with junction tables

**Schema is ready for Drizzle migration generation**.
