# Quickstart Guide: Phase 1 MVP Development

**Feature**: Phase 1 MVP - Single-Tenant Gacha Extension
**Date**: 2025-12-19 (Updated)
**Target Audience**: Developers setting up local development environment

## Overview

This guide walks through setting up the Phase 1 MVP from scratch. By the end, you'll have:
- ✅ Local Twitch extension running in Developer Rig
- ✅ Backend API server connected to PostgreSQL database
- ✅ Complete test cycle: pull → craft → collect → quest → encounter
- ✅ Material quality system (Low/Normal/High multipliers)
- ✅ Character trait generation (deterministic seeding)
- ✅ Quest party formation with 4-state lifecycle
- ✅ Collaborative encounter mechanics with MVP rewards

**Estimated setup time**: 30-45 minutes

---

## Prerequisites

### Required Software
- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+ (or npm/yarn, but pnpm preferred for monorepo)
- **Git** for version control
- **PostgreSQL** client tools (optional, for direct DB access)

### Required Accounts
1. **Twitch Developer Account**: https://dev.twitch.tv/
   - Create extension in Extensions Console
   - Get Extension Client ID and Secret
2. **Supabase Account**: https://supabase.com/
   - Create new project
   - Get Database URL and API keys

### Recommended Tools
- **Twitch Extensions Developer Rig**: https://dev.twitch.tv/docs/extensions/rig
  - Desktop app for local extension testing
  - Generates mock JWT tokens for development
- **Postman** or **Thunder Client** (VS Code): For API testing
- **DBeaver** or **pgAdmin**: For database inspection

---

## Step 1: Clone Repository

```bash
git clone https://github.com/your-org/project-puff.git
cd project-puff

# Checkout the feature branch
git checkout 001-phase-1-mvp
```

---

## Step 2: Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# This installs:
# - extension/ (SvelteKit frontend)
# - backend/ (API server)
# - shared/ (TypeScript types)
```

---

## Step 3: Configure Environment Variables

### Create `.env` file in project root:

```bash
cp .env.example .env
```

### Fill in the following values:

```env
# =============================================================================
# Database (Supabase)
# =============================================================================
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres

# =============================================================================
# Twitch Extension
# =============================================================================
TWITCH_EXTENSION_CLIENT_ID=your_extension_client_id
TWITCH_EXTENSION_SECRET=your_extension_secret_base64

# =============================================================================
# API Configuration
# =============================================================================
API_BASE_URL=http://localhost:3000  # Backend API URL
CORS_ORIGIN=http://localhost:8080   # Extension Dev Rig origin

# =============================================================================
# Development Mode
# =============================================================================
NODE_ENV=development
LOG_LEVEL=debug
```

### Get Supabase Database URL:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → Database → Connection string (URI)
4. Copy and replace `[PASSWORD]` with your database password

### Get Twitch Extension Credentials:
1. Go to https://dev.twitch.tv/console/extensions
2. Create new extension or select existing
3. Copy Client ID
4. Generate and copy Secret (Base64 encoded)

---

## Step 4: Database Setup

### Run Migrations

```bash
# Navigate to backend directory
cd backend

# Generate migration from Drizzle schema
pnpm drizzle-kit generate

# Apply migrations to database
pnpm drizzle-kit migrate

# Seed hardcoded materials, characters, and recipes
pnpm run seed
```

### Verify Database Setup

```bash
# Connect to database (requires psql)
psql $DATABASE_URL

# Check tables exist
\dt

# Verify seed data
SELECT * FROM material_definitions;
SELECT * FROM character_definitions;
SELECT * FROM recipes;

# Exit
\q
```

Expected tables:
- `viewers`
- `material_definitions`
- `material_inventory` (with `quality` column: 'low'|'normal'|'high')
- `character_definitions`
- `character_instances` (with `trait_seed` and `traits` columns)
- `recipes`
- `recipe_materials`
- `pull_results`
- **2025-12-19 additions:**
  - `trait_definitions` (procedural trait pool)
  - `quest_zones` (system-managed zones)
  - `quests` (4-state lifecycle)
  - `quest_participants` (junction table)
  - `encounters` (collaborative boss fights)
  - `encounter_participants` (attack tracking)

---

## Step 5: Start Backend API

```bash
# From backend/ directory
pnpm run dev

# Server starts on http://localhost:3000
# Watch mode enabled (auto-restarts on code changes)
```

### Test API Endpoints

```bash
# Health check (no auth required)
curl http://localhost:3000/health

# Test inventory endpoint (requires JWT, will fail for now)
curl -H "Authorization: Bearer fake_jwt_token" \
  http://localhost:3000/api/inventory
```

---

## Step 6: Start Extension Frontend

```bash
# From extension/ directory (new terminal)
pnpm run dev

