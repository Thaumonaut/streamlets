# Implementation Plan: Phase 1 MVP - Single-Tenant Gacha Extension

**Branch**: `001-phase-1-mvp` | **Date**: 2025-12-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-phase-1-mvp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a single-tenant Twitch extension that provides gacha-style collectible character pulls for viewers. The MVP focuses on validating the core engagement loop: viewers earn currency ("Dust") by watching streams, perform tiered pulls (single/5-pull/10-pull) for crafting materials with bonus character drop chances, craft characters using collected materials and recipes, and view their collection. The system includes persistent viewer data, server-side randomness for fairness, and atomic transactions for data integrity. This Phase 1 implementation is hardcoded for one test channel to validate mechanics before expanding to multi-tenant platform architecture in later phases.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 18+
**Primary Dependencies**: SvelteKit, Drizzle ORM, Twitch Extension Helper
**Storage**: PostgreSQL (via Supabase free tier)
**Testing**: Manual testing acceptable for MVP (automated testing deferred per spec Out of Scope)
**Target Platform**: Twitch Extension (browser-based panel view) + Backend API (Node.js on Vercel/Railway)
**Project Type**: Web application (extension frontend + backend API)
**Performance Goals**: API responses <200ms p95, pull animations 60fps, collection view <1s for 100 characters
**Constraints**: Extension bundle <100KB gzipped, mobile viewport 375px minimum width, single-tenant hardcoded
**Scale/Scope**: Single test channel, 5 character designs, 4-6 materials per tier, MVP validation focus

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Compliance Assessment

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Twitch TOS Compliance** | ✅ PASS | Tiered pull system uses free currency only (no Bits). Materials guaranteed per pull, bonus character drops are additional. Transparent drop rates in spec. |
| **II. Multi-Tenant by Design** | ⚠️ DEFERRED | Phase 1 explicitly single-tenant per Constitution §V. Multi-tenant architecture planned for Phase 3. Acceptable violation for MVP. |
| **III. Three-Part Ecosystem** | ⚠️ DEFERRED | Phase 1 extension-only per Constitution §V. Website and overlay deferred to Phase 2/3. Acceptable violation for MVP. |
| **IV. Type-Safe Data Layer** | ✅ PASS | Drizzle ORM for compile-time query validation, PostgreSQL with schema migrations, typed entities defined in spec. |
| **V. Progressive MVP Development** | ✅ PASS | Explicitly following Phase 1 definition: single-tenant, hardcoded materials/recipes, basic extension only. |
| **VI. Viewer Experience Excellence** | ✅ PASS | Sub-200ms API responses, 3-4s pull animations, mobile-friendly, instant inventory updates per FR-018. |
| **VII. Monetization & Economy** | ✅ PASS | Tiered pull system (1-3 / 10-20 / up to 50 materials) with volume discounts. 5% bonus character chance. No Bits integration in Phase 1. |
| **VIII. Progression Philosophy** | ⚠️ PARTIAL | Crafting and collection depth implemented. Constellations, Bonds, Quests deferred to later phases per spec Out of Scope. |
| **IX. Crafting & Research** | ⚠️ PARTIAL | Crafting implemented with point-budget recipes. Community research system deferred per spec scope assumptions (all recipes immediately available for MVP). |

**Gate Decision**: ✅ **PASS WITH DOCUMENTED DEFERRALS**

All violations are explicitly planned per Constitution §V (Progressive MVP Development) and documented in spec Out of Scope. Phase 1 is intentionally narrow to validate core mechanics before platform investment.

## Project Structure

### Documentation (this feature)

