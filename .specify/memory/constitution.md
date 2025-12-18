<!--
SYNC IMPACT REPORT
==================
Version Change: 1.3.1 → 1.3.2 (PATCH - domain preference: .com/.app over .gg)
Modified Principles:
  - III. Architecture: Expanded to three-part ecosystem (Extension + Website + Overlay)
  - IX. Crafting & Research: Added Seasons concept
Added Sections:
  - XI. Platform-First Value Creation (NEW)
  - XII. Collector Experience (NEW)
  - XIII. External Value Bridges (NEW)
Removed Sections: N/A
Templates Requiring Updates:
  - .specify/templates/plan-template.md ✅ (compatible - no changes needed)
  - .specify/templates/spec-template.md ✅ (compatible - no changes needed)
  - .specify/templates/tasks-template.md ✅ (compatible - no changes needed)
Follow-up TODOs:
  - None - all placeholders resolved
==================
-->

# Streamlets Constitution

## Core Principles

### I. Twitch TOS Compliance First

All monetization and gameplay mechanics MUST adhere to Twitch Extension policies regarding gambling:

- **Bits (Premium Currency)**: MUST be used ONLY for deterministic, non-random purchases (guaranteed materials, cosmetics, boosters)
- **Free Currency Pulls**: MAY use RNG for material drops since no real money is directly exchanged
- **Bonus Character Drops**: The ~5% chance for direct character drops is permitted as a bonus on top of guaranteed material drops
- **No Loot Boxes for Bits**: Under NO circumstances may Bits be exchanged for randomized rewards
- **Transparency Required**: Drop rates MUST be publicly visible to users
- **Pity System**: A guaranteed rare material after X unsuccessful pulls MUST be implemented

**Rationale**: Twitch policy violations result in extension removal and potential streamer bans. This principle is non-negotiable.

### II. Multi-Tenant by Design

Every feature MUST consider streamer isolation and cross-tenant interactions from inception:

- **Data Isolation**: Each streamer's assets, materials, recipes, and configurations are scoped by `streamer_id`
- **Currency Locality**: Currencies earned in Channel A can ONLY be spent in Channel A (prevents inflation)
- **Material Locality**: Materials are channel-specific; cannot be transferred between channels
- **Global Identity**: Users maintain a single `twitch_id` across all channels with a `global_level` for cross-stream prestige
- **Visitor Badge System**: Collections from Channel A MUST be visible (read-only) when visiting Channel B
- **Schema Constraints**: Foreign keys MUST enforce `streamer_id` scoping on all channel-specific tables
- **Naming Customization**: Streamers MAY rename currencies and materials to match channel theme (Phase 3)

**Rationale**: Multi-tenancy is the platform's core value proposition. Single-tenant shortcuts create irreversible technical debt.

### III. Three-Part Ecosystem Architecture

The platform consists of three interconnected components:

#### Twitch Extension (In-Stream Experience)
- **Purpose**: Real-time interaction while watching streams
- **Built via**: `@sveltejs/adapter-static` for Twitch Video Overlay and Panel views
- **Features**: Pull/craft interface, current channel collection, research contribution, minimal discovery
- **Constraint**: Limited UI real estate; focus on current channel context

