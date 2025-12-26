# Research: Phase 1 MVP Technical Decisions

**Feature**: Phase 1 MVP - Single-Tenant Gacha Extension
**Date**: 2025-12-19 (Updated from 2025-12-18)
**Purpose**: Document technology choices, architectural decisions, and implementation approaches before detailed design.

**Update Note**: Extended with clarifications from 2025-12-19 session covering quest/encounter state machines, material quality tracking, character trait generation, and reward claiming mechanics.

## Overview

This document consolidates research findings for the Phase 1 MVP implementation. All "NEEDS CLARIFICATION" items from the Technical Context have been resolved through evaluation of alternatives and alignment with project constraints.

## Research Areas

### 1. Twitch Extension Development Framework

**Decision**: SvelteKit with `@sveltejs/adapter-static` for production builds, Twitch Extensions Developer Rig for local testing.

**Rationale**:
- **Type Safety**: SvelteKit provides first-class TypeScript support, ensuring compile-time error detection
- **Bundle Size**: Svelte's compiled output is smaller than React/Vue, critical for <100KB constraint
- **Reactive State**: Built-in reactive stores simplify state management without Redux/MobX overhead
- **Static Deployment**: `adapter-static` generates CDN-hostable assets required by Twitch Extension hosting

**Alternatives Evaluated**:
| Option | Bundle Size | TypeScript | State Management | Verdict |
|--------|-------------|------------|------------------|---------|
| Plain HTML/JS | Smallest | Manual | Manual | ❌ No type safety, high bug risk |
| React | ~45KB base | Good | Redux/Context | ❌ Exceeds budget with dependencies |
| Vue 3 | ~35KB base | Good | Pinia/Composition | ⚠️ Viable but team unfamiliar |
| Svelte | ~15KB base | Excellent | Built-in stores | ✅ **Selected** |

**Key Technical Findings**:
- Twitch JWT tokens passed via URL fragment (`#token=...`), extracted client-side
- Extension panel dimensions: 318px wide (desktop), 375px+ wide (mobile)
- No direct database access from extension (security constraint)
- Developer Rig provides local testing with mock JWT generation

**Integration Points**:
```typescript
// Extension receives JWT from Twitch
const jwt = new URLSearchParams(window.location.hash.slice(1)).get('token');

// Pass JWT to backend API
const response = await fetch('/api/inventory', {
  headers: { 'Authorization': `Bearer ${jwt}` }
});
```

### 2. Watch Time Tracking & Currency Earning

**Decision**: Client-side heartbeat (every 60 seconds) with server-side validation via Twitch Helix API.

**Rationale**:
- **Simplicity**: Heartbeat approach is simpler than EventSub webhook subscriptions for MVP
- **Security**: Server validates JWT + stream liveness before awarding currency (FR-003 compliance)
- **Accuracy**: 60-second interval provides acceptable granularity (10 Dust per 5 minutes = 2 Dust/heartbeat)
- **Fallback Ready**: If Twitch provides native watch time API in future, can migrate seamlessly

**Alternatives Evaluated**:
| Approach | Complexity | Accuracy | Security | Verdict |
|----------|------------|----------|----------|---------|
| Pure client tracking | Low | Poor | ❌ Easily manipulated | ❌ Violates FR-003 |
| Twitch EventSub | High | Excellent | ✅ Native | ⚠️ Overkill for MVP |
| Client heartbeat + validation | Medium | Good | ✅ Server-validated | ✅ **Selected** |

**Implementation Flow**:
```
1. Extension loads → Start 60s interval timer
2. Every 60s → POST /api/watch-time { viewerId, channelId }
3. Backend validates:
   - JWT signature valid?
   - Stream live? (GET https://api.twitch.tv/helix/streams?user_id={channelId})
   - Last heartbeat >55s ago? (prevent spam)
4. If valid → Award 2 Dust, update timestamp
5. If invalid → Return 403 error (extension handles gracefully)
```

**Edge Case Handling**:
- **Stream goes offline mid-session**: Next heartbeat fails validation, currency stops accruing
- **Multiple tabs open**: Last-write-wins (each heartbeat awards independently, optimistic concurrency)
- **Network interruption**: Missed heartbeats don't award currency (acceptable trade-off for simplicity)

### 3. Database Layer: Drizzle ORM + Supabase PostgreSQL

**Decision**: Drizzle ORM with Supabase PostgreSQL connection for type-safe database operations.

