# Implementation Tasks: Phase 1 MVP - Single-Tenant Gacha Extension

**Branch**: `001-phase-1-mvp` | **Generated**: 2025-12-18
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data Model**: [data-model.md](data-model.md)

## Overview

This document breaks down the Phase 1 MVP implementation into discrete, executable tasks organized by user story priority. Each user story represents an independently testable increment of functionality.

**Total Tasks**: 63
**Estimated Duration**: Tasks organized for incremental delivery, MVP viable after Phase 3

---

## Task Legend

- `[P]` = Parallelizable (can be worked on simultaneously with other [P] tasks)
- `[US#]` = User Story number from spec.md
- File paths are relative to repository root

---

## Dependencies Between User Stories

```
Phase 1 (Setup) ────────► Phase 2 (Foundational)
                                  │
                  ┌───────────────┼───────────────┬───────────────┐
                  │               │               │               │
              ┌───▼────┐     ┌────▼────┐     ┌────▼────┐     ┌───▼────┐
              │  US1   │     │  US2+3  │     │   US4   │     │  US5   │
              │ (P1)   │     │  (P1)   │     │  (P1)   │     │  (P2)  │
              └────────┘     └─────────┘     └─────────┘     └────────┘
                                  │               │               │
                              ┌───▼────┐          │               │
                              │  US6   │◄─────────┴───────────────┘
                              │ (P2)   │
                              └────────┘
                                  │
                              ┌───▼────┐
                              │  US7   │
                              │ (P3)   │
                              └────────┘
```

**Story Completion Order**:
1. **Phase 1 & 2** (Setup + Foundational): Must complete before any user stories
2. **US1, US2+3, US4** (P1): Independent, can be implemented in parallel after foundational
3. **US5, US6** (P2): Depend on character/material data existing, but independent of each other
4. **US7** (P3): Polish pass, depends on US2+3 being complete

**MVP Scope**: Phase 1 + Phase 2 + US1 + US2+3 provides minimal viable test (earn currency + pull materials)

---

## Phase 1: Project Setup & Infrastructure

**Goal**: Initialize repository structure, dependencies, and development environment.

**Duration**: ~2-3 hours

### Tasks

- [X] T001 Initialize monorepo structure with pnpm workspaces (extension/, backend/, shared/)
- [X] T002 [P] Create extension/package.json with SvelteKit and dependencies (svelte, @sveltejs/adapter-static, typescript)
- [X] T003 [P] Create backend/package.json with dependencies (drizzle-orm, postgres, @sveltejs/adapter-node)
- [X] T004 [P] Create shared/package.json with TypeScript types only
- [X] T005 Configure TypeScript strict mode in tsconfig.base.json at root
- [X] T006 [P] Configure SvelteKit for extension in extension/svelte.config.js with static adapter
- [X] T007 [P] Configure SvelteKit for backend in backend/svelte.config.js with node adapter
- [X] T008 Create .env.example with required variables (DATABASE_URL, TWITCH_EXTENSION_CLIENT_ID, TWITCH_EXTENSION_SECRET, API_BASE_URL)
- [X] T009 Add .gitignore with node_modules, .env, build/, .svelte-kit/, dist/
- [X] T010 Initialize Git repository and create initial commit

**Validation**: `pnpm install` runs successfully, TypeScript compiles with no errors.

---

## Phase 2: Foundational Layer (Blocking Prerequisites)

**Goal**: Set up database, authentication, and core API infrastructure that all user stories depend on.

**Duration**: ~4-6 hours

### Database Schema

- [X] T011 Create backend/src/db/schema.ts with Drizzle table definitions for viewers
- [X] T012 [P] Add material_definitions table to schema.ts
- [X] T013 [P] Add material_inventory table to schema.ts with unique constraint (viewer_id, material_id)
- [X] T014 [P] Add character_definitions table to schema.ts
- [X] T015 [P] Add character_instances table to schema.ts with unique serial_number
- [X] T016 [P] Add recipes table and recipe_materials junction table to schema.ts
- [X] T017 [P] Add pull_results audit log table to schema.ts
- [X] T018 Configure Drizzle in backend/drizzle.config.ts with Supabase connection string
- [ ] T019 Generate initial migration with `drizzle-kit generate`
- [ ] T020 Create PostgreSQL sequences for serial number generation (one per character) in migration