```text
specs/001-phase-1-mvp/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   ├── api.openapi.yaml # REST API contract
│   └── types.ts         # Shared TypeScript types
├── checklists/
│   └── requirements.md  # Specification quality checklist (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Extension Frontend (Twitch-hosted static assets)
extension/
├── src/
│   ├── components/
│   │   ├── PullView.svelte      # Pull interface with tier selection
│   │   ├── CraftingView.svelte  # Recipe list and crafting interface
│   │   ├── InventoryView.svelte # Material inventory display
│   │   ├── CollectionView.svelte # Character collection grid
│   │   └── shared/
│   │       ├── MaterialCard.svelte
│   │       ├── CharacterCard.svelte
│   │       └── CurrencyDisplay.svelte
│   ├── lib/
│   │   ├── api.ts               # Backend API client
│   │   ├── auth.ts              # Twitch JWT handling
│   │   └── store.ts             # Svelte stores for state
│   ├── app.html                 # Extension entry point
│   └── routes/
│       └── +page.svelte         # Main panel view
├── static/
│   └── assets/                  # Character/material artwork
├── svelte.config.js             # @sveltejs/adapter-static
└── tsconfig.json

# Backend API (Node.js on Vercel/Railway)
backend/
├── src/
│   ├── api/
│   │   ├── pulls.ts             # POST /api/pulls - Execute pull
│   │   ├── crafting.ts          # POST /api/craft - Craft character
│   │   ├── inventory.ts         # GET /api/inventory - Get viewer data
│   │   └── watch-time.ts        # POST /api/watch-time - Award currency
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema definitions
│   │   ├── migrations/          # SQL migration files
│   │   └── seed.ts              # Hardcoded test channel data
│   ├── lib/
│   │   ├── auth.ts              # JWT validation middleware
│   │   ├── gacha.ts             # Pull randomness logic
│   │   └── recipes.ts           # Hardcoded recipe definitions
│   └── index.ts                 # API server entry point
├── drizzle.config.ts
└── tsconfig.json

# Shared Types (imported by both extension and backend)
shared/
└── types.ts                     # Viewer, Material, Character, Pull, Recipe types

# Configuration
.env.example                     # Supabase URL, Twitch Extension secrets
package.json                     # Monorepo with workspaces
tsconfig.base.json               # Shared TS config
```

**Structure Decision**: Web application with extension frontend (SvelteKit static adapter) and backend API (SvelteKit Node adapter or Vercel adapter). Monorepo structure using npm/pnpm workspaces to share types between extension and backend. Extension builds to static assets hosted on Twitch CDN. Backend deployed separately to Vercel/Railway with Supabase database connection.

## Complexity Tracking

No unjustified violations. All deferrals are explicitly documented in Constitution §V (Progressive MVP Development) and align with spec Out of Scope section. Single-tenant and extension-only implementation is the intended Phase 1 architecture.

## Phase 0: Research & Technology Validation

### Research Tasks

#### 1. Twitch Extension Development

**Decision**: Use Twitch Extensions Developer Rig for local testing, SvelteKit with `@sveltejs/adapter-static` for production builds.

**Rationale**:
- SvelteKit provides TypeScript support, reactive state management, and optimal bundle size
- Static adapter generates CDN-hostable assets required by Twitch
- Developer Rig enables local testing with simulated JWT tokens before submission

**Alternatives considered**:
- Plain HTML/JS: Rejected due to lack of type safety and state management
- React: Rejected due to larger bundle size (target: <100KB)
- Vue: Considered but team has SvelteKit expertise per constitution

**Key findings**:
- Twitch JWT tokens passed via URL parameters, validated server-side
- Extension panel view dimensions: 318px wide (desktop), variable height
- Mobile viewport: 375px minimum per spec FR-042
- No direct database access from extension (must use backend API)

#### 2. Twitch Watch Time API Integration

**Decision**: Investigate Twitch Helix API for viewer presence, fallback to client heartbeat with server validation if native watch time API unavailable.

**Rationale**:
- Spec FR-003 requires "Twitch's native watch time API (with fallback to client heartbeat)"
- Twitch Helix API provides `/streams` endpoint to verify stream is live
- EventSub webhooks can track viewer join/leave (requires backend subscription)
- Client heartbeat (every 60s) is simpler for MVP, validated server-side against stream status

**Alternatives considered**:
- Twitch PubSub: Deprecated in favor of EventSub
- Pure client-side tracking: Rejected due to manipulation risk (FR-003 validation requirement)

**Implementation approach for MVP**:
- Client sends heartbeat POST to `/api/watch-time` every 60 seconds while extension open
- Backend validates: (1) JWT token valid, (2) stream is live via Helix API, (3) last heartbeat >55s ago
- Award 10 Dust per 5 minutes = 2 Dust per heartbeat (integer math simplification)

#### 3. Drizzle ORM with Supabase PostgreSQL