**Rationale**:
- **Constitution Compliance**: §IV requires "compile-time query validation" — Drizzle provides TypeScript inference from schema
- **Zero Runtime Cost**: Drizzle compiles to raw SQL, no ORM overhead at runtime
- **Migration Support**: `drizzle-kit` generates SQL migrations from schema changes
- **Supabase Free Tier**: 500MB storage, 2GB bandwidth sufficient for MVP testing

**Alternatives Evaluated**:
| ORM | Type Safety | Runtime Overhead | Migration Tooling | Verdict |
|-----|-------------|------------------|-------------------|---------|
| Direct pg client | Manual | None | Manual SQL | ❌ No type safety |
| Prisma | Excellent | ~1-2ms per query | Built-in | ⚠️ Runtime cost |
| TypeORM | Good | ~0.5-1ms | Built-in | ⚠️ Decorator complexity |
| Drizzle | Excellent | None (compiles to SQL) | drizzle-kit | ✅ **Selected** |

**Schema Definition Pattern**:
```typescript
// backend/src/db/schema.ts
import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core';

export const viewers = pgTable('viewers', {
  id: serial('id').primaryKey(),
  twitchId: varchar('twitch_id', { length: 255 }).notNull().unique(),
  dustBalance: integer('dust_balance').notNull().default(250),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Connection Setup**:
```typescript
// backend/src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);
```

**Key Technical Constraints**:
- Use `integer` type for currency/materials (max 2^31-1 = 2,147,483,647 sufficient per "no limits" clarification)
- Soft deletes not required for MVP (no character deletion feature in Phase 1)
- Row-Level Security (RLS) available but not necessary for single-tenant MVP

### 4. Serial Number Generation for Character Instances

**Decision**: PostgreSQL sequences (one per character type) with format `S1-{CHAR_ID}-{SERIAL}`.

**Rationale**:
- **Uniqueness Guarantee**: PostgreSQL sequences are atomic and never produce duplicates
- **Per-Character Tracking**: Separate sequences enable "You own #47 of 120 Golden Puffs" collectibility messaging
- **Collision-Free**: No race conditions even with concurrent crafts
- **Readable Format**: `S1-GPUFF-00047` is human-readable and shareable

**Alternatives Evaluated**:
| Approach | Uniqueness | Readability | Collectibility | Verdict |
|----------|------------|-------------|----------------|---------|
| UUID | ✅ Guaranteed | ❌ Long hex string | ❌ No order | ❌ Not human-friendly |
| Global counter | ✅ Guaranteed | ✅ Short number | ❌ No per-character tracking | ❌ Loses collectibility |
| Per-character sequence | ✅ Guaranteed | ✅ Readable | ✅ Enables rarity tracking | ✅ **Selected** |

**Implementation**:
```sql
-- Migration: Create sequence for each character
CREATE SEQUENCE char_goldenpuff_seq START 1;
CREATE SEQUENCE char_cosmicowl_seq START 1;

