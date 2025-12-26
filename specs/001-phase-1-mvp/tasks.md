# Tasks: Phase 1 MVP - Single-Tenant Gacha Extension

**Input**: Design documents from `/specs/001-phase-1-mvp/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not explicitly requested in spec.md, so excluded for MVP speed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**: `backend/src/`, `extension/src/`, `shared/` at repository root
- Paths follow plan.md structure: backend (Hono API), extension (SvelteKit), shared (TypeScript types)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create monorepo structure with pnpm workspaces (backend/, extension/, shared/, pnpm-workspace.yaml, root package.json)
- [ ] T002 Initialize backend package with Hono, Drizzle ORM, PostgreSQL dependencies in backend/package.json
- [ ] T003 Initialize extension package with SvelteKit, TypeScript dependencies in extension/package.json
- [ ] T004 [P] Initialize shared package with TypeScript types in shared/package.json
- [ ] T005 [P] Configure TypeScript strict mode in backend/tsconfig.json, extension/tsconfig.json, shared/tsconfig.json
- [ ] T006 [P] Setup ESLint and Prettier configuration for all packages
- [ ] T007 [P] Create .env.example files with DATABASE_URL, JWT_SECRET placeholders
- [ ] T008 Setup Supabase PostgreSQL connection and verify database access

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create Drizzle schema definitions in backend/src/db/schema.ts (viewers, material_definitions, material_inventory, character_definitions, character_instances, recipes, recipe_materials, pull_results, trait_definitions, quest_zones, quests, quest_participants, encounters, encounter_participants)
- [ ] T010 Generate initial database migration with drizzle-kit in backend/src/db/migrations/
- [ ] T011 [P] Create PostgreSQL ENUM types for quest_state and encounter_state in migration
- [ ] T012 [P] Create serial number generation function in PostgreSQL (generate_serial) for character instances
- [ ] T013 [P] Create sequences for each character type (char_gpuff_seq, char_cbird_seq, etc.) in migration
- [ ] T014 Setup database connection and Drizzle client in backend/src/db/index.ts
- [ ] T015 Create database seeding script in backend/src/db/seed.ts with hardcoded materials and recipes from backend/src/lib/recipes.ts
- [ ] T016 [P] Create shared TypeScript types in shared/types.ts (Viewer, MaterialDefinition, CharacterDefinition, CharacterInstance, Recipe, PullRequest, PullResponse, CraftRequest, etc.)
- [ ] T017 [P] Create Twitch JWT validation middleware in backend/src/middleware/auth.ts
- [ ] T018 [P] Setup Hono API server with CORS and error handling in backend/src/index.ts
- [ ] T019 [P] Create API route structure in backend/src/api/handlers.ts (placeholder functions)
- [ ] T020 [P] Create rate limiting utility in backend/src/lib/rate-limit.ts (in-memory Map for pull cooldowns)
- [ ] T021 [P] Create watch time heartbeat tracking logic in backend/src/lib/watch-time.ts
- [ ] T022 Create SvelteKit extension structure in extension/src/routes/+page.svelte (main view)
- [ ] T023 [P] Create API client wrapper in extension/src/lib/api-client.ts for backend communication
- [ ] T024 [P] Setup SvelteKit adapter-static configuration in extension/svelte.config.js
- [ ] T025 [P] Create extension authentication helper in extension/src/lib/auth.ts (extract JWT from URL fragment)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Passive Currency Earning (Priority: P1) 🎯 MVP

**Goal**: Viewers automatically earn Dust currency while watching streams, enabling participation in the gacha system

**Independent Test**: Load extension while watching a test stream for 5 minutes, verify currency balance increases by 10 Dust. Delivers core value of "rewarding viewership with progression."

### Implementation for User Story 1

- [ ] T026 [US1] Implement POST /api/watch-time endpoint in backend/src/api/handlers.ts (validates JWT, checks stream liveness, awards 2 Dust per heartbeat)
- [ ] T027 [US1] Implement watch time heartbeat client-side timer in extension/src/lib/watch-time.ts (60-second interval, POST to /api/watch-time)
- [ ] T028 [US1] Create CurrencyDisplay component in extension/src/components/CurrencyDisplay.svelte (shows current Dust balance)
- [ ] T029 [US1] Integrate watch time heartbeat into main extension view in extension/src/routes/+page.svelte (start timer on mount)
- [ ] T030 [US1] Add error handling for watch time API failures (graceful degradation, show message to user)
- [ ] T031 [US1] Implement first-time viewer initialization (250 Dust starting balance) in backend/src/api/handlers.ts POST /api/viewer/auth

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Material Pulls (Priority: P1) 🎯 MVP

**Goal**: Viewers can spend Dust to perform pulls that give crafting materials with proper rarity distribution

**Independent Test**: Grant test currency, execute a pull, verify materials are added to inventory with 60% common, 25% uncommon, 12% rare, 3% legendary distribution. Delivers "immediate gacha satisfaction and progression towards goals."

### Implementation for User Story 2

- [ ] T032 [P] [US2] Create gacha mechanics library in backend/src/lib/gacha.ts (rarity distribution, material roll logic)
- [ ] T033 [P] [US2] Create material quality roll logic in backend/src/lib/gacha.ts (Low 50%, Normal 45%, High 5% distribution)
- [ ] T034 [US2] Implement POST /api/pulls endpoint in backend/src/api/handlers.ts (validates currency, rolls materials, deducts Dust, inserts to inventory)
- [ ] T035 [US2] Add pull tier support (single/5/10) with material yield ranges in backend/src/lib/gacha.ts
- [ ] T036 [US2] Implement rate limiting check (2-second cooldown) in POST /api/pulls handler
- [ ] T037 [US2] Create PullPanel component in extension/src/components/PullPanel.svelte (pull tier selection, currency display, pull button)
- [ ] T038 [US2] Create PullResults component in extension/src/components/PullResults.svelte (displays materials received)
- [ ] T039 [US2] Integrate pull UI into main extension view in extension/src/routes/+page.svelte
- [ ] T040 [US2] Add pull transaction logging to pull_results table in backend/src/api/handlers.ts
- [ ] T041 [US2] Implement material inventory upsert logic (quality-separated rows) in backend/src/lib/inventory.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Bonus Character Drops (Priority: P1) 🎯 MVP

**Goal**: Pulls have ~5% chance to drop complete characters directly, creating excitement and unexpected delight

**Independent Test**: Perform pulls and verify approximately 5% result in bonus character drops with 70% common, 20% rare, 8% epic, 2% legendary distribution. Delivers "excitement and unexpected delight" independent of other features.

### Implementation for User Story 3

- [ ] T042 [P] [US3] Create character trait generation library in backend/src/lib/traits.ts (deterministic seed-based, rarity-based trait count)
- [ ] T043 [US3] Add bonus character roll logic to gacha.ts in backend/src/lib/gacha.ts (~5% chance per pull, rarity distribution)
- [ ] T044 [US3] Implement character instance creation with serial number generation in backend/src/lib/characters.ts (uses generate_serial function)
- [ ] T045 [US3] Update POST /api/pulls to include bonus character drops in backend/src/api/handlers.ts (rolls characters, creates instances, returns in response)
- [ ] T046 [US3] Update PullResults component to display bonus characters in extension/src/components/PullResults.svelte (highlight special drops)
- [ ] T047 [US3] Add character serial number display in PullResults component
- [ ] T048 [US3] Update pull_results audit log to include characters_received JSONB field

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Character Crafting (Priority: P1) 🎯 MVP

**Goal**: Viewers can deterministically craft characters using collected materials and recipes

**Independent Test**: Grant test materials matching a recipe, verify successful craft creates character with unique serial number. Delivers "goal-oriented progression and achievement satisfaction."

### Implementation for User Story 4

- [ ] T049 [P] [US4] Create recipes library with hardcoded recipes in backend/src/lib/recipes.ts (materials, point budgets, character definitions)
- [ ] T050 [US4] Implement GET /api/recipes endpoint in backend/src/api/handlers.ts (returns all recipes with craftable status)
- [ ] T051 [US4] Implement recipe craftability check logic in backend/src/lib/recipes.ts (compares inventory to requirements, quality-adjusted points)
- [ ] T052 [US4] Implement POST /api/craft endpoint in backend/src/api/handlers.ts (validates materials, consumes atomically, creates character instance)
- [ ] T053 [US4] Create material consumption logic with quality handling in backend/src/lib/crafting.ts (greedy consume highest quality first, mix qualities to meet point requirements)
- [ ] T054 [US4] Create CraftingView component in extension/src/components/CraftingView.svelte (recipe list, craftable indicators, craft button)
- [ ] T055 [US4] Integrate crafting UI into main extension view in extension/src/routes/+page.svelte
- [ ] T056 [US4] Add craft success animation and character display in CraftingView component
- [ ] T057 [US4] Implement error handling for insufficient materials in POST /api/craft (returns missing materials list)

**Checkpoint**: At this point, User Stories 1-4 should all work independently - core MVP loop complete!

---

## Phase 7: User Story 5 - Collection Viewing (Priority: P2)

**Goal**: Viewers can view their complete character collection with details about each character

**Independent Test**: Grant test characters, verify they display correctly with serial numbers, rarity, and visual effects. Delivers "collection satisfaction and progress visibility."

### Implementation for User Story 5

- [ ] T058 [US5] Update GET /api/inventory endpoint to include characters array in backend/src/api/handlers.ts
- [ ] T059 [US5] Create CollectionPanel component in extension/src/components/CollectionPanel.svelte (grid view of characters)
- [ ] T060 [US5] Add character detail view (serial number, rarity, acquisition method, creation date) in CollectionPanel component
- [ ] T061 [US5] Implement rarity-based visual styling in CollectionPanel component (border colors, particle effects)
- [ ] T062 [US5] Add empty collection state message in CollectionPanel component (guidance for new users)
- [ ] T063 [US5] Add duplicate character handling (show quantity or multiple instances) in CollectionPanel component
- [ ] T064 [US5] Integrate collection view into main extension navigation in extension/src/routes/+page.svelte

**Checkpoint**: At this point, User Stories 1-5 should all work independently

---

## Phase 8: User Story 6 - Inventory Management (Priority: P2)

**Goal**: Viewers can view material inventory and see what they can craft

**Independent Test**: Grant various materials, verify accurate display with quality breakdowns and recipe matching. Delivers "clarity and strategic planning ability."

### Implementation for User Story 6

- [ ] T065 [US6] Update GET /api/inventory endpoint to return quality-aggregated materials in backend/src/api/handlers.ts (consolidated view with breakdown)
- [ ] T066 [US6] Create InventoryPanel component in extension/src/components/InventoryPanel.svelte (material list organized by rarity)
- [ ] T067 [US6] Add material quality breakdown display (hover/click shows Low/Normal/High quantities) in InventoryPanel component
- [ ] T068 [US6] Add material point value display and total points calculation in InventoryPanel component
- [ ] T069 [US6] Add recipe material requirements linking in InventoryPanel component (shows which recipes use each material)
- [ ] T070 [US6] Implement real-time inventory updates after pulls/crafts in InventoryPanel component (optimistic updates)
- [ ] T071 [US6] Integrate inventory view into main extension navigation in extension/src/routes/+page.svelte

**Checkpoint**: At this point, User Stories 1-6 should all work independently

---

## Phase 9: User Story 8 - Quest Deployment & Participation (Priority: P2)

**Goal**: Viewers can deploy characters on quests to gather materials while watching streams

**Independent Test**: Deploy characters on quests, wait for completion, verify material rewards with quality variants. Delivers "active engagement and character utility value."

### Implementation for User Story 8

- [ ] T072 [P] [US8] Create quest state machine logic in backend/src/lib/quests.ts (4-state lifecycle: PENDING → ACTIVE → SUCCESS/FAILED → CLAIMED)
- [ ] T073 [P] [US8] Create quest zone definitions in database seed script (FOREST, CAVE, MOUNTAIN)
- [ ] T074 [US8] Implement POST /api/quests endpoint in backend/src/api/handlers.ts (creates quest in PENDING state, adds leader as participant)
- [ ] T075 [US8] Implement quest success rate calculation in backend/src/lib/quests.ts (Base 60% + Character Traits + Party Size + Watch Time Bonus)
- [ ] T076 [US8] Implement POST /api/quests/{id}/join endpoint in backend/src/api/handlers.ts (adds participant, increases party size, updates success rate)
- [ ] T077 [US8] Implement POST /api/quests/{id}/start endpoint in backend/src/api/handlers.ts (leader force-start, transitions PENDING → ACTIVE)
- [ ] T078 [US8] Create quest completion background job in backend/src/lib/quests.ts (checks active quests, transitions to SUCCESS/FAILED, auto-claims rewards)
- [ ] T079 [US8] Implement quest reward distribution with quality variants in backend/src/lib/quests.ts (Low 60%, Normal 35%, High 5% for quests)
- [ ] T080 [US8] Create QuestPanel component in extension/src/components/QuestPanel.svelte (quest list, deploy characters, join quests)
- [ ] T081 [US8] Add quest invitation overlay display in extension/src/components/QuestInvitation.svelte (silent, no chat spam)
- [ ] T082 [US8] Add quest state display (PENDING party formation, ACTIVE timer, SUCCESS/FAILED outcome) in QuestPanel component
- [ ] T083 [US8] Implement character lock logic (characters cannot be deployed to multiple quests) in backend/src/api/handlers.ts
- [ ] T084 [US8] Implement quest cooldown enforcement (5-minute minimum between creating quests) in backend/src/lib/rate-limit.ts
- [ ] T085 [US8] Add quest reward notification toast in extension/src/components/Toast.svelte (auto-claim notification)

**Checkpoint**: At this point, User Stories 1-6 and 8 should all work independently

---

## Phase 10: User Story 9 - Community Encounters (Priority: P2)

**Goal**: Viewers participate in collaborative boss encounters for better rewards

**Independent Test**: Trigger encounter, have multiple test viewers attack, verify reward distribution based on contribution. Delivers "community engagement and social gameplay."

### Implementation for User Story 9

- [ ] T086 [P] [US9] Create encounter state machine logic in backend/src/lib/encounters.ts (4-state lifecycle: PENDING → ACTIVE → SUCCESS/FAILED → CLAIMED)
- [ ] T087 [US9] Implement encounter difficulty scaling in backend/src/lib/encounters.ts (scales HP with active chat size)
- [ ] T088 [US9] Implement attack power calculation in backend/src/lib/encounters.ts (Character rarity + traits + level)
- [ ] T089 [US9] Implement POST /api/encounters/{id}/attack endpoint in backend/src/api/handlers.ts (deploys character, calculates damage, reduces HP)
- [ ] T090 [US9] Implement encounter defeat detection in backend/src/lib/encounters.ts (current_hp = 0 → SUCCESS, expires_at passed → FAILED)
- [ ] T091 [US9] Implement encounter reward distribution in backend/src/lib/encounters.ts (Low 30%, Normal 50%, High 20% for encounters, MVP bonuses for top 3)
- [ ] T092 [US9] Implement GET /api/encounters endpoint in backend/src/api/handlers.ts (returns active encounters)
- [ ] T093 [US9] Create EncounterPanel component in extension/src/components/EncounterPanel.svelte (active encounter display, attack button, HP bar)
- [ ] T094 [US9] Add encounter spawn notification in extension/src/components/EncounterNotification.svelte
- [ ] T095 [US9] Implement one-attack-per-character constraint in POST /api/encounters/{id}/attack (prevents double-attacking)
- [ ] T096 [US9] Add encounter reward notification with MVP bonuses in Toast component
- [ ] T097 [US9] Create encounter auto-spawn background job in backend/src/lib/encounters.ts (spawns every 2-4 hours, configurable)

**Checkpoint**: At this point, User Stories 1-6, 8, and 9 should all work independently

---

## Phase 11: User Story 10 - Material Quality System (Priority: P2)

**Goal**: Materials have quality variants (Low/Normal/High) that affect crafting efficiency

**Independent Test**: Perform pulls/quests and verify materials drop with quality variants and are correctly tracked. Delivers "strategic depth and optimization gameplay."

### Implementation for User Story 10

- [ ] T098 [US10] Update material inventory schema to support quality column (already in Phase 2, verify implementation)
- [ ] T099 [US10] Update pull material generation to include quality rolls in backend/src/lib/gacha.ts (Low 50%, Normal 45%, High 5%)
- [ ] T100 [US10] Update quest reward generation to include quality rolls in backend/src/lib/quests.ts (Low 60%, Normal 35%, High 5%)
- [ ] T101 [US10] Update encounter reward generation to include quality rolls in backend/src/lib/encounters.ts (Low 30%, Normal 50%, High 20%)
- [ ] T102 [US10] Enforce Legendary materials never drop as Low quality in backend/src/lib/gacha.ts
- [ ] T103 [US10] Update bonus character pull quality bonus (+2% High quality chance) in backend/src/lib/gacha.ts
- [ ] T104 [US10] Update inventory API to return quality-aggregated materials with breakdown in backend/src/api/handlers.ts
- [ ] T105 [US10] Update InventoryPanel to show quality breakdown on hover/click in extension/src/components/InventoryPanel.svelte
- [ ] T106 [US10] Add material quality visual indicators (cracked/damaged for Low, glowing for High) in InventoryPanel component
- [ ] T107 [US10] Update crafting UI to show quality-adjusted point values in extension/src/components/CraftingView.svelte
- [ ] T108 [US10] Add material tooltip with equivalent value conversions in InventoryPanel component (e.g., "8 High = 16 Normal = 32 Low")

**Checkpoint**: At this point, User Stories 1-6, 8-10 should all work independently

---

## Phase 12: User Story 11 - Character Traits System (Priority: P2)

**Goal**: Each character has unique procedural traits that affect gameplay

**Independent Test**: Craft/pull multiple characters and verify traits are assigned, displayed, and affect gameplay mechanics. Delivers "collection variety and strategic optimization."

### Implementation for User Story 11

- [ ] T109 [P] [US11] Create trait definitions seed data in backend/src/db/seed.ts (SCAVENGER, LUCKY_CHARM, WARRIOR, TANK, SPEEDSTER, etc.)
- [ ] T110 [US11] Update character trait generation to use deterministic seeding in backend/src/lib/traits.ts (seedrandom library, composite seed)
- [ ] T111 [US11] Implement trait assignment by rarity in backend/src/lib/traits.ts (Common: 1 trait, Rare: 1-2, Epic: 2, Legendary: 2-3)
- [ ] T112 [US11] Implement trait distribution logic in backend/src/lib/traits.ts (Common: 60% positive, 30% neutral, 10% negative)
- [ ] T113 [US11] Update character instance creation to include trait_seed and traits JSONB in backend/src/lib/characters.ts
- [ ] T114 [US11] Update quest success rate calculation to include trait bonuses in backend/src/lib/quests.ts (e.g., "Scavenger" +10% High Quality)
- [ ] T115 [US11] Update encounter attack power calculation to include trait bonuses in backend/src/lib/encounters.ts (e.g., "Warrior" +50% attack)
- [ ] T116 [US11] Update CollectionPanel to display character traits with tooltips in extension/src/components/CollectionPanel.svelte
- [ ] T117 [US11] Add trait filtering in CollectionPanel component (filter by trait type)
- [ ] T118 [US11] Update QuestPanel to show trait bonuses in real-time in extension/src/components/QuestPanel.svelte
- [ ] T119 [US11] Add trait tooltips explaining mechanical effects in CollectionPanel component

**Checkpoint**: At this point, User Stories 1-6, 8-11 should all work independently

---

## Phase 13: User Story 7 - Pull Animation Experience (Priority: P3)

**Goal**: Engaging visual experience during pulls with 3-4 second animation

**Independent Test**: Perform pulls and observe animation timing and visual feedback. Delivers "emotional engagement and excitement."

### Implementation for User Story 7

- [ ] T120 [US7] Create pull animation sequence in extension/src/components/PullResults.svelte (3-4 second duration, anticipation building)
- [ ] T121 [US7] Add rarity-based visual effects in PullResults component (distinct effects for rare/legendary materials)
- [ ] T122 [US7] Add bonus character special indication in PullResults component (golden flash before reveal)
- [ ] T123 [US7] Add animation speed configuration option in extension/src/lib/settings.ts (future enhancement placeholder)
- [ ] T124 [US7] Optimize animation performance (60fps target) in PullResults component

**Checkpoint**: All user stories should now be independently functional

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T125 [P] Add comprehensive error handling across all API endpoints in backend/src/api/handlers.ts
- [ ] T126 [P] Add request logging and error logging infrastructure in backend/src/lib/logger.ts
- [ ] T127 [P] Add input validation and sanitization for all API requests in backend/src/middleware/validation.ts
- [ ] T128 [P] Add loading states for all async operations in extension components
- [ ] T129 [P] Add mobile viewport responsive design (375px minimum) across all extension components
- [ ] T130 [P] Add navigation between views (currency/pull, crafting, inventory, collection, quests, encounters) in extension/src/routes/+page.svelte
- [ ] T131 [P] Add toast notification system for all user actions in extension/src/components/Toast.svelte
- [ ] T132 [P] Add optimistic UI updates with server sync in extension/src/lib/state.ts
- [ ] T133 [P] Add offline handling (graceful degradation when API unavailable) in extension/src/lib/api-client.ts
- [ ] T134 [P] Add first-time viewer onboarding messaging in extension/src/components/Onboarding.svelte
- [ ] T135 [P] Run quickstart.md validation scenarios
- [ ] T136 [P] Code cleanup and refactoring (remove TODOs, consolidate duplicate logic)
- [ ] T137 [P] Performance optimization (verify <200ms API latency, <100ms UI response)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 for currency system
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Depends on US2 for pull mechanics
- **User Story 4 (P1)**: Can start after Foundational (Phase 2) - Depends on US2 for materials, US3 for character creation
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Depends on US3/US4 for characters
- **User Story 6 (P2)**: Can start after Foundational (Phase 2) - Depends on US2 for materials
- **User Story 8 (P2)**: Can start after Foundational (Phase 2) - Depends on US3/US4 for characters, US10 for quality
- **User Story 9 (P2)**: Can start after Foundational (Phase 2) - Depends on US3/US4 for characters, US11 for traits
- **User Story 10 (P2)**: Can start after Foundational (Phase 2) - Depends on US2 for materials
- **User Story 11 (P2)**: Can start after Foundational (Phase 2) - Depends on US3/US4 for characters
- **User Story 7 (P3)**: Can start after Foundational (Phase 2) - Depends on US2/US3 for pull results

### Within Each User Story

- Models/schema before services
- Services before endpoints
- Backend endpoints before frontend components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 2

```bash
# Launch all parallel tasks for User Story 2 together:
Task: "Create gacha mechanics library in backend/src/lib/gacha.ts"
Task: "Create material quality roll logic in backend/src/lib/gacha.ts"

