# Streamlets - Phase 1 MVP

A Twitch extension platform for gacha-style collectible character pulls. Phase 1 MVP focuses on validating core mechanics with a single-tenant implementation.

## Project Structure

```
project-puff/
├── extension/          # Twitch extension frontend (SvelteKit static)
├── backend/            # API server (Express + Drizzle ORM)
├── shared/             # Shared TypeScript types
├── specs/              # Feature specifications and documentation
└── .specify/           # Specify framework configuration
```

## Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+ (or npm/yarn)
- **PostgreSQL** database (Supabase recommended for MVP)
- **Twitch Developer Account** with Extension created

### Installation

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and Twitch credentials
   ```

3. **Set up database:**
   ```bash
   # Generate migrations
   pnpm run db:generate

   # Run migrations
   pnpm run db:migrate

   # Seed test data
   pnpm run db:seed
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1: Backend API
   pnpm run dev:backend

   # Terminal 2: Extension frontend
   pnpm run dev:extension
   ```

5. **Test in Twitch Developer Rig:**
   - Download from: https://dev.twitch.tv/docs/extensions/rig
   - Add your extension using Client ID
   - Point to `http://localhost:5173` for local assets
   - Generate test JWT tokens for authentication

## Development

### Available Scripts

```bash
# Development
pnpm run dev:extension    # Start extension dev server (Vite)
pnpm run dev:backend      # Start backend API server (tsx watch)

# Building
pnpm run build            # Build both extension and backend
pnpm run build:extension  # Build extension for Twitch CDN
pnpm run build:backend    # Build backend for production

# Database
pnpm run db:generate      # Generate Drizzle migrations from schema
pnpm run db:migrate       # Apply migrations to database
pnpm run db:seed          # Seed test data (materials, characters, recipes)
pnpm run db:studio        # Open Drizzle Studio GUI

# Code Quality
pnpm run lint             # Lint all workspaces
pnpm run type-check       # TypeScript type checking
```

### Technology Stack

- **Frontend**: SvelteKit (static adapter), TypeScript
- **Backend**: Express, Drizzle ORM, PostgreSQL
- **Database**: PostgreSQL via Supabase
- **Authentication**: Twitch Extension JWT
- **Package Manager**: pnpm (monorepo with workspaces)

## Documentation

- **Full Specification**: [specs/001-phase-1-mvp/spec.md](specs/001-phase-1-mvp/spec.md)
- **Implementation Plan**: [specs/001-phase-1-mvp/plan.md](specs/001-phase-1-mvp/plan.md)
- **Data Model**: [specs/001-phase-1-mvp/data-model.md](specs/001-phase-1-mvp/data-model.md)
- **API Contract**: [specs/001-phase-1-mvp/contracts/api.openapi.yaml](specs/001-phase-1-mvp/contracts/api.openapi.yaml)
- **Quickstart Guide**: [specs/001-phase-1-mvp/quickstart.md](specs/001-phase-1-mvp/quickstart.md)
- **Implementation Tasks**: [specs/001-phase-1-mvp/tasks.md](specs/001-phase-1-mvp/tasks.md)

## Project Status

**Phase 1: Setup & Infrastructure** ✅ **COMPLETE**

- [x] Monorepo structure with pnpm workspaces
- [x] TypeScript strict mode configuration
- [x] SvelteKit adapters (static for extension, node for backend)
- [x] Database schema with Drizzle ORM
- [x] Seed data for materials, characters, and recipes
- [x] Backend API infrastructure (Express + CORS + JWT auth)
- [x] Extension frontend structure (Svelte stores + API client)

**Next Steps**:
- Implement watch time currency earning (Phase 3 - User Story 1)
- Implement pull mechanics (Phase 4 - User Stories 2 & 3)
- Implement crafting system (Phase 5 - User Story 4)

## License

Private project - All rights reserved