### Seed Data

- [X] T021 Define hardcoded materials in backend/src/lib/recipes.ts (4-6 per tier: common, uncommon, rare, legendary)
- [X] T022 [P] Define hardcoded character definitions in backend/src/lib/recipes.ts (3 common, 2 rare minimum)
- [X] T023 [P] Define hardcoded recipes in backend/src/lib/recipes.ts with point budgets (common ~100, rare ~500)
- [X] T024 Create backend/src/db/seed.ts to insert materials, characters, recipes, and create sequences
- [ ] T025 Run migration and seed scripts to populate database

### Shared Types

- [X] T026 Copy contracts/types.ts to shared/types.ts
- [X] T027 Export all types from shared/index.ts for workspace imports

### Backend Core

- [X] T028 Create backend/src/lib/auth.ts with JWT validation middleware (verify Twitch signature)
- [X] T029 [P] Create backend/src/lib/db.ts with Drizzle connection setup using DATABASE_URL
- [X] T030 Create backend/src/index.ts as API entry point with CORS configuration
- [X] T031 Add health check endpoint GET /health in backend/src/api/health.ts

### Extension Core

- [X] T032 Create extension/src/lib/api.ts with fetch wrapper for backend calls (includes Authorization header)
- [X] T033 [P] Create extension/src/lib/auth.ts to extract JWT from Twitch URL fragment
- [X] T034 [P] Create extension/src/lib/store.ts with Svelte stores for viewer state (dustBalance, materials, characters)
- [X] T035 Create extension/src/routes/+page.svelte as main panel entry point with navigation tabs

**Validation**:
- Database migrations apply successfully
- Seed data populates correctly (verify with `drizzle-kit studio`)
- Health check endpoint returns 200
- Extension loads in Twitch Developer Rig with JWT extraction working

---

## Phase 3: User Story 1 - Passive Currency Earning (P1)

**Story Goal**: Viewers automatically earn Dust currency while watching streams.

**Independent Test**: Viewer opens extension → Wait 5 minutes (or trigger heartbeats manually) → Currency balance increases from 250 to 260.

**Acceptance Criteria** (from spec.md):
- ✅ Viewer's currency balance increases by 10 Dust per 5 minutes of watch time
- ✅ Currency persists across sessions
- ✅ First-time viewers start with 250 Dust and see explanation of earning

### Tasks

#### Backend

- [ ] T036 [P] [US1] Implement POST /api/watch-time endpoint in backend/src/api/watch-time.ts
- [ ] T037 [US1] Add Twitch Helix API client in backend/src/lib/twitch.ts for stream validation (check if stream is live)
- [ ] T038 [US1] Implement watch time validation logic: verify JWT, check stream live, check last heartbeat timestamp
- [ ] T039 [US1] Update viewers.dust_balance in database (atomic increment by 2 Dust per heartbeat)
- [ ] T040 [US1] Update viewers.last_watch_heartbeat timestamp

#### Extension

- [ ] T041 [P] [US1] Create extension/src/components/CurrencyDisplay.svelte showing Dust balance with icon
- [ ] T042 [US1] Implement 60-second heartbeat interval in extension/src/lib/watch-time.ts (POST /api/watch-time every 60s)
- [ ] T043 [US1] Add heartbeat auto-start on extension load in extension/src/routes/+page.svelte
- [ ] T044 [US1] Display earning explanation for first-time viewers (detect dustBalance === 250 and no heartbeat timestamp)

**Parallel Opportunities**: T036 (backend) and T041 (UI) can be worked simultaneously.

---

## Phase 4: User Stories 2 & 3 - Pull Mechanics with Bonus Characters (P1)

**Story Goal**: Viewers can perform tiered pulls (single/5/10) that produce materials and may produce bonus characters.

**Independent Test**:
- Viewer with 250 Dust → Performs 5-pull → Receives 10-20 materials distributed by rarity → May receive 0-5 bonus characters → Balance updates to 25 Dust.