-- Craft function generates serial
CREATE OR REPLACE FUNCTION craft_character(
  p_char_id VARCHAR,
  p_owner_id VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  serial_num INTEGER;
  serial_str VARCHAR;
BEGIN
  -- Get next sequence value (sequence name must match char_id)
  EXECUTE format('SELECT nextval(%L)', 'char_' || lower(p_char_id) || '_seq') INTO serial_num;

  -- Format: S1-CHARDEF-00047 (zero-padded to 5 digits)
  serial_str := 'S1-' || p_char_id || '-' || LPAD(serial_num::TEXT, 5, '0');

  RETURN serial_str;
END;
$$ LANGUAGE plpgsql;
```

**Collectibility Queries**:
```sql
-- How many total Golden Puffs exist?
SELECT currval('char_goldenpuff_seq');

-- What's my highest serial?
SELECT MAX(CAST(SUBSTRING(serial_number FROM 10) AS INTEGER))
FROM character_instances
WHERE owner_id = 'viewer123' AND char_id = 'GPUFF';
```

### 5. Pull Transaction Flow: Server-First vs Optimistic UI

**Decision**: Execute complete transaction server-side before returning results to client. Client plays animation with known results.

**Rationale**:
- **Data Consistency**: FR-040 requires "commit before showing success feedback" — server-first guarantees this
- **Animation Interruption Safety**: If viewer closes extension mid-animation, results already persisted
- **No Rollback Complexity**: Client never needs to undo optimistic updates
- **Simpler Error Handling**: Transaction failure = no UI update needed

**Alternatives Evaluated**:
| Approach | Data Safety | UX Responsiveness | Complexity | Verdict |
|----------|-------------|-------------------|------------|---------|
| Optimistic UI (update before server) | ❌ Rollback required | ✅ Instant | High | ❌ Violates FR-040 |
| Animation-then-commit | ❌ Data loss risk | ✅ Smooth | High | ❌ Violates FR-040 |
| Server-first | ✅ Guaranteed consistency | ⚠️ Network latency | Low | ✅ **Selected** |

**Detailed Flow**:
```
1. User clicks "Pull 5x" button
2. Client disables button, shows loading state
3. POST /api/pulls { tier: '5' }
   └─ Server:
      a. Validate JWT → extract viewer_id
      b. Check rate limit (last pull >2s ago?)
      c. Check currency (balance >= 225?)
      d. BEGIN TRANSACTION
      e. Deduct 225 Dust
      f. Roll 10-20 materials (each with 60/25/12/3% rarity)
      g. Roll 5 bonus character chances (~5% each)
      h. Insert materials to inventory
      i. Insert any bonus characters
      j. Insert pull_results log entry
      k. COMMIT TRANSACTION
      l. Return { materials: [...], characters: [...], newBalance: 375 }
4. Client receives response (100-200ms typical)
5. Play 3-4s animation revealing returned materials/characters
6. Update UI with new balance and inventory

Edge case: If client closes tab at step 5, results already saved (step 3k).
Next session loads persisted state correctly.
```

**Performance Optimization**:
- Server pre-rolls all results before starting transaction (no DB round-trips during TX)
- Single INSERT for all materials using batch query
- Total transaction time: <50ms (well under 200ms API goal)

### 6. Rate Limiting: In-Memory vs Database vs Redis

**Decision**: In-memory Map with `viewer_id → timestamp` for MVP.

**Rationale**:
- **Simplicity**: Single-instance deployment for MVP, no distributed coordination needed
- **Performance**: Map lookup is O(1), no network round-trip
- **Sufficient Scale**: Single test channel doesn't require Redis infrastructure
- **Easy Migration**: Can swap to Redis later if multi-instance deployment required

**Alternatives Evaluated**:
| Approach | Latency | Scalability | Complexity | MVP Suitable | Verdict |
|----------|---------|-------------|------------|--------------|---------|
| Database `last_pull_at` | ~5-10ms | ✅ Distributed | Low | ⚠️ Slow | ❌ Exceeds latency budget |
| Redis | ~1-2ms | ✅ Distributed | Medium | ⚠️ Overkill | ❌ Adds deployment complexity |
| In-memory Map | <1ms | ❌ Single-instance | Low | ✅ MVP only | ✅ **Selected** |

**Implementation**:
```typescript
// backend/src/lib/rate-limit.ts
const pullTimestamps = new Map<string, number>();

export function canPull(viewerId: string): boolean {
  const now = Date.now();
  const lastPull = pullTimestamps.get(viewerId) || 0;
  const elapsed = now - lastPull;

  if (elapsed < 2000) {
    return false; // Rate limited
  }

  pullTimestamps.set(viewerId, now);
  return true;
}

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [viewerId, timestamp] of pullTimestamps.entries()) {
    if (now - timestamp > 300000) { // 5 minutes
      pullTimestamps.delete(viewerId);
    }
  }
}, 300000);
```

**Migration Path** (when scaling beyond MVP):
```typescript
// Future Redis implementation (drop-in replacement)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function canPull(viewerId: string): Promise<boolean> {
  const key = `rate:pull:${viewerId}`;
  const result = await redis.set(key, '1', 'EX', 2, 'NX'); // Set if Not eXists, 2s TTL
  return result === 'OK';
}
```

### 7. Hardcoded Materials and Recipes Strategy

**Decision**: TypeScript constants in `backend/src/lib/recipes.ts`, seeded to database on application startup.

**Rationale**:
- **Type Safety**: TypeScript constants provide autocomplete and compile-time validation
- **MVP Speed**: No creator dashboard UI needed, can iterate quickly during testing
- **Future-Compatible**: Database schema remains multi-tenant-ready for Phase 3 migration
- **Version Control**: Changes tracked in Git, easy to review and revert

**Material Point Budget System**:
```typescript
// backend/src/lib/recipes.ts
export const MATERIAL_POINT_VALUES = {
  common: 1,
  uncommon: 5,
  rare: 25,
  legendary: 100,
} as const;