**Decision**: Use Drizzle ORM with Supabase PostgreSQL connection for type-safe database operations.

**Rationale**:
- Constitution §IV requires type-safe data layer with compile-time query validation
- Drizzle provides zero-cost TypeScript inference from schema
- Supabase offers PostgreSQL with built-in connection pooling (pg-pool)
- Free tier sufficient for MVP (500MB storage, 2GB bandwidth)

**Alternatives considered**:
- Prisma: Rejected due to larger runtime overhead and migration complexity
- Direct PostgreSQL client: Rejected due to lack of type safety

**Key findings**:
- Schema migrations via `drizzle-kit generate` and `drizzle-kit migrate`
- Connection string from Supabase dashboard (`DATABASE_URL` env var)
- Row-level security (RLS) available but not required for single-tenant MVP
- Use `integer` type for currency/materials (max 2^31-1 sufficient per "no limits" decision)

#### 4. Serial Number Generation Strategy

**Decision**: Use database sequence with format `S1-{CHAR_ID}-{SERIAL}` where SERIAL is auto-incrementing per character type.

**Rationale**:
- Spec FR-026 requires unique serial format: `S1-[CHAR_ID]-[SERIAL]`
- PostgreSQL sequences guarantee uniqueness without race conditions
- Per-character sequences enable "You own 1 of 47 Golden Puffs" tracking (Constitution §XII)

**Implementation**:
```sql
-- One sequence per character definition
CREATE SEQUENCE char_goldenpuff_seq START 1;

-- On character craft:
INSERT INTO character_instances (serial_number, char_id, owner_id)
VALUES (
  'S1-GPUFF-' || LPAD(nextval('char_goldenpuff_seq')::text, 5, '0'),
  'GPUFF',
  viewer_twitch_id
);
```

**Alternatives considered**:
- UUID: Rejected due to serial number readability requirement
- Global counter: Rejected because serial should be per-character for collectibility

#### 5. Client-Side Animation vs Server Transaction Timing

**Decision**: Execute pull transaction completely server-side first, return results to client, then play animation with known results.

**Rationale**:
- Edge case resolution: "Pull transaction must complete server-side before animation starts"
- Prevents mid-animation interruption issues (viewer closes tab)
- Enables optimistic rollback if transaction fails
- Animations can vary duration (3-4s) without affecting data consistency

**Flow**:
1. Client: POST `/api/pulls` with tier (single/5/10)
2. Server: Deduct currency, roll materials + bonus character, commit to DB, return results
3. Client: Play animation for returned results, update UI after animation completes
4. If animation interrupted: Results already saved, next load shows updated inventory

**Alternatives considered**:
- Optimistic UI updates: Rejected due to rollback complexity and data consistency risk
- Animation-then-commit: Rejected due to FR-040 "commit before feedback"

#### 6. Rate Limiting Strategy

**Decision**: Implement per-viewer rate limiting using in-memory timestamp tracking with Redis-like semantics (or simple Map for MVP).

**Rationale**:
- Spec FR-013 requires "minimum 2 seconds between pull initiations per user"
- In-memory Map sufficient for MVP single-instance deployment
- Key: `viewer_twitch_id`, Value: `last_pull_timestamp`
- Check: `now - last_pull_timestamp >= 2000ms`

**Implementation**:
```typescript
const pullTimestamps = new Map<string, number>();

function canPull(viewerId: string): boolean {
  const lastPull = pullTimestamps.get(viewerId) || 0;
  return Date.now() - lastPull >= 2000;
}
```

**Alternatives considered**:
- Redis: Overkill for MVP, adds deployment complexity
- Database-based: Too slow for rate limit checks (<200ms requirement)
- Token bucket algorithm: Unnecessary complexity for simple 2s cooldown

#### 7. Hardcoded Materials and Recipes

**Decision**: Define materials and recipes as TypeScript constants in `backend/src/lib/recipes.ts`, seeded to database on first run.

**Rationale**:
- Spec scope assumption: "hardcoded for one test channel"
- Simplifies MVP development (no creator dashboard needed)
- Easy to iterate during testing
- Preserves database schema for future multi-tenant migration