**Acceptance Criteria** (from spec.md US2 + US3):
- ✅ Three pull tiers: Single (50 Dust, 1-3 materials), 5-Pull (225 Dust, 10-20 materials), 10-Pull (400 Dust, up to 50 materials)
- ✅ Material rarity distribution: 60% common, 25% uncommon, 12% rare, 3% legendary
- ✅ ~5% chance per pull for bonus character drop
- ✅ Bonus character rarity: 70% common, 20% rare, 8% epic, 2% legendary
- ✅ Pull results persist immediately (server-first transaction)
- ✅ Rate limiting: minimum 2 seconds between pulls

### Tasks

#### Backend - Gacha Logic

- [ ] T045 [P] [US2] Create backend/src/lib/gacha.ts with material rarity roll function (weighted random: 60/25/12/3)
- [ ] T046 [P] [US2] Implement bonus character roll function in gacha.ts (~5% chance, then 70/20/8/2 rarity distribution)
- [ ] T047 [P] [US2] Implement serial number generation function using generate_serial(char_id) PostgreSQL function
- [ ] T048 [P] [US2] Create rate limiter in backend/src/lib/rate-limit.ts (in-memory Map tracking last pull timestamp per viewer)

#### Backend - Pull Endpoint

- [ ] T049 [US2] Implement POST /api/pulls endpoint in backend/src/api/pulls.ts
- [ ] T050 [US2] Validate pull tier parameter (single, '5', '10') and map to cost (50, 225, 400)
- [ ] T051 [US2] Check rate limit (2 seconds since last pull for this viewer)
- [ ] T052 [US2] Check sufficient Dust balance
- [ ] T053 [US2] Begin database transaction
- [ ] T054 [US2] Deduct Dust from viewers.dust_balance
- [ ] T055 [US2] Roll materials (1-3 for single, 10-20 for 5-pull, up to 50 for 10-pull)
- [ ] T056 [US2] Roll bonus characters (1 chance for single, 5 chances for 5-pull, 10 chances for 10-pull)
- [ ] T057 [US2] Batch upsert materials to material_inventory (INSERT ... ON CONFLICT DO UPDATE)
- [ ] T058 [US2] Insert any bonus characters to character_instances with serial numbers
- [ ] T059 [US2] Insert pull_results audit log entry (materials and characters as JSONB)
- [ ] T060 [US2] Commit transaction and return results (newBalance, materials array, characters array)
- [ ] T061 [US2] Handle error cases: insufficient Dust (402), rate limited (429), invalid tier (400)

#### Extension - Pull UI

- [ ] T062 [P] [US2] Create extension/src/components/PullView.svelte with three tier buttons (Single/5-Pull/10-Pull)
- [ ] T063 [P] [US2] Display Dust cost for each tier on buttons
- [ ] T064 [P] [US2] Disable pull buttons when insufficient Dust or rate limited
- [ ] T065 [US2] Implement pull action: POST /api/pulls with selected tier
- [ ] T066 [US2] Show loading state during pull request
- [ ] T067 [US2] Play pull animation with results (3-4 second duration, reveal materials/characters)
- [ ] T068 [US2] Update dustBalance store after pull completes
- [ ] T069 [US2] Update materials store with received materials (merge quantities)
- [ ] T070 [US2] Update characters store with any bonus characters
- [ ] T071 [US2] Handle error states: show toast/notification for insufficient Dust or rate limit

**Parallel Opportunities**: T045-T048 (gacha logic) can be built while T062-T064 (UI) are being created.

---

## Phase 5: User Story 4 - Character Crafting (P1)

**Story Goal**: Viewers can craft characters using collected materials and recipes.

**Independent Test**:
- Viewer with materials (50 FLUFF, 40 DUST, 2 SPARK) → Views recipes → Golden Puff shows as craftable → Crafts → Receives character with serial S1-GPUFF-00001 → Materials deducted.

**Acceptance Criteria** (from spec.md):
- ✅ Recipes show required materials vs owned
- ✅ Crafting consumes materials atomically
- ✅ Crafted character receives unique serial number
- ✅ Character appears in collection immediately
- ✅ Cannot craft without sufficient materials