# Then sequential tasks:
Task: "Implement POST /api/pulls endpoint" (depends on gacha.ts)
Task: "Create PullPanel component" (depends on API endpoint)
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Currency Earning)
4. Complete Phase 4: User Story 2 (Material Pulls)
5. Complete Phase 5: User Story 3 (Bonus Characters)
6. Complete Phase 6: User Story 4 (Crafting)
7. **STOP and VALIDATE**: Test complete MVP loop (watch → earn → pull → craft → collect)
8. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (currency earning works)
3. Add User Story 2 → Test independently → Deploy/Demo (pulls work)
4. Add User Story 3 → Test independently → Deploy/Demo (bonus drops work)
5. Add User Story 4 → Test independently → Deploy/Demo (MVP complete!)
6. Add User Stories 5-6 → Test independently → Deploy/Demo (collection/inventory)
7. Add User Stories 8-11 → Test independently → Deploy/Demo (quests/encounters/quality/traits)
8. Add User Story 7 → Test independently → Deploy/Demo (polish)
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Stories 1-4 (Core MVP loop)
   - Developer B: User Stories 5-6 (Collection/Inventory)
   - Developer C: User Stories 8-11 (Quests/Encounters/Quality/Traits)
3. Stories complete and integrate independently
4. Developer A: User Story 7 (Animation polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Material quality system (US10) affects pulls, quests, and encounters - implement early
- Character traits (US11) affect quests and encounters - implement before those stories
- Quest/Encounter state machines require careful transaction handling - use database ENUMs for safety