export const MATERIALS = [
  // Common tier (1 point each) - need 4-6 per spec
  { id: 'FLUFF', name: 'Fluff', rarity: 'common', points: 1 },
  { id: 'DUST', name: 'Cosmic Dust', rarity: 'common', points: 1 },
  { id: 'WISP', name: 'Wisp', rarity: 'common', points: 1 },
  { id: 'EMBER', name: 'Ember', rarity: 'common', points: 1 },

  // Uncommon tier (5 points each)
  { id: 'SPARK', name: 'Spark', rarity: 'uncommon', points: 5 },
  { id: 'SHARD', name: 'Shard', rarity: 'uncommon', points: 5 },
  { id: 'GLOW', name: 'Glow', rarity: 'uncommon', points: 5 },
  { id: 'CHARM', name: 'Charm', rarity: 'uncommon', points: 5 },

  // Rare tier (25 points each)
  { id: 'ESSENCE', name: 'Essence', rarity: 'rare', points: 25 },
  { id: 'GEM', name: 'Gem', rarity: 'rare', points: 25 },
  { id: 'CRYSTAL', name: 'Crystal', rarity: 'rare', points: 25 },
  { id: 'ORB', name: 'Orb', rarity: 'rare', points: 25 },

  // Legendary tier (100 points each)
  { id: 'CORE', name: 'Prism Core', rarity: 'legendary', points: 100 },
  { id: 'SOUL', name: 'Soul Fragment', rarity: 'legendary', points: 100 },
  { id: 'STAR', name: 'Star Dust', rarity: 'legendary', points: 100 },
] as const;

// Character Recipes (point budgets from spec: common ~100, rare ~500)
export const RECIPES = [
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
    }, // Total: 100 points
  },
  {
    id: 'RECIPE_CBIRD',
    charId: 'CBIRD',
    charName: 'Cloud Bird',
    charRarity: 'common',
    materials: {
      WISP: 60,
      EMBER: 30,
      GLOW: 2,
    }, // Total: 100 points
  },
  {
    id: 'RECIPE_STARF',
    charId: 'STARF',
    charName: 'Starfish',
    charRarity: 'common',
    materials: {
      DUST: 70,
      SPARK: 3,
      SHARD: 3,
    }, // Total: 100 points
  },

  // Rare characters (425-575 point budget per spec)
  {
    id: 'RECIPE_COWL',
    charId: 'COWL',
    charName: 'Cosmic Owl',
    charRarity: 'rare',
    materials: {
      FLUFF: 100,  // 100
      SPARK: 20,   // 100
      ESSENCE: 12, // 300
    }, // Total: 500 points
  },
  {
    id: 'RECIPE_PHOENIX',
    charId: 'PHOENIX',
    charName: 'Phoenix',
    charRarity: 'rare',
    materials: {
      EMBER: 150,  // 150
      CHARM: 30,   // 150
      GEM: 8,      // 200
    }, // Total: 500 points
  },
] as const;
```

**Database Seeding**:
```typescript
// backend/src/db/seed.ts
import { db } from './index';
import { materials, recipes, characterDefinitions } from './schema';
import { MATERIALS, RECIPES } from '../lib/recipes';