**Material definitions** (example):
```typescript
export const MATERIALS = {
  // Common (1 point each)
  FLUFF: { id: 'FLUFF', name: 'Fluff', rarity: 'common', points: 1 },
  DUST: { id: 'DUST', name: 'Cosmic Dust', rarity: 'common', points: 1 },
  // Uncommon (5 points each)
  SPARK: { id: 'SPARK', name: 'Spark', rarity: 'uncommon', points: 5 },
  // Rare (25 points each)
  ESSENCE: { id: 'ESSENCE', name: 'Essence', rarity: 'rare', points: 25 },
  // Legendary (100 points each)
  CORE: { id: 'CORE', name: 'Prism Core', rarity: 'legendary', points: 100 },
};

export const RECIPES = {
  // Common character: ~100 point budget
  PUFF_BASIC: {
    charId: 'GPUFF',
    charName: 'Golden Puff',
    rarity: 'common',
    materials: { FLUFF: 50, DUST: 40, SPARK: 2 }, // = 50 + 40 + 10 = 100
  },
};
```

**Alternatives considered**:
- JSON config files: Rejected due to lack of type safety
- Database-only definitions: Rejected due to migration complexity for MVP

### Research Outputs

**Files generated**: None (research documented inline above)

**Decisions ready for implementation**:
1. ✅ Twitch Extension + SvelteKit static adapter
2. ✅ Client heartbeat (60s) with server-side stream validation
3. ✅ Drizzle ORM + Supabase PostgreSQL
4. ✅ PostgreSQL sequences for serial numbers (per-character)
5. ✅ Server-first transactions, client animations use returned results
6. ✅ In-memory rate limiting (Map-based for MVP)
7. ✅ TypeScript constants for hardcoded materials/recipes

All "NEEDS CLARIFICATION" items from Technical Context resolved.

## Phase 1: Data Model & API Contracts

### Data Model

See [data-model.md](data-model.md) (to be generated)

**Entities**:
1. **Viewers** (Twitch users)
2. **Currencies** (Dust balance per viewer)
3. **Materials** (definitions + inventory quantities)
4. **Recipes** (crafting blueprints)
5. **CharacterDefinitions** (templates)
6. **CharacterInstances** (owned copies with serials)
7. **PullResults** (transaction log)

**Key relationships**:
- Viewer 1:1 Currency balance
- Viewer 1:N MaterialInventory
- Viewer 1:N CharacterInstances
- CharacterInstance N:1 CharacterDefinition
- Recipe N:M Materials (junction table with quantities)

### API Contracts

See [contracts/api.openapi.yaml](contracts/api.openapi.yaml) (to be generated)

**Endpoints**:
- `POST /api/watch-time` - Award currency for watch time heartbeat
- `POST /api/pulls` - Execute pull (single/5/10 tier)
- `POST /api/craft` - Craft character from recipe
- `GET /api/inventory` - Get viewer's complete state (currency, materials, characters)
- `GET /api/recipes` - Get available recipes with viewer's craftability status

**Authentication**: All endpoints require `Authorization: Bearer <twitch_jwt>` header.

### Quickstart Guide

See [quickstart.md](quickstart.md) (to be generated)

**Contents**:
1. Prerequisites (Node.js, Supabase account, Twitch Developer account)
2. Repository setup (clone, install dependencies)
3. Environment configuration (.env setup)
4. Database initialization (run migrations, seed data)
5. Local development (Extension via Developer Rig, Backend via `npm run dev`)
6. Testing flows (complete cycle: watch → earn → pull → craft → collect)

## Next Steps

This plan is complete through Phase 1 (Design & Contracts). Run `/speckit.tasks` to generate Phase 2 (Task Breakdown) with specific implementation tasks derived from this plan and the data model/contracts.

**Remaining artifacts to generate**:
- [ ] `research.md` (consolidated findings from Phase 0)
- [ ] `data-model.md` (entity schemas and relationships)
- [ ] `contracts/api.openapi.yaml` (REST API specification)
- [ ] `contracts/types.ts` (shared TypeScript types)
- [ ] `quickstart.md` (developer onboarding guide)
- [ ] Update `.claude/agent-context.md` or `.cursor/agent-context.md` with technology stack

**After artifacts generated, proceed to**: `/speckit.tasks` for task breakdown
