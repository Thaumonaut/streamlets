# Agent Context: Streamlets (project-puff)

**Last Updated**: 2025-12-18 (via `/speckit.plan`)
**Current Feature**: Phase 1 MVP - Single-Tenant Gacha Extension

## Project Overview

Streamlets is a Twitch extension platform for gacha-style collectible character pulls. Phase 1 MVP focuses on validating core mechanics with a single-tenant implementation before expanding to multi-tenant architecture.

## Technology Stack

### Frontend (Twitch Extension)
- **Framework**: SvelteKit with `@sveltejs/adapter-static`
- **Language**: TypeScript (strict mode)
- **State Management**: Svelte stores (built-in)
- **Build Tool**: Vite
- **Target**: Twitch CDN (static assets)
- **Bundle Constraint**: <100KB gzipped

### Backend (API)
- **Framework**: SvelteKit with `@sveltejs/adapter-node` or `adapter-vercel`
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 18+
- **Deployment**: Vercel or Railway

### Database
- **Database**: PostgreSQL 14+
- **Hosting**: Supabase (free tier)
- **ORM**: Drizzle ORM
- **Migrations**: drizzle-kit

### Authentication
- **Provider**: Twitch Extension JWT
- **Validation**: Server-side via Twitch Extension Helper library

### Package Management
- **Tool**: pnpm (monorepo with workspaces)
- **Workspaces**:
  - `extension/` - Frontend (Svelte)
  - `backend/` - API server
  - `shared/` - TypeScript types

## Project Structure

```
project-puff/
├── extension/          # Twitch extension frontend
│   ├── src/
│   │   ├── components/ # Svelte components
│   │   ├── lib/        # API client, auth, stores
│   │   └── routes/     # SvelteKit routes
│   └── static/         # Assets (character/material artwork)
├── backend/            # API server
│   ├── src/
│   │   ├── api/        # REST endpoints
│   │   ├── db/         # Drizzle schema, migrations, seed
│   │   └── lib/        # Auth, gacha logic, recipes
│   └── drizzle.config.ts
├── shared/             # Shared TypeScript types
│   └── types.ts
├── specs/              # Feature specifications
│   └── 001-phase-1-mvp/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md
│       └── contracts/
└── .specify/           # Specify framework files
    ├── memory/
    │   └── constitution.md
    └── templates/
```

## Key Architecture Decisions

### 1. Twitch Extension Development
- **Choice**: SvelteKit static adapter
- **Rationale**: Small bundle size, TypeScript support, reactive stores
- **Alternative rejected**: React (larger bundle size)

### 2. Watch Time Tracking
- **Choice**: Client heartbeat (60s) with server-side stream validation
- **Rationale**: Simple for MVP, validates via Twitch Helix API
- **Alternative rejected**: EventSub webhooks (overkill for single-tenant MVP)

### 3. Database Layer
- **Choice**: Drizzle ORM + Supabase PostgreSQL
- **Rationale**: Type-safe queries, zero runtime overhead, free tier sufficient
- **Alternative rejected**: Prisma (runtime overhead), TypeORM (decorator complexity)

### 4. Serial Number Generation
- **Choice**: PostgreSQL sequences (one per character type)
- **Rationale**: Atomic uniqueness, enables collectibility tracking
- **Format**: `S1-{CHAR_ID}-{5-digit}` (e.g., `S1-GPUFF-00047`)

### 5. Transaction Flow
- **Choice**: Server-first (execute transaction, then return results for animation)
- **Rationale**: Data consistency (FR-040), prevents mid-animation issues
- **Alternative rejected**: Optimistic UI updates (rollback complexity)

### 6. Rate Limiting
- **Choice**: In-memory Map for MVP
- **Rationale**: Single-instance deployment, no Redis needed
- **Future**: Migrate to Redis for multi-instance scaling

### 7. Hardcoded Data
- **Choice**: TypeScript constants in `backend/src/lib/recipes.ts`, seeded to DB
- **Rationale**: MVP speed, type safety, future-compatible schema
- **Alternative rejected**: JSON config (no type safety)

## Constitution Compliance

**Refer to**: `.specify/memory/constitution.md`

### Key Principles for Phase 1:
- ✅ **I. Twitch TOS Compliance**: No Bits in MVP, free currency only
- ⚠️ **II. Multi-Tenant by Design**: Deferred to Phase 3 (acceptable per §V)
- ⚠️ **III. Three-Part Ecosystem**: Extension only for Phase 1 (website/overlay deferred)
- ✅ **IV. Type-Safe Data Layer**: Drizzle ORM enforces compile-time validation
- ✅ **V. Progressive MVP Development**: Following Phase 1 definition

## Current Specifications

**Active Feature**: 001-phase-1-mvp
- **Spec**: [specs/001-phase-1-mvp/spec.md](specs/001-phase-1-mvp/spec.md)
- **Plan**: [specs/001-phase-1-mvp/plan.md](specs/001-phase-1-mvp/plan.md)
- **Data Model**: [specs/001-phase-1-mvp/data-model.md](specs/001-phase-1-mvp/data-model.md)
- **API Contract**: [specs/001-phase-1-mvp/contracts/api.openapi.yaml](specs/001-phase-1-mvp/contracts/api.openapi.yaml)
- **Quickstart**: [specs/001-phase-1-mvp/quickstart.md](specs/001-phase-1-mvp/quickstart.md)

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- Prefer `const` over `let`
- Use explicit return types for functions
- Avoid `any` types

### Database Operations
- Always use Drizzle ORM (never raw SQL unless absolutely necessary)
- Use transactions for multi-step operations
- Validate foreign keys at application level
- Index frequently queried columns

### API Design
- All endpoints require JWT authentication
- Return consistent response format: `{ success: boolean, ...data }`
- Use HTTP status codes correctly (400, 401, 402, 429)
- Log errors but don't expose stack traces to clients

### Testing (Manual for MVP)
- Test complete flow: watch → earn → pull → craft → collect
- Verify pull rarity distribution over 100+ pulls
- Test edge cases: insufficient currency, spam clicks, mid-animation close
- Test mobile viewport (375px width minimum)

## Environment Variables

Required `.env` keys:
```env
DATABASE_URL=postgresql://...
TWITCH_EXTENSION_CLIENT_ID=...
TWITCH_EXTENSION_SECRET=...
API_BASE_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:8080
NODE_ENV=development
```

## Common Commands

```bash
# Backend
cd backend && pnpm run dev              # Start API server
cd backend && pnpm drizzle-kit generate # Generate migration
cd backend && pnpm drizzle-kit migrate  # Apply migration
cd backend && pnpm run seed             # Seed test data

# Extension
cd extension && pnpm run dev            # Start Vite dev server
cd extension && pnpm run build          # Build for Twitch CDN

# Database
pnpm drizzle-kit studio                 # Open database GUI
```

## Next Steps

1. Run `/speckit.tasks` to generate implementation task breakdown
2. Follow quickstart guide: `specs/001-phase-1-mvp/quickstart.md`
3. Reference API contract for endpoint implementations
4. Consult data model for schema details

---

**Note**: This context is auto-updated by Specify commands. Manual edits should be placed between `<!-- MANUAL_START -->` and `<!-- MANUAL_END -->` markers to preserve during updates.