export async function seedDatabase() {
  // Check if already seeded
  const existingMaterials = await db.select().from(materials).limit(1);
  if (existingMaterials.length > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // Insert materials
  await db.insert(materials).values(MATERIALS);

  // Insert character definitions
  const charDefs = [...new Set(RECIPES.map(r => r.charId))].map(charId => {
    const recipe = RECIPES.find(r => r.charId === charId)!;
    return {
      id: charId,
      name: recipe.charName,
      rarity: recipe.charRarity,
      // Create sequence for serial numbers
    };
  });
  await db.insert(characterDefinitions).values(charDefs);

  // Insert recipes with material requirements
  for (const recipe of RECIPES) {
    await db.insert(recipes).values({
      id: recipe.id,
      charId: recipe.charId,
      // Insert material requirements in junction table
    });
  }

  console.log('Database seeded successfully');
}

// Run on server startup
// backend/src/index.ts
import { seedDatabase } from './db/seed';
await seedDatabase();
```

## Summary of Decisions

| Area | Decision | Key Trade-off |
|------|----------|---------------|
| **Frontend Framework** | SvelteKit + static adapter | Bundle size over ecosystem size |
| **Watch Time Tracking** | Client heartbeat + server validation | Simplicity over perfect accuracy |
| **Database Layer** | Drizzle ORM + Supabase PostgreSQL | Type safety over ORM features |
| **Serial Numbers** | Per-character PostgreSQL sequences | Collectibility over global ordering |
| **Transaction Flow** | Server-first (results before animation) | Data consistency over instant feedback |
| **Rate Limiting** | In-memory Map | MVP simplicity over scalability |
| **Materials/Recipes** | TypeScript constants (seeded to DB) | Dev speed over dynamic configuration |

## Open Questions Resolved

All technical uncertainties from the original specification have been addressed:

1. ✅ **How to build Twitch extension?** → SvelteKit static adapter
2. ✅ **How to track watch time?** → Client heartbeat with server validation
3. ✅ **How to ensure type safety?** → Drizzle ORM with TypeScript
4. ✅ **How to generate unique serials?** → PostgreSQL sequences per character
5. ✅ **How to handle pull transactions?** → Server-first, animation after commit
6. ✅ **How to rate limit?** → In-memory Map (sufficient for MVP)
7. ✅ **How to define materials/recipes?** → TypeScript constants seeded to DB

### 8. Quest/Encounter State Machine (2025-12-19 Clarification)

**Decision**: 4-state lifecycle (PENDING → ACTIVE → SUCCESS/FAILED → CLAIMED) with PostgreSQL ENUM enforcement

**Rationale**:
- **Party Formation Support**: PENDING state allows 30-90s window for viewers to join quests before automatic/manual start
- **Clear Outcome Tracking**: SUCCESS/FAILED states explicitly capture quest result before reward distribution
- **Auto-Claim Simplicity**: CLAIMED state marks reward delivery completion, prevents double-claiming
- **Database Validation**: PostgreSQL ENUM prevents invalid state transitions at DB level

**Alternatives Evaluated**:
| Model | States | Complexity | Party Formation | Verdict |
|-------|--------|------------|-----------------|---------|
| 2-state | ACTIVE → COMPLETED | Low | ❌ No prep phase | ❌ Can't support joiners |
| 3-state | PREPARING → IN_PROGRESS → COMPLETED/FAILED | Medium | ✅ Prep phase | ⚠️ No explicit claim |
| 4-state | PENDING → ACTIVE → SUCCESS/FAILED → CLAIMED | Medium | ✅ Prep + outcome + claim | ✅ **Selected** |
| 5-state | CREATED → READY → RUNNING → FINISHED → ARCHIVED | High | ✅ Granular | ❌ Over-engineered |

**PENDING Phase Timing**:
- Short quests: 30 seconds
- Medium quests: 60 seconds
- Long quests: 90 seconds
- Leader can force-start early (skips to ACTIVE immediately)

**State Transition Rules**:
```typescript
const VALID_TRANSITIONS: Record<QuestState, QuestState[]> = {
  PENDING: ['ACTIVE'],                    // Timer expires or leader starts
  ACTIVE: ['SUCCESS', 'FAILED'],          // Quest completes
  SUCCESS: ['CLAIMED'],                   // Rewards distributed
  FAILED: ['CLAIMED'],                    // Consolation rewards distributed
  CLAIMED: [],                            // Terminal state
}
```

**Implementation**:
```sql
CREATE TYPE quest_state AS ENUM ('PENDING', 'ACTIVE', 'SUCCESS', 'FAILED', 'CLAIMED');
CREATE TYPE encounter_state AS ENUM ('PENDING', 'ACTIVE', 'SUCCESS', 'FAILED', 'CLAIMED');

CREATE TABLE quests (
  id SERIAL PRIMARY KEY,
  state quest_state NOT NULL DEFAULT 'PENDING',
  tier VARCHAR(10) NOT NULL, -- 'short' | 'medium' | 'long'
  pending_expires_at TIMESTAMP, -- PENDING → ACTIVE auto-transition time
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  -- Constraint: cannot transition backward
  CHECK (
    (state = 'PENDING' AND started_at IS NULL) OR
    (state = 'ACTIVE' AND started_at IS NOT NULL) OR
    (state IN ('SUCCESS', 'FAILED') AND completed_at IS NOT NULL)
  )
);
```

---

### 9. Material Quality Inventory Tracking (2025-12-19 Clarification)

**Decision**: Separate database rows per quality level, consolidated UI presentation

**Rationale**:
- **Query Simplicity**: Standard SQL without JSONB operators (`WHERE quality = 'high'`)
- **Normalized Data**: 3NF compliant, each quality/material combo is distinct entity
- **UI Flexibility**: Frontend consolidates on demand (hover/click shows breakdown)
- **Efficient Aggregation**: `SUM(quantity * point_value * quality_multiplier)` for total value

**Alternatives Evaluated**:
| Approach | Query Complexity | Normalization | UI Consolidation | Verdict |
|----------|------------------|---------------|------------------|---------|
| JSONB column | High (needs operators) | ❌ Denormalized | ✅ Pre-computed | ❌ Type-unsafe |
| Separate tables | Medium (joins) | ✅ Over-normalized | ✅ Easy | ❌ 3x tables |
| **Separate rows** | Low (standard SQL) | ✅ 3NF | ✅ Frontend layer | ✅ **Selected** |
| Multiplier column | High (computed queries) | ⚠️ Partial | ⚠️ Complex | ❌ Hard to reason |

**Schema Design**:
```typescript
export const materialInventory = pgTable('material_inventory', {
  id: serial('id').primaryKey(),
  viewerId: integer('viewer_id').notNull().references(() => viewers.id),
  materialId: varchar('material_id', { length: 20 }).notNull(),
  quality: varchar('quality', { length: 10 }).notNull(), // 'low' | 'normal' | 'high'
  quantity: integer('quantity').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique index: one row per (viewer, material, quality) combo
  uniqueStack: uniqueIndex('idx_inventory_stack').on(
    table.viewerId,
    table.materialId,
    table.quality
  ),
}))
```

**UI Consolidation Pattern**:
```typescript
// Backend: Returns all quality stacks separately
GET /api/viewers/{id}/inventory
→ {
  materials: [
    { materialId: 'WOOD', quality: 'low', quantity: 50, pointValue: 1 },
    { materialId: 'WOOD', quality: 'normal', quantity: 120, pointValue: 1 },
    { materialId: 'WOOD', quality: 'high', quantity: 8, pointValue: 1 },
  ]
}