### Tasks

#### Backend - Recipes Endpoint

- [ ] T072 [P] [US4] Implement GET /api/recipes endpoint in backend/src/api/recipes.ts
- [ ] T073 [US4] Query all recipes with material requirements from recipe_materials junction table
- [ ] T074 [US4] Join with viewer's material_inventory to calculate owned vs required
- [ ] T075 [US4] Return recipe list with craftable boolean (true if all materials owned >= required)

#### Backend - Craft Endpoint

- [ ] T076 [US4] Implement POST /api/craft endpoint in backend/src/api/crafting.ts
- [ ] T077 [US4] Validate recipeId parameter exists
- [ ] T078 [US4] Load recipe material requirements from database
- [ ] T079 [US4] Check viewer has sufficient materials for all requirements
- [ ] T080 [US4] Begin database transaction
- [ ] T081 [US4] Deduct materials from material_inventory (UPDATE ... SET quantity = quantity - ?)
- [ ] T082 [US4] Generate serial number for character using generate_serial(char_id)
- [ ] T083 [US4] Insert character_instances with serial, char_id, owner_id, acquisition_method='craft'
- [ ] T084 [US4] Commit transaction and return character instance + updated material inventory
- [ ] T085 [US4] Handle insufficient materials error (402 with missing materials listed)

#### Extension - Crafting UI

- [ ] T086 [P] [US4] Create extension/src/components/CraftingView.svelte displaying recipe list
- [ ] T087 [P] [US4] Create extension/src/components/RecipeCard.svelte showing character, required materials, craftable status
- [ ] T088 [US4] Fetch recipes on view load (GET /api/recipes)
- [ ] T089 [US4] Highlight craftable recipes (green border or "Craft" button enabled)
- [ ] T090 [US4] Show material progress bars (owned / required) for each recipe
- [ ] T091 [US4] Implement craft action: POST /api/craft with recipeId
- [ ] T092 [US4] Show crafting animation (2-3 seconds, reveal character with serial number)
- [ ] T093 [US4] Update materials and characters stores after craft
- [ ] T094 [US4] Handle insufficient materials error (show which materials are missing)

**Parallel Opportunities**: T072-T075 (recipes endpoint) and T086-T087 (UI components) can be built in parallel.

---

## Phase 6: User Story 5 - Collection Viewing (P2)

**Story Goal**: Viewers can view their complete character collection with details.

**Independent Test**:
- Viewer with 3 characters → Opens collection view → Sees all 3 characters with serials, rarities, dates → Can sort by rarity or date.

**Acceptance Criteria** (from spec.md):
- ✅ Collection displays all owned characters
- ✅ Shows name, rarity, serial number, creation date
- ✅ Sortable by rarity and creation date
- ✅ Duplicate characters shown with quantities
- ✅ Empty state shows helpful guidance

### Tasks

#### Extension - Collection UI

- [ ] T095 [P] [US5] Create extension/src/components/CollectionView.svelte with character grid layout
- [ ] T096 [P] [US5] Create extension/src/components/shared/CharacterCard.svelte displaying character with rarity styling
- [ ] T097 [US5] Fetch viewer inventory on view load to get characters (GET /api/inventory)
- [ ] T098 [US5] Display character details: name, rarity (with color-coded border), serial number, creation date
- [ ] T099 [US5] Implement sort dropdown (by rarity, by date acquired)
- [ ] T100 [US5] Apply rarity-appropriate visual styling (common=gray border, rare=blue, epic=purple, legendary=gold)
- [ ] T101 [US5] Show duplicate count if viewer owns multiple copies of same character
- [ ] T102 [US5] Display empty state when collection is empty ("Craft or pull your first character!")

**Parallel Opportunities**: T095-T096 (UI components) independent of backend (uses existing /api/inventory).

---

## Phase 7: User Story 6 - Inventory Management (P2)

**Story Goal**: Viewers can view their material inventory and see what they can craft.

**Independent Test**:
- Viewer with materials (FLUFF: 50, DUST: 40, SPARK: 2) → Opens inventory → Sees materials organized by rarity → Clicks material → Shows recipes using that material.

