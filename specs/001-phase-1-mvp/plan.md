# Implementation Plan: Phase 1 MVP - Single-Tenant Gacha Extension

**Branch**: `001-phase-1-mvp` | **Date**: 2025-12-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-phase-1-mvp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a single-tenant Twitch extension MVP implementing a gacha collection system with pull mechanics, crafting, quests, and encounters. The system features:
- Passive currency earning (Dust) while watching streams
- Tiered pull system (single/5/10) with pity mechanics and material quality variants
- Deterministic crafting with point-based recipes
- Community quest system with party formation and state machine lifecycle
- Collaborative encounter mechanics with scaling difficulty
- Character trait system with procedural generation

Technical approach: Monorepo architecture with TypeScript backend API (Hono + Drizzle ORM + PostgreSQL), SvelteKit extension frontend, and shared type definitions. State machines for quest/encounter lifecycle, separate database stacks for material quality, auto-claim reward distribution.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 25.x backend, browser runtime for extension)
**Primary Dependencies**:
- Backend: Hono (API framework), Drizzle ORM (database), PostgreSQL driver, tsx (test runner)
- Frontend: SvelteKit 2.x, Vite, Twitch Extension Helper
- Shared: Shared TypeScript types package
- Workspace: pnpm workspaces (monorepo management)

**Storage**: PostgreSQL with Drizzle ORM for type-safe queries, migrations tracked in backend/src/db/migrations/
**Testing**: tsx for backend unit tests (gacha.test.ts pattern), SvelteKit test integration for frontend
**Target Platform**:
- Frontend: Twitch Extension (panel view, browser environment, 375px minimum width)
- Backend: Node.js server (API endpoints, EventSub webhooks, background jobs)

**Project Type**: Web application (monorepo: backend + frontend/extension + shared)
**Performance Goals**:
- API: <200ms p95 latency for pull/craft operations
- Frontend: <100ms UI response time for inventory updates
- Database: Handle 100+ concurrent users per channel
- Pull animation: 3-4 second maximum duration (configurable to 1-2s)

**Constraints**:
- No cross-channel data transfer (materials are per-channel)
- Twitch TOS compliance (no gambling terminology, no real-money gacha)
- Extension must work in Twitch panel view (limited screen real estate)
- Offline-capable state management (optimistic updates with last-write-wins)
- Rate limiting: 5-minute cooldown between quest creation, max 3 simultaneous quests

**Scale/Scope**:
- Initial scope: Single-tenant (one streamer, their viewers)
- Expected: 50-500 concurrent viewers per channel
- Data: ~11 character types, 15+ material types, 90 functional requirements
- UI: 6 primary views (currency/pull, crafting, inventory, collection, quests, encounters)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Required Principles (from constitution.md v1.4.0)

#### I. Twitch TOS Compliance First
- ✅ No real-money gacha (pulls cost in-game Dust only)
- ✅ No gambling terminology (using "pulls" not "rolls", "crafting" not "loot boxes")
- ✅ Bits purchases are deterministic only (specific characters, not random)
- ✅ Currency earning is passive (watch time) + active (quests/encounters)

#### VII. Monetization & Economy
- ✅ Multi-source currency earning: Passive (Dust per 5min), Quest rewards, Encounter rewards
- ✅ Pity system at 90 pulls with cubic scaling from pull 75-90
- ✅ Material quality system (Low 0.5x, Normal 1.0x, High 2.0x) with deterministic crafting
- ✅ No pay-to-win: Bits purchases are deterministic, cannot bypass progression

#### IX. Character Collection
- ✅ Standardized material budgets per rarity tier
- ✅ Character breakdown returns 30-50% of crafting cost
- ✅ 4-6 materials per tier maximum (prevents bloat)

#### IX-B. Quest & Encounter System
- ✅ Quest tiers: Short (5min), Medium (15-20min), Long (30-45min)
- ✅ Material quality on all rewards (pulls, quests, encounters)
- ✅ Character trait system with procedural generation (deterministic seed)
- ✅ Anti-exploit: 5-min cooldown, 3 quest max, characters locked during deployment

### Quality Gates

| Gate | Status | Notes |
|------|--------|-------|
| Single responsibility | ✅ PASS | Backend handles game logic/storage, frontend handles UI/UX, shared handles types |
| Minimal abstraction | ✅ PASS | Direct DB access via Drizzle (no repository pattern), simple REST API |
| Fail-fast validation | ✅ PASS | Type guards in shared/types.ts, zod validation at API boundaries |
| Explicit state machines | ✅ PASS | Quest/Encounter 4-state lifecycle (PENDING → ACTIVE → SUCCESS/FAILED → CLAIMED) |

### Post-Phase-1 Re-Check
*(To be filled after data-model.md and contracts/ are generated)*

## Project Structure

### Documentation (this feature)

```text
specs/001-phase-1-mvp/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (technology decisions, patterns)
├── data-model.md        # Phase 1 output (entities, schemas, state machines)
├── quickstart.md        # Phase 1 output (developer onboarding)
├── contracts/           # Phase 1 output (API specifications)
│   └── api.openapi.yaml # OpenAPI spec for REST endpoints
└── tasks.md             # Phase 2 output (/speckit.tasks - not yet created)
```

### Source Code (repository root)

```text
# Monorepo structure (pnpm workspaces)
backend/
├── src/
│   ├── api/
│   │   └── handlers.ts        # API route handlers (pull, craft, quest, encounter)
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema definitions
│   │   └── migrations/        # Database migration files
│   ├── lib/
│   │   ├── gacha.ts           # Gacha mechanics (pity, rarity, quality)
│   │   ├── gacha.test.ts      # Statistical validation tests
│   │   ├── recipes.ts         # Material definitions and craft recipes
│   │   ├── rate-limit.ts      # Quest cooldown enforcement
│   │   └── (NEW) traits.ts    # Character trait generation
│   └── index.ts               # Server entry point
└── package.json

extension/ (SvelteKit frontend)
├── src/
│   ├── routes/
│   │   └── +page.svelte       # Main extension view
│   ├── components/
│   │   ├── PullPanel.svelte
│   │   ├── PullResults.svelte
│   │   ├── CraftingView.svelte
│   │   ├── InventoryPanel.svelte
│   │   ├── CollectionPanel.svelte
│   │   ├── CurrencyDisplay.svelte
│   │   └── Toast.svelte
│   └── lib/
│       └── (NEW) api-client.ts # Backend API wrapper
└── package.json

shared/
├── types.ts                    # Shared TypeScript types and constants
└── package.json

# Workspace configuration
pnpm-workspace.yaml
package.json                    # Root workspace config
```

**Structure Decision**: Monorepo with 3 packages (backend, extension, shared) managed via pnpm workspaces. Backend and extension are independently deployable but share type definitions via the shared package. This structure supports:
- Type safety across frontend/backend boundary
- Independent deployment (backend API, extension bundle)
- Shared constants (pull costs, material values, etc.)
- Workspace-level scripts for testing and building

## Complexity Tracking

> No constitutional violations requiring justification. The project follows all constitutional principles and quality gates.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