// Frontend: Consolidates for display
function consolidateForDisplay(stacks: MaterialStack[]) {
  const byMaterial = groupBy(stacks, s => s.materialId)

  return Object.entries(byMaterial).map(([materialId, stacks]) => {
    const totalPoints = stacks.reduce((sum, s) => {
      const multiplier = s.quality === 'low' ? 0.5 : s.quality === 'high' ? 2.0 : 1.0
      return sum + (s.quantity * s.pointValue * multiplier)
    }, 0)

    return {
      materialId,
      totalPoints,
      breakdown: stacks, // Show on hover/click
      displayText: `${materialId}: ${totalPoints} points`
    }
  })
}

// UI displays consolidated view:
// "Wood: 161 points ⓘ"  (hover shows breakdown)
```

---

### 10. Character Trait Generation: Deterministic Seeding (2025-12-19 Clarification)

**Decision**: Use `seedrandom` library with composite seed (characterId + timestamp + salt)

**Rationale**:
- **Reproducibility**: Same seed generates identical traits (critical for debugging/support)
- **Audit Trail**: Store seed in database alongside character instance
- **Server-Side Security**: Seed generated server-side prevents client manipulation
- **Deterministic Testing**: Can write trait distribution unit tests with fixed seeds

**Alternatives Evaluated**:
| Approach | Reproducibility | Security | Testability | Verdict |
|----------|----------------|----------|-------------|---------|
| Math.random() | ❌ Non-deterministic | ⚠️ Client-exploitable | ❌ Flaky tests | ❌ No audit trail |
| crypto.randomUUID() | ❌ Non-deterministic | ✅ Secure | ❌ Can't replay | ❌ No debugging |
| **seedrandom** | ✅ Deterministic | ✅ Server-generated | ✅ Fixed seeds | ✅ **Selected** |
| Custom PRNG | ✅ Deterministic | ⚠️ Potential bias | ⚠️ Complex | ❌ Reinventing wheel |

**Implementation**:
```typescript
import seedrandom from 'seedrandom'