**Acceptance Criteria** (from spec.md):
- ✅ Inventory shows all materials with quantities
- ✅ Materials organized by rarity tier
- ✅ Selecting material shows which recipes use it
- ✅ Recipes sorted by craftable first
- ✅ Real-time updates after pulls

### Tasks

#### Extension - Inventory UI

- [ ] T103 [P] [US6] Create extension/src/components/InventoryView.svelte with material grid by rarity
- [ ] T104 [P] [US6] Create extension/src/components/shared/MaterialCard.svelte showing material icon, name, quantity, rarity
- [ ] T105 [US6] Fetch viewer inventory on view load (GET /api/inventory) for materials
- [ ] T106 [US6] Group materials by rarity tier (Legendary → Rare → Uncommon → Common sections)
- [ ] T107 [US6] Apply rarity-appropriate visual styling to material cards
- [ ] T108 [US6] Implement material selection → show modal/panel with recipes using that material
- [ ] T109 [US6] In recipe panel, sort recipes by craftable status (craftable first, then by rarity)
- [ ] T110 [US6] Listen to materials store updates and refresh display in real-time

**Parallel Opportunities**: T103-T104 (UI components) independent of backend (uses existing /api/inventory).

---

## Phase 8: User Story 7 - Pull Animation Polish (P3)

**Story Goal**: Pull animations feel exciting and rewarding with rarity-appropriate visual effects.

**Independent Test**:
- Viewer performs pull → Animation lasts 3-4 seconds → Rarity is immediately apparent from visual effects → Bonus character reveal has special animation.

**Acceptance Criteria** (from spec.md):
- ✅ Pull animation completes in 3-4 seconds
- ✅ Rare/legendary materials have distinct visual effects
- ✅ Bonus character drops have special indication
- ✅ Animation duration configurable by viewer (future: 1-2s fast mode)

### Tasks

#### Extension - Animation Polish

- [ ] T111 [P] [US7] Create extension/src/lib/animations.ts with pull animation sequencing logic
- [ ] T112 [P] [US7] Implement material reveal animation (fade-in with rarity-based particle effects)
- [ ] T113 [P] [US7] Add rarity visual effects: common (none), uncommon (shimmer), rare (sparkle), legendary (rainbow glow)
- [ ] T114 [US7] Implement bonus character reveal animation (special burst effect before showing character)
- [ ] T115 [US7] Add sound effects placeholders (can be muted for MVP, actual audio deferred)
- [ ] T116 [US7] Implement animation skip button (click to reveal results immediately)
- [ ] T117 [US7] Tune animation timing to 3-4 seconds total (reveal materials first, then any bonus characters)
- [ ] T118 [US7] Test animations at 60fps target (use CSS transforms/opacity for GPU acceleration)

**Parallel Opportunities**: All animation tasks can be worked on simultaneously as they're mostly independent visual polish.

---

## Phase 9: Final Integration & Polish

**Goal**: Cross-cutting concerns, error handling, mobile responsiveness, and final testing.

**Duration**: ~2-3 hours

### Tasks

#### Error Handling

- [ ] T119 [P] Add global error boundary in extension/src/routes/+layout.svelte
- [ ] T120 [P] Implement toast/notification component in extension/src/components/shared/Toast.svelte
- [ ] T121 Add error logging to backend (console.error with request ID for debugging)

#### Mobile Responsiveness

- [ ] T122 [P] Test extension in Developer Rig at 375px width (mobile viewport)
- [ ] T123 Adjust PullView button layout for mobile (stack vertically if needed)
- [ ] T124 Adjust CollectionView grid to 2 columns on mobile
- [ ] T125 Test all views on mobile Twitch app (if accessible)

#### Performance

- [ ] T126 [P] Add loading skeletons to all views (prevent layout shift)
- [ ] T127 Optimize collection view for 100 characters (virtualization if needed)
- [ ] T128 Bundle size check: ensure extension build <100KB gzipped

#### Documentation

- [ ] T129 [P] Update README.md with setup instructions (link to quickstart.md)
- [ ] T130 Create .env.example with all required variables and comments

#### Final Validation