# Extension builds to extension/build/
# Served on http://localhost:5173 (Vite dev server)
```

---

## Step 7: Configure Twitch Developer Rig

### Install Developer Rig
Download from: https://dev.twitch.tv/docs/extensions/rig

### Add Extension to Rig
1. Open Developer Rig
2. "Add Extension" → Enter your Extension Client ID
3. Extension appears in left sidebar

### Configure Extension Settings
1. Select your extension
2. "Extension Views" → "Panel"
3. Panel Type: "Panel"
4. Panel Height: 300px (adjustable)

### Configure Local Assets
1. "Asset Hosting" → "Local Mode"
2. Frontend Files Path: `/path/to/project-puff/extension/build`
3. Or use Vite dev server: `http://localhost:5173`

### Generate Test JWT
1. "Identity Options" → "Viewer"
2. User ID: `test_viewer_123`
3. Channel ID: `test_channel_456`
4. Role: `viewer`
5. Copy generated JWT token

---

## Step 8: Test Complete Flow

### 1. Initial Load (Extension)
- Open extension in Developer Rig
- Should see:
  - Currency balance: 250 Dust
  - Pull options (Single/5-Pull/10-Pull)
  - Empty collection message
  - Empty material inventory

### 2. Test Watch Time Currency Earning
```bash
# Simulate heartbeat from extension (using test JWT)
curl -X POST http://localhost:3000/api/watch-time \
  -H "Authorization: Bearer $TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"channelId": "test_channel_456"}'

# Response:
# { "success": true, "newBalance": 252, "awarded": 2 }
```

### 3. Test Pull (5-Pull)
```bash
curl -X POST http://localhost:3000/api/pulls \
  -H "Authorization: Bearer $TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"tier": "5"}'

# Response:
# {
#   "success": true,
#   "newBalance": 25,
#   "materials": [
#     {"materialId": "FLUFF", "name": "Fluff", "rarity": "common", "quantity": 8},
#     {"materialId": "SPARK", "name": "Spark", "rarity": "uncommon", "quantity": 2},
#     ...
#   ],
#   "characters": [] // or bonus character if lucky
# }
```

### 4. Check Inventory
```bash
curl http://localhost:3000/api/inventory \
  -H "Authorization: Bearer $TEST_JWT"

# Response shows updated materials and balance
```

### 5. Check Recipes
```bash
curl http://localhost:3000/api/recipes \
  -H "Authorization: Bearer $TEST_JWT"

# Response shows craftable recipes based on inventory
# "craftable": true if viewer has all materials
```

### 6. Test Crafting
```bash
# Craft Golden Puff (requires 50 FLUFF, 40 DUST, 2 SPARK)
curl -X POST http://localhost:3000/api/craft \
  -H "Authorization: Bearer $TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"recipeId": "RECIPE_GPUFF"}'

# Response:
# {
#   "success": true,
#   "character": {
#     "serialNumber": "S1-GPUFF-00001",
#     "charId": "GPUFF",
#     "name": "Golden Puff",
#     "rarity": "common",
#     "acquisitionMethod": "craft",
#     "createdAt": "2025-12-18T14:30:00Z"
#   },
#   "remainingMaterials": [...]
# }
```

### 7. Verify in Extension
- Reload extension in Developer Rig
- Character should appear in collection with traits
- Material counts updated (quality breakdown on hover)
- Currency balance updated

### 8. Test Quest Creation (2025-12-19)
```bash
# Create a new quest in PENDING state
curl -X POST http://localhost:3000/api/quests \
  -H "Authorization: Bearer $TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "zoneId": "FOREST",
    "tier": "medium",
    "characterId": 1
  }'

# Response:
# {
#   "id": 1,
#   "zoneId": "FOREST",
#   "zoneName": "Enchanted Forest",
#   "tier": "medium",
#   "state": "PENDING",
#   "partySize": 1,
#   "maxPartySize": 3,
#   "pendingExpiresAt": "2025-12-19T12:31:00Z",
#   "participants": [...]
# }
```

### 9. Test Quest Joining
```bash
# Another viewer joins the quest (use different JWT)
curl -X POST http://localhost:3000/api/quests/1/join \
  -H "Authorization: Bearer $TEST_JWT_VIEWER_2" \
  -H "Content-Type: application/json" \
  -d '{"characterId": 2}'

# Quest auto-starts when timer expires or leader force-starts
curl -X POST http://localhost:3000/api/quests/1/start \
  -H "Authorization: Bearer $TEST_JWT" # Leader only
```

### 10. Test Encounter Attack (2025-12-19)
```bash
# Get active encounters
curl http://localhost:3000/api/encounters/active \
  -H "Authorization: Bearer $TEST_JWT"

# Attack encounter
curl -X POST http://localhost:3000/api/encounters/1/attack \
  -H "Authorization: Bearer $TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"characterId": 1}'

# Response:
# {
#   "damage": 35,
#   "currentHp": 120,
#   "state": "ACTIVE",
#   "rewards": null  // Present when state=SUCCESS
# }

# When encounter is defeated, rewards auto-claim:
# {
#   "damage": 35,
#   "currentHp": 0,
#   "state": "SUCCESS",
#   "rewards": {
#     "materials": [
#       {"materialId": "ESSENCE", "quantity": 5, "quality": "high"}
#     ],
#     "mvpBonus": true
#   }
# }
```