function generateCharacterTraits(
  characterId: string,
  rarity: CharacterRarity
): { traits: string[], seed: string } {
  // Composite seed ensures uniqueness + reproducibility
  const seed = `${characterId}-${Date.now()}-${crypto.randomUUID()}`
  const rng = seedrandom(seed)

  // Determine trait count by rarity (per FR-079 to FR-082)
  const traitCount = {
    common: 1,
    rare: Math.floor(rng() * 2) + 1,     // 1-2 traits
    epic: 2,
    legendary: Math.floor(rng() * 2) + 2, // 2-3 traits
  }[rarity]

  // Get trait pool filtered by rarity distribution
  const availableTraits = getTraitPoolForRarity(rarity, rng)

  // Select without replacement
  const selectedTraits: string[] = []
  for (let i = 0; i < traitCount; i++) {
    const idx = Math.floor(rng() * availableTraits.length)
    selectedTraits.push(availableTraits.splice(idx, 1)[0])
  }

  return { traits: selectedTraits, seed }
}

// Store seed in database for debugging
export const characterInstances = pgTable('character_instances', {
  id: serial('id').primaryKey(),
  serialNumber: varchar('serial_number', { length: 50 }).notNull().unique(),
  characterId: varchar('character_id', { length: 20 }).notNull(),
  viewerId: integer('viewer_id').notNull(),
  traitSeed: varchar('trait_seed', { length: 100 }).notNull(), // Stored for reproducibility
  traits: json('traits').$type<string[]>().notNull(),           // Actual trait IDs
  acquisitionMethod: varchar('acquisition_method', { length: 10 }).notNull(), // 'pull' | 'craft'
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Debugging/Support: Replay trait generation
function replayTraitGeneration(seed: string, rarity: CharacterRarity): string[] {
  const rng = seedrandom(seed) // Same seed = same RNG sequence
  // ... same logic as generateCharacterTraits
  // Result will be identical to original generation
}
```

**Unit Testing**:
```typescript
// Test trait distribution with fixed seed
test('legendary characters always get 2-3 positive traits', () => {
  const seed = 'test-seed-12345' // Fixed seed
  const rng = seedrandom(seed)

  // ... trait generation logic

  expect(traits.length).toBeGreaterThanOrEqual(2)
  expect(traits.length).toBeLessThanOrEqual(3)
  expect(traits.every(isPositiveTrait)).toBe(true)
})
```

---

### 11. Reward Auto-Claim Mechanics (2025-12-19 Clarification)

**Decision**: Auto-claim rewards immediately when quest/encounter transitions to SUCCESS/FAILED, with toast notification

**Rationale**:
- **Zero Friction**: No manual claim button required, rewards appear instantly in inventory
- **No Unclaimed Accumulation**: Prevents database bloat from thousands of unclaimed quest results
- **Simpler State Machine**: CLAIMED state is purely for audit trail, not user interaction
- **Notification Clarity**: Toast shows "Quest Complete! +15 materials" without extra click

**Alternatives Evaluated**:
| Approach | User Friction | Database Complexity | Lost Rewards Risk | Verdict |
|----------|---------------|---------------------|-------------------|---------|
| Manual claim button | High (extra click) | High (unclaimed queue) | Medium (forgot to claim) | ❌ Adds unnecessary step |
| Auto-claim + notification | Low (zero clicks) | Low (immediate write) | None (instant delivery) | ✅ **Selected** |
| Auto-claim after grace period | Medium (wait time) | Medium (delayed writes) | Low (grace prevents loss) | ⚠️ Confusing delay |
| Batch claim UI | Medium (periodic task) | High (claim queue) | Medium (cognitive load) | ❌ Power-user only |

**State Transition Flow**:
```
ACTIVE → SUCCESS/FAILED (quest completion logic runs)
    ↓
  Auto-transition to CLAIMED:
    1. Calculate rewards (materials based on success rate)
    2. INSERT INTO material_inventory (bulk upsert)
    3. UPDATE quest SET state = 'CLAIMED', claimed_at = NOW()
    4. Send notification payload to frontend
    5. Frontend shows toast: "Quest Complete! +8 Fluff, +3 Dust, +1 Spark"
```

**Implementation**:
```typescript
async function completeQuest(questId: number) {
  const quest = await db
    .select()
    .from(quests)
    .where(eq(quests.id, questId))
    .for('update') // Lock row

  // Calculate outcome (success/failure based on FR-050 formula)
  const successRate = calculateSuccessRate(quest)
  const outcome = Math.random() < successRate ? 'SUCCESS' : 'FAILED'

  // Calculate rewards
  const rewards = calculateQuestRewards(quest.tier, outcome)

  // Auto-claim: Insert rewards + update state in single transaction
  await db.transaction(async (tx) => {
    // 1. Add materials to inventory
    for (const reward of rewards) {
      await tx
        .insert(materialInventory)
        .values({
          viewerId: quest.leaderId,
          materialId: reward.materialId,
          quality: reward.quality,
          quantity: reward.quantity,
        })
        .onConflictDoUpdate({
          target: [materialInventory.viewerId, materialInventory.materialId, materialInventory.quality],
          set: { quantity: sql`${materialInventory.quantity} + ${reward.quantity}` },
        })
    }

    // 2. Update quest state to CLAIMED
    await tx
      .update(quests)
      .set({
        state: outcome,      // First SUCCESS or FAILED
        completedAt: new Date(),
      })
      .where(eq(quests.id, questId))

    // Immediately transition to CLAIMED (auto-claim)
    await tx
      .update(quests)
      .set({
        state: 'CLAIMED',
        claimedAt: new Date(),
      })
      .where(eq(quests.id, questId))
  })

  // 3. Return rewards for frontend notification
  return {
    outcome,
    rewards,
    notification: {
      type: outcome === 'SUCCESS' ? 'quest-success' : 'quest-failed',
      message: `Quest ${outcome === 'SUCCESS' ? 'Complete' : 'Failed'}!`,
      materials: rewards.map(r => `+${r.quantity} ${r.materialId}`).join(', '),
    },
  }
}
```

**Frontend Notification Pattern**:
```typescript
// extension/src/lib/notification-handler.ts
import { toastStore } from './stores'

export function handleQuestComplete(notification: QuestCompleteNotification) {
  toastStore.show({
    type: notification.outcome === 'SUCCESS' ? 'success' : 'warning',
    title: notification.message,
    description: notification.materials,
    duration: 5000, // 5 seconds
    icon: notification.outcome === 'SUCCESS' ? '✓' : '✗',
  })

  // Update local inventory store (optimistic, server already committed)
  inventoryStore.update((inv) => {
    for (const reward of notification.rewards) {
      const stack = inv.find(
        (s) => s.materialId === reward.materialId && s.quality === reward.quality
      )
      if (stack) {
        stack.quantity += reward.quantity
      } else {
        inv.push(reward)
      }
    }
    return inv
  })
}
```

---

## Summary of Decisions (Updated 2025-12-19)

| Area | Decision | Key Trade-off |
|------|----------|---------------|
| **Frontend Framework** | SvelteKit + static adapter | Bundle size over ecosystem size |
| **Watch Time Tracking** | Client heartbeat + server validation | Simplicity over perfect accuracy |
| **Database Layer** | Drizzle ORM + Supabase PostgreSQL | Type safety over ORM features |
| **Serial Numbers** | Per-character PostgreSQL sequences | Collectibility over global ordering |
| **Transaction Flow** | Server-first (results before animation) | Data consistency over instant feedback |
| **Rate Limiting** | In-memory Map | MVP simplicity over scalability |
| **Materials/Recipes** | TypeScript constants (seeded to DB) | Dev speed over dynamic configuration |
| **Quest/Encounter State** | 4-state lifecycle (PENDING→ACTIVE→SUCCESS/FAILED→CLAIMED) | Clear semantics over minimal states |
| **Material Quality Storage** | Separate DB rows per quality | Query simplicity over storage efficiency |
| **Trait Generation** | Deterministic seeding (seedrandom) | Reproducibility over pure randomness |
| **Reward Claiming** | Auto-claim with notifications | Zero friction over user control |

## Open Questions Resolved

All technical uncertainties from the original specification have been addressed:

1. ✅ **How to build Twitch extension?** → SvelteKit static adapter
2. ✅ **How to track watch time?** → Client heartbeat with server validation
3. ✅ **How to ensure type safety?** → Drizzle ORM with TypeScript
4. ✅ **How to generate unique serials?** → PostgreSQL sequences per character
5. ✅ **How to handle pull transactions?** → Server-first, animation after commit
6. ✅ **How to rate limit?** → In-memory Map (sufficient for MVP)
7. ✅ **How to define materials/recipes?** → TypeScript constants seeded to DB
8. ✅ **How to manage quest/encounter lifecycle?** → 4-state PostgreSQL ENUM with validation
9. ✅ **How to store material quality?** → Separate inventory rows, UI consolidation
10. ✅ **How to generate character traits?** → Deterministic seeding for reproducibility
11. ✅ **How to handle reward claims?** → Auto-claim immediately with notifications

## Next Phase

With all research complete, proceed to **Phase 1: Data Model & API Contracts** to design database schema and REST endpoints based on these technical decisions.