#### Platform Website (streamlets.com / streamlets.app)
- **Purpose**: Platform-wide experience outside Twitch
- **Built via**: SvelteKit with `@sveltejs/adapter-node` or `adapter-vercel`
- **Features**:
  - Full collection management across all channels
  - Bag browser (all channels' collections)
  - Global and per-channel leaderboards
  - Live streamer directory with recommendations
  - Cross-channel constellation progress
  - Platform-wide event/Tide tracking
  - Discovery and channel recommendations
  - Shareable collection profiles (`streamlets.com/u/username` or `streamlets.app/u/username`)
  - Verification endpoints (`streamlets.com/verify/[id]` or `streamlets.app/verify/[id]`)

#### Browser Source Overlay (OBS Integration)
- **Purpose**: On-stream visual feedback
- **Built via**: Lightweight HTML/CSS/JS served from CDN
- **Features**: Pull animations, craft celebrations, alerts, research milestones
- **Constraint**: Near-zero resource cost on streamer's machine

#### Shared Backend (EBS)
- **Built via**: `@sveltejs/adapter-node` (or `adapter-vercel`)
- **Serves**: All three frontend components
- **Responsibilities**: JWT validation, database operations, EventSub handling, real-time sync

#### Shared Types
- **Location**: `/shared` directory
- **Contains**: TypeScript types/interfaces used by all components
- **Rule**: No direct DB access from any frontend; all operations through backend API

**Rationale**: Different contexts require different UIs. Extension for in-stream; website for browsing/management; overlay for broadcast.

### IV. Type-Safe Data Layer

All database interactions MUST be type-safe and schema-validated:

- **PostgreSQL via Supabase**: Primary database with Row Level Security (RLS) policies where applicable
- **Schema Migrations**: All schema changes MUST be versioned migrations (no manual DB edits)
- **Typed Queries**: Use Drizzle ORM or similar for compile-time query validation
- **Entity Relationships**: Enforce referential integrity via foreign keys:
  - `Materials.streamer_id` → `Streamers.twitch_id`
  - `Recipes.streamer_id` → `Streamers.twitch_id`
  - `Characters.streamer_id` → `Streamers.twitch_id`
  - `Seasons.streamer_id` → `Streamers.twitch_id`
  - `Wallets.user_id` → `Users.twitch_id`
  - `Wallets.streamer_id` → `Streamers.twitch_id`
  - `Inventory.user_id` → `Users.twitch_id`
  - `MaterialInventory.user_id` → `Users.twitch_id`
  - `Bags.user_id` → `Users.twitch_id`
  - `Bags.streamer_id` → `Streamers.twitch_id`
- **Soft Deletes**: Characters, materials, and user data MUST use soft deletes to preserve collection integrity

**Rationale**: Gacha systems handle virtual economies; data corruption is catastrophic for user trust.

### V. Progressive MVP Development

Development MUST follow the phased roadmap with shippable milestones:

- **Phase 1 (MVP)**: Single-tenant "Puff" implementation with hardcoded materials/recipes for one test channel; basic extension only
- **Phase 2 (Engagement)**: Chat integration ("Flex" command), Bits transactions, polished inventory UI, browser overlay, basic website
- **Phase 3 (Platform)**: Creator Dashboard, dynamic material/recipe uploads, multi-tenant queries, full website features, Global Showcase
- **Feature Flags**: Multi-tenant features MUST be behind feature flags until Phase 3 completion
- **No Premature Abstraction**: Build for Puff first; generalize only when Phase 3 begins
- **Shippable Increments**: Each phase MUST be independently deployable and usable

**Rationale**: Scope creep kills side projects. A working single-tenant MVP validates the concept before platform investment.

### VI. Viewer Experience Excellence

The extension MUST prioritize viewer engagement and delight:

- **Sub-Second Feedback**: Pull animations, crafting confirmations, and currency changes MUST feel instant (<200ms perceived)
- **Visual Progression**: Character leveling MUST have visible flair changes (sparkles, borders, effects)
- **Collection Satisfaction**: The collection UI MUST clearly show completion progress, available recipes, and research status
- **Cross-Stream Discovery**: The Visitor Badge feature MUST create genuine curiosity about other channels
- **Mobile-Friendly**: Twitch mobile viewers are 40%+ of traffic; layouts MUST be responsive

**Rationale**: Gacha games live or die by their "feel." Technical correctness without dopamine design is worthless.

### VII. Monetization & Economy

The platform's economy MUST balance free engagement with premium value through a hybrid pull-and-craft system:

#### Four-Tier Currency Model

| Tier | Default Name | Source | Use |
|------|--------------|--------|-----|
| **T1** | Dust | Watching streams (base rate) | Basic pulls, low-tier crafting |
| **T2** | Shards | Crafted from Dust | Mid-tier pulls |
| **T3** | Crystals | Crafted from Shards, events | Premium pulls |
| **T4** | Prisms | Crafted from Crystals, achievements | Legendary crafting components |

#### Hybrid Pull System

Every pull produces **two outcomes**:

1. **Guaranteed Materials** (100%): Rarity determined by drop table
   - Common: 60%, Uncommon: 25%, Rare: 12%, Legendary: 3%
2. **Bonus Character** (~5% chance): Direct character drop
   - Common: 70%, Rare: 20%, Epic: 8%, Legendary: 2%
   - Legendary direct drop rate: 5% × 2% = **0.1%** (1 in 1,000)

#### Character Breakdown

Unwanted characters can be broken down into materials:
- Returns ~30-50% of crafting cost in materials
- Ensures no pull is ever "worthless"

#### Currency Earning Rules

- **Base Earning Rate**: Configurable per-channel (default: 10 Dust per 5 minutes watched)
- **Hype Train Multiplier**: Earning rate scales with hype train level for ALL viewers:
  - Level 1: 1.2x | Level 2: 1.4x | Level 3: 1.6x | Level 4: 1.8x | Level 5: 2.0x
- **Large Currency Drops**: Reserved for direct interactions (subscriptions, bits cheers, gifted subs)
- **Channel Points Integration**: MAY be used to unlock quest content; MUST NOT directly purchase items or currency

#### Bits Purchases (Deterministic Only)

| Purchase | Effect |
|----------|--------|
| Guaranteed Materials | Buy specific materials directly (skip RNG) |
| Cosmetic Frames | Visual flair for collection |
| Earning Boosters | Temporary multiplier on Dust earning |
| Craft Boosters | Discount on crafting costs |
| Quest Unlock | Instant unlock (skip channel points) |

**Bits Bonus**: Spending Bits also awards bonus Dust (scaling with amount spent).

#### Deferred Monetization Decisions

- **Subscription Benefits**: Specific bonuses TBD pending full system testing
- **Trading System**: Deferred to Phase 3+; requires anti-RMT safeguards
- **Platform Revenue Split**: Platform takes percentage of post-Twitch Bits amount

**Rationale**: The hybrid model ensures every pull has value (materials) while preserving the excitement of lucky character drops. Crafting creates deterministic paths to desired characters.

### VIII. Progression Philosophy

The platform MUST NOT implement battle pass mechanics. Progression systems SHOULD reward collection depth and character investment over time-gated grinding:

#### Sanctioned Progression Systems

- **Constellations**: Themed character sets; completing a constellation unlocks bonuses, exclusive frames, and one-time rewards
- **Cross-Channel Constellations**: Platform-defined AND streamer-collaborative sets spanning multiple channels
- **Bonds**: Long-term engagement with specific characters; maximum bond unlocks alternate art, lore snippets, and exclusive emotes
- **Quests**: Streamer-created challenges providing directed goals; unlockable via channel points
- **Community Tides**: Channel-wide collaborative weekly goals; success benefits ALL participants
- **Platform Tides**: Global events spanning all channels; regular cadence plus community-triggered
- **Research Contributions**: Contributing to recipe research earns recognition and rewards (see Principle IX)

#### Progression Principles

- **Depth Over Time**: Reward players for collecting deeply (full sets, max bonds) not just logging in daily
- **Community Over Competition**: Collaborative goals (Tides, Research) preferred over leaderboards
- **Streamer Agency**: Quests and research timing give streamers tools to drive engagement
- **No FOMO Exploitation**: Time-gated content SHOULD return in future rotations (via Seasons)

**Rationale**: Battle pass fatigue is real. These systems reward genuine engagement and collection investment rather than daily obligation grinding.

### IX. Crafting & Research System

Character acquisition is primarily through crafting, creating deterministic paths to desired characters:

#### Recipe Point System

Each material tier has a standardized point value:

| Material Tier | Points Per Unit |
|---------------|-----------------|
| Common | 1 pt |
| Uncommon | 5 pt |
| Rare | 25 pt |
| Legendary | 100 pt |

#### Character Crafting Budgets

Streamers design recipes within standardized budgets (±15% variance allowed):

| Character Rarity | Point Budget | Variance Range |
|------------------|--------------|----------------|
| Common | 100 pts | 85-115 pts |
| Rare | 500 pts | 425-575 pts |
| Epic | 2,000 pts | 1,700-2,300 pts |
| Legendary | 8,000 pts | 6,800-9,200 pts |

**Streamer Freedom**: Choose WHICH materials and quantities; system enforces total point budget.

**Cross-Channel Guarantee**: A Legendary from Channel A requires roughly equivalent effort to a Legendary from Channel B.

#### Recipe Availability by Tier

| Character Rarity | Availability |
|------------------|--------------|
| Common | Instant (no research required) |
| Rare | Requires community research |
| Epic | Requires community research |
| Legendary | Requires community research |

#### Community Research System

Rare+ recipes are unlocked through collaborative community contribution:

1. **Streamer Creates**: Designs character + recipe, sets as "locked for research"
2. **Research Opens**: Community sees "???" with material requirements to unlock
3. **Community Contributes**: Viewers donate materials toward research goal
4. **Recipe Unlocks**: Once funded, recipe revealed to ALL viewers
5. **Crafting Opens**: Anyone can now craft (with their own materials)

**Research Costs**:

| Character Rarity | Research Cost (Material Points) |
|------------------|--------------------------------|
| Rare | 2,500 pts |
| Epic | 12,500 pts |
| Legendary | 50,000 pts |

**Simultaneous Research**: Streamer chooses how many recipes can be researched at once.

**Contributor Rewards**:
- Top contributors receive small material bonus
- Top contributors receive exclusive "Researcher" frame variant for that character

#### Seasons

Temporal organization allowing character evolution and re-releases:

- **Season Structure**: Streamers can organize characters into seasons (e.g., Season 1, Season 2)
- **Character Evolution**: Same character can have new versions in later seasons (updated art, different artist)
- **Serial Preservation**: Season information is part of the serial number
- **Collectibility**: Earlier seasons become naturally rarer over time
- **Season Collections**: "Complete Season 1" becomes a collection goal
- **Variant Eligibility**: Art variants may be season-specific

#### Character Leveling

Post-craft leveling requires additional materials:

| Level | Additional Cost | Benefit |
|-------|-----------------|---------|
| 1 (base) | Crafting cost | Character unlocked |
| 2 | +25% of craft cost | Visual upgrade + stats |
| 3 | +50% of craft cost | Visual upgrade + stats |
| 4 | +75% of craft cost | Visual upgrade + stats |
| 5 (MAX) | +100% of craft cost | Final form, max bond available |

**Duplicate Characters**: Automatically convert to XP toward that character's level.

#### Material Constraints

- **Per-Channel Materials**: Each streamer defines their own themed materials
- **Material Limit**: Maximum 4-6 materials per tier per channel (prevents bloat)
- **No Cross-Channel Transfer**: Materials cannot move between channels

**Rationale**: Standardized budgets ensure fair time investment across channels while giving streamers creative freedom. Community research creates shared investment and celebration moments. Seasons allow content evolution without invalidating earlier collections.

### X. Stream Integration Architecture

The extension MUST integrate with live streams through lightweight, resource-efficient mechanisms:

#### Alert Visibility Rules

| Event Type | Visibility | Rationale |
|------------|------------|-----------|
| Community Tide completed | 🔒 Always | Celebrates community achievement |
| Recipe research completed | 🔒 Always | Shared milestone |
| Constellation unlocked | 🔒 Always | Community moment |
| Legendary pull/craft | ⚙️ Configurable | High-volume streamers may mute |
| Epic pull/craft | ⚙️ Configurable | Default: on |
| Rare pull/craft | ⚙️ Configurable | Default: off |
| First pull (new viewer) | ⚙️ Configurable | Welcome moment |
| Character max bond | ⚙️ Configurable | Personal achievement |

**Philosophy**: Community events ALWAYS show; individual achievements are configurable (large streamers need volume control).

#### Streamer Customization Options

| Category | Configurable Options |
|----------|---------------------|
| Visual Theme | Colors, fonts, animation style |
| Alert Thresholds | Which rarities trigger alerts |
| Sound Design | Per-rarity sound effects |
| Animation Duration | How long alerts display |
| Cooldowns | Spam prevention timing |
| Message Templates | Chat message format |
| Overlay Position | Screen placement presets |

#### Platform-Standard Elements (Non-Customizable)

| Element | Rationale |
|---------|-----------|
| Rarity border colors | Cross-channel recognition |
| Rarity particle effects | Instant value recognition |
| Point budget system | Economic fairness |
| Drop rate display | TOS compliance |

#### Broadcaster & Moderator Commands

| Command | Access | Effect |
|---------|--------|--------|
| `!dustrain [amount]` | Configurable | Drop currency to all viewers |
| `!bonustime [mins] [mult]` | Configurable | Temporary earning boost |
| `!mutedrops` | Configurable | Pause on-stream alerts |
| `!unmutedrops` | Configurable | Resume on-stream alerts |
| `!showcase @user` | Configurable | Display someone's collection |
| `!tideprogress` | Anyone | Show Community Tide status |
| `!research` | Anyone | Show research progress |

**Permission System**: Streamers configure which commands are available to moderators vs streamer-only.

#### Twitch EventSub Integration

Backend MUST subscribe to relevant channel events:
- Subscriptions (trigger currency drops)
- Bits cheers (trigger currency drops)
- Hype trains (activate multiplier)
- Raids (welcome bonuses for raiders)

#### Physical Goods Integration (Phase 2)

Streamers MAY attach "Treasures" to recipes:

| Treasure Type | Example |
|---------------|---------|
| Discount Code | "20% off merch store" |
| Exclusive Link | "Access to Discord role" |
| Physical Reward | "Signed print (limited qty)" |
| Digital Download | "Wallpaper pack" |

**Rules**:
- Fulfillment is streamer's responsibility
- Platform tracks redemptions and enforces limits
- Treasure existence visible BEFORE crafting (transparency)
- Does not affect crafting cost (no pay-to-win)

**Rationale**: Lightweight overlay integration enables adoption by any streamer regardless of hardware. Community alerts build shared experiences; individual alerts respect streamer preferences.

### XI. Platform-First Value Creation

The extension MUST generate value independent of individual streamer popularity:

#### Collector Identity Over Fan Identity

- **Global Collector Level** is the primary status marker across all channels
- Cross-channel collecting is celebrated and incentivized
- Platform reputation transcends any single channel
- Identity as "Collector" rather than just "Fan of X"

#### Natural Scarcity Favors Small Channels

- Display **global supply** (platform-wide counts) for all characters
- Low-traffic channels naturally produce fewer copies = genuine rarity
- Rarity is based on actual scarcity, not creator fame
- No artificial bonuses for small channels; natural economics suffice

#### Discovery as Core Feature

- **Website-centric**: Full discovery features live on streamlets.com/streamlets.app, not crowded into extension
- Recommend new channels based on collection gaps
- Surface rising creators and hidden gems
- Cross-channel constellations require exploration
- Live streamer directory with collection-aware recommendations

#### Platform-Wide Events

- **Regular Cadence**: Weekly platform Tides spanning all channels
- **Community-Triggered**: Special events when global thresholds are hit
- **Cross-Channel Achievements**: Milestones requiring multiple channel participation
- **Collaborative Moments**: Events that unite collectors across communities

#### Quality Over Popularity

- Curated features based on character quality, not channel size
- Community voting surfaces best designs
- Small streamers can be "featured" through merit
- Art spotlight, rising creators, hidden gems sections

#### Cross-Channel Constellations

Two types of multi-channel sets:

| Type | Definition | Example |
|------|------------|---------|
| **Platform-Defined** | Created by platform, themed across channels | "Cozy Creatures" from 4 cozy streamers |
| **Streamer-Collaborative** | Streamers opt-in to shared constellations | Two friends create a collab set |

Completing cross-channel constellations requires visiting multiple channels, driving discovery.

**Rationale**: The platform must be valuable on its own so that ALL streamers benefit from participation, especially smaller creators. The extension's popularity should raise all boats.

### XII. Collector Experience

The collection system MUST create genuine collector satisfaction through tangible differentiation:

#### Bags (Per-Channel Collections)

Each channel's collection lives in a themed **bag**:

- **Unique Design**: Each streamer designs their bag's appearance to match their brand
- **Collectible Container**: The bag itself is earned by first visiting a channel
- **Organizational Unit**: Contains all characters + materials from that channel
- **Display Element**: Bags visible in profile, showing breadth of collection
- **Progress Indicator**: Empty bag slots encourage exploration of new channels

#### Art Variants

Characters MAY have multiple art variants (streamer's choice per character):

| Variant | Rarity Modifier | Notes |
|---------|-----------------|-------|
| Regular | Base | Standard version, always available |
| Holo | Uncommon | Animated shimmer effect |
| Full Art | Rare | Extended artwork, premium feel |
| Alt Art | Epic | Alternative artistic interpretation |
| Secret | Legendary | Ultra-rare, special unlock conditions |

**Rules**:
- Variants are OPTIONAL per character (not all characters need all variants)
- Creates variety where some characters are rarer than others of same tier
- Variant availability may be season-specific
- Each variant has its own recipe or drop condition

#### Serial Numbers (Mint System)

Every character instance receives a unique global serial number:

- **Format**: `[Season]-[Character ID]-[Serial]` (e.g., `S1-GPUFF-00047`)
- **Global Scope**: Serials are platform-wide, not channel-scoped
- **Collectibility**: Serial numbers themselves become collectible (matching numbers, sequential runs, milestone numbers)
- **Time Capsule**: Serial indicates when character was obtained relative to others
- **Verification**: Serial enables authentication (`streamlets.com/verify/[serial]` or `streamlets.app/verify/[serial]`)

**Early Adopter Recognition**:
- First 10 crafters: Special badge
- First 100 crafters: "Early Adopter" badge
- Low mint numbers carry prestige

#### Pull Ritual

The pull experience MUST build anticipation:

- **Default Duration**: 3-4 seconds (medium - builds anticipation without frustration)
- **Viewer Configurable**: Users can adjust to faster (1-2s) or dramatic (5-7s)
- **Rarity Scaling**: Rare+ pulls get extended/enhanced animations
- **Audio Feedback**: Sound design reinforces rarity
- **Bonus Character**: Special animation when bonus character drops

#### Scarcity Signals

Display **global counts only** (platform-wide):

- "You own 1 of 47 Golden Puffs in existence"
- "Only 2.3% of collectors have this character"
- "Your mint #47 is in the top 100"
- Real-time global supply tracking

#### Dynamic Visual Elements

Real cards are "alive" to differentiate from screenshots:

| Rarity | Visual Treatment |
|--------|------------------|
| Common | Static image, simple border |
| Rare | Subtle shimmer on hover, animated border |
| Epic | Holographic rainbow sweep, particle dust |
| Legendary | Full animation (character moves), prismatic refraction |
| Secret | Inverted/glitch effects, "breaks the UI" aesthetics |

#### Character Display Elements

Every character card shows:
- Character art (with rarity-appropriate effects)
- Name and rarity tier
- Serial number
- Owner username
- Craft/obtain date
- Level and bond status
- Season indicator
- Verification link

**Rationale**: Collector satisfaction comes from tangible differentiation. Serials create uniqueness, variants create chase targets, bags create organizational satisfaction, and dynamic visuals make screenshots worthless compared to "real" ownership.

### XIII. External Value Bridges

Digital collectibles MUST have value recognized OUTSIDE the extension ecosystem:

#### Brand Value

- Characters represent the **streamer's brand**, creating fan significance beyond the platform
- Ownership signifies community membership and dedication
- Value is tied to creator relationship, not just pixel ownership

#### Physical World Connection

- **Treasures** bridge digital ownership to physical goods (merch discounts, exclusive access)
- Physical items become proof of digital achievement
- Real-world rewards create value non-users can understand

#### Community Integration

- **Discord Role Sync**: Collection milestones unlock roles in streamer's Discord
- **Cross-Platform Display**: Twitch panels, social media sharing, stream overlays
- **Chat Recognition**: Special indicators for notable collectors
- **Verification System**: `streamlets.com/verify/[id]` or `streamlets.app/verify/[id]` proves ownership to anyone

#### Memory Creation

- Community research unlocks become **shared memories** ("We unlocked this during the charity stream")
- Rare moments are clipped and celebrated
- Characters acquire meaning through community history
- Seasonal releases create temporal landmarks

#### Streamer Incentive Alignment

Streamers benefit directly from promoting the system:

| Benefit | Mechanism |
|---------|-----------|
| Revenue | Bits transactions (streamer receives cut) |
| Engagement | Viewers stay longer to earn currency |
| Community | Shared goals (research, Tides) create bonding |
| Content | Rare events create stream moments |
| Merch | Treasure system drives purchases |
| Traffic | Visitor Badge and cross-channel sets drive discovery |

**Rationale**: Internal value is necessary but not sufficient. The platform must create value recognizable to people OUTSIDE the ecosystem to achieve mainstream adoption and avoid the NFT trap of "only insiders care."

## Technical Constraints

### Technology Stack (Locked)

| Layer | Technology | Version/Notes |
|-------|------------|---------------|
| Framework | SvelteKit | Latest stable, monorepo structure |
| Language | TypeScript | Strict mode enabled |
| Database | PostgreSQL | Via Supabase (free tier compatible) |
| ORM | Drizzle ORM | Type-safe queries |
| Auth | Twitch JWT | EBS token validation |
| Storage | Supabase Storage | S3-compatible, CDN-served |
| Extension Hosting | Twitch CDN | Static assets |
| Backend Hosting | Vercel / Railway | API and website |
| Events | Twitch EventSub | Channel event webhooks |

### Performance Budgets

- **Extension Bundle**: <100KB gzipped (Twitch overlay performance)
- **Website Initial Load**: <200KB gzipped (fast discovery browsing)
- **API Response**: <200ms p95 for all endpoints
- **Pull Animation**: 60fps minimum, 3-4s default duration
- **Overlay Alerts**: <500ms from trigger to display
- **Database Queries**: No N+1 queries; batch operations required

### Security Requirements

- **JWT Validation**: ALL backend endpoints MUST validate Twitch JWT tokens
- **Rate Limiting**: Pull endpoints MUST be rate-limited (1 pull per 2 seconds per user)
- **Input Sanitization**: All streamer-uploaded content (names, images) MUST be sanitized
- **CORS Policy**: Backend MUST only accept requests from Twitch extension origins and streamlets.com/streamlets.app
- **EventSub Verification**: All webhook payloads MUST be signature-verified

## Development Workflow

### Branch Strategy

- `main`: Production-ready code only
- `develop`: Integration branch for features
- `feature/[phase]-[name]`: Feature branches (e.g., `feature/p1-pull-mechanic`)
- `hotfix/[issue]`: Emergency production fixes

### Definition of Done

A feature is complete when:

1. All acceptance criteria from spec.md pass
2. TypeScript compiles with no errors (strict mode)
3. No console errors in browser dev tools
4. Tested on Twitch Developer Rig (local) AND hosted test environment
5. Mobile viewport verified (375px width minimum)
6. Database migrations are reversible
7. Browser overlay tested in OBS
8. Website features tested across browsers

### Code Review Requirements

- All PRs require 1 approval (when team > 1)
- Constitution compliance check on every PR
- No direct commits to `main` or `develop`

## Governance

This Constitution is the authoritative guide for all Streamlets development decisions:

- **Precedence**: Constitution principles override individual preferences or "quick fixes"
- **Amendments**: Changes require documented rationale and version increment
- **Versioning Policy**:
  - MAJOR: Principle removal, redefinition, or backward-incompatible governance change
  - MINOR: New principle added, existing principle materially expanded
  - PATCH: Clarifications, typo fixes, non-semantic refinements
- **Compliance Review**: Every PR description MUST include a Constitution Check section confirming adherence to relevant principles

**Version**: 1.3.2 | **Ratified**: 2025-12-17 | **Last Amended**: 2025-12-18