---

## Step 9: Development Workflow

### File Structure for Common Tasks

```
# Extension frontend work (UI components)
extension/src/components/
├── PullPanel.svelte
├── CraftingView.svelte
├── InventoryPanel.svelte  # Shows quality breakdown on hover
├── CollectionPanel.svelte  # Displays character traits
├── QuestBoard.svelte       # 2025-12-19: Quest creation/joining
└── EncounterView.svelte    # 2025-12-19: Collaborative attacks

# Backend API endpoints
backend/src/api/handlers.ts
├── POST /api/pull           # Material quality assignment
├── POST /api/craft          # Trait generation
├── POST /api/quests         # 2025-12-19: Quest creation
├── POST /api/quests/:id/join
├── POST /api/quests/:id/start
└── POST /api/encounters/:id/attack

# Database schema changes
backend/src/db/schema.ts → run `drizzle-kit generate`

# Shared types (used by both)
shared/types.ts

# Game logic libraries
backend/src/lib/
├── gacha.ts           # Pull mechanics, pity system
├── recipes.ts         # Material/character definitions
├── rate-limit.ts      # Quest cooldown (5-min)
└── traits.ts          # 2025-12-19: Deterministic trait generation (seedrandom)
```

### Common Commands

```bash
# Backend
cd backend
pnpm run dev            # Start dev server
pnpm run build          # Build for production
pnpm run lint           # Check TypeScript errors
pnpm drizzle-kit studio # Open database GUI

# Extension
cd extension
pnpm run dev            # Start Vite dev server
pnpm run build          # Build for Twitch hosting
pnpm run preview        # Preview production build

# Database
pnpm run db:generate    # Generate migration from schema
pnpm run db:migrate     # Apply migrations
pnpm run db:seed        # Re-seed test data
```

### Hot Reload Behavior
- **Backend**: Auto-restarts on file changes (nodemon)
- **Extension**: Hot module replacement (HMR) via Vite
- **Database schema**: Requires manual migration generation + migration

---

## Troubleshooting

### Issue: Extension not loading in Developer Rig
**Solution**:
- Check Developer Rig console for errors
- Verify extension build directory path is correct
- Try clearing Rig cache: Settings → Clear Cache

### Issue: JWT validation failing
**Solution**:
- Ensure `TWITCH_EXTENSION_SECRET` in `.env` matches console
- Check JWT expiration (tokens expire after 24 hours in dev)
- Verify Authorization header format: `Bearer <token>`

### Issue: Database connection fails
**Solution**:
- Verify `DATABASE_URL` is correct (no spaces, correct password)
- Check Supabase project is active (free tier auto-pauses after inactivity)
- Test connection: `psql $DATABASE_URL`

### Issue: CORS errors
**Solution**:
- Check `CORS_ORIGIN` in `.env` matches Developer Rig origin
- Backend logs should show allowed origins
- Add additional origins if testing from different ports

### Issue: Pull rarity distribution seems wrong
**Solution**:
- Randomness requires large sample size (run 100+ pulls)
- Expected variance: ±2% per spec (58-62% common over 1000 pulls)
- Check `backend/src/lib/gacha.ts` for distribution logic

---

## Next Steps

### For Development
1. **Read the spec**: `specs/001-phase-1-mvp/spec.md`
2. **Review data model**: `specs/001-phase-1-mvp/data-model.md`
3. **Check API contract**: `specs/001-phase-1-mvp/contracts/api.openapi.yaml`
4. **Run `/speckit.tasks`** to generate implementation task breakdown

### For Testing
1. Test complete user flow in extension UI
2. Verify pull animations (3-4 seconds)
3. Test mobile viewport (resize Developer Rig to 375px width)
4. Verify rate limiting (2-second pull cooldown)
5. Test edge cases from spec (mid-pull interruption, insufficient currency, etc.)

### For Deployment
1. **Backend**: Deploy to Vercel or Railway
   - Set environment variables in dashboard
   - Update `API_BASE_URL` for production
2. **Extension**: Submit to Twitch for review
   - Build production assets: `pnpm run build`
   - Upload to Twitch Extensions Console
   - Test on hosted version before public release

---

## Resources

- **Twitch Extensions Docs**: https://dev.twitch.tv/docs/extensions
- **SvelteKit Docs**: https://kit.svelte.dev/docs
- **Drizzle ORM Docs**: https://orm.drizzle.team/docs/overview
- **Supabase Docs**: https://supabase.com/docs

---

## Support

**Issues**: File bugs in GitHub repository
**Questions**: Check project documentation in `specs/` directory
**Constitution**: Read `.specify/memory/constitution.md` for design principles

---

**Ready to build?** Start coding and refer to `/speckit.tasks` for the structured implementation plan!