- [ ] T131 Complete end-to-end test: watch → earn → pull → craft → collect (manual)
- [ ] T132 Test in Twitch Developer Rig with real stream (stream must be live for watch time)
- [ ] T133 Verify pull rarity distribution over 100 pulls (should be within ±2% of spec)
- [ ] T134 Verify bonus character drop rate over 100 pulls (should be ~5% ±1%)
- [ ] T135 Test rate limiting (pulls blocked for 2 seconds)
- [ ] T136 Test concurrent sessions (open in two tabs, verify last-write-wins)

---

## Implementation Strategy

### MVP Delivery (Fastest Path to Testing)

**Recommended MVP**: Phase 1 + Phase 2 + Phase 3 (US1) + Phase 4 (US2+3)

This provides:
- ✅ Currency earning from watching
- ✅ Pull mechanic with materials and bonus characters
- ✅ Database persistence
- ✅ Core engagement loop testable

**Estimated Time**: ~10-12 hours of focused development

**Next Increment**: Add Phase 5 (US4 - Crafting)
- Enables complete cycle: earn → pull → craft
- Tests recipe point budget system

**Final Increment**: Add Phases 6-9 (Collection, Inventory, Polish)
- UI completeness
- User experience polish

### Parallel Execution Opportunities

#### Setup Phase (4 parallel tracks)
- Track A: Backend package setup (T002-T007)
- Track B: Database schema (T011-T020)
- Track C: Seed data (T021-T025)
- Track D: Shared types (T026-T027)

#### User Story 1 (2 parallel tracks)
- Track A: Backend API (T036-T040)
- Track B: Extension UI (T041-T044)

#### User Story 2+3 (3 parallel tracks)
- Track A: Gacha logic (T045-T048)
- Track B: Pull endpoint (T049-T061)
- Track C: Pull UI (T062-T071)

#### User Story 4 (2 parallel tracks)
- Track A: Backend endpoints (T072-T085)
- Track B: Crafting UI (T086-T094)

### Testing Strategy (Manual for MVP)

**Per User Story Testing**:
1. **US1**: Send heartbeat requests via Postman → Verify Dust increases → Check persistence across sessions
2. **US2+3**: Perform 100 pulls via UI → Verify rarity distribution (60/25/12/3) → Check bonus character rate (~5%)
3. **US4**: Craft character → Verify materials deducted → Check serial number uniqueness
4. **US5**: View collection → Verify all characters displayed → Test sorting
5. **US6**: View inventory → Verify material counts → Test recipe lookup
6. **US7**: Perform pulls → Verify animation timing (3-4s) → Check visual effects

**Integration Testing**:
- Complete cycle: Open extension → Watch for 5 min → Earn 10 Dust → Perform 5-pull → Receive materials → Craft character → View collection
- Concurrent sessions: Open two tabs → Perform actions → Verify last-write-wins
- Error scenarios: Insufficient Dust → Rate limiting → Stream offline

---

## Task Summary

**Total Tasks**: 136
**Breakdown by Phase**:
- Phase 1 (Setup): 10 tasks
- Phase 2 (Foundational): 25 tasks
- Phase 3 (US1): 9 tasks
- Phase 4 (US2+3): 27 tasks
- Phase 5 (US4): 23 tasks
- Phase 6 (US5): 8 tasks
- Phase 7 (US6): 8 tasks
- Phase 8 (US7): 8 tasks
- Phase 9 (Polish): 18 tasks

**Parallelizable Tasks**: 48 (35% of total)

**MVP Scope**: 71 tasks (Phase 1-4)
**Full Implementation**: 136 tasks

---

## Next Steps

1. **Start with Setup**: Complete Phase 1 (T001-T010) to initialize repository
2. **Build Foundation**: Complete Phase 2 (T011-T035) for shared infrastructure
3. **Implement MVP**: Tackle US1 (currency earning) and US2+3 (pulls) for core loop
4. **Iterate**: Add crafting (US4), then viewing features (US5-6), then polish (US7)
5. **Test Continuously**: Validate each user story independently as you complete it

**Ready to start?** Begin with T001 and work sequentially through each phase!
