<!--
SYNC IMPACT REPORT
==================
Version Change: 1.3.2 → 1.4.0 (MINOR - Quest/Encounter system added)
Modified Principles:
  - VII. Monetization & Economy: Added quest material rewards as alternative to pulls
  - X. Stream Integration: Added raid event mechanics
Added Sections:
  - IX-B. Quest & Encounter System (NEW)
Removed Sections: N/A
Templates Requiring Updates:
  - .specify/templates/plan-template.md ✅ (compatible - no changes needed)
  - .specify/templates/spec-template.md ✅ (compatible - no changes needed)
  - .specify/templates/tasks-template.md ✅ (compatible - no changes needed)
Follow-up TODOs:
  - Database migration: Add quality column to material_inventory
  - Database migration: Add character_traits table
  - Database migration: Add active_quests and encounters tables
  - Update spec.md to reflect quest system
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
- **Quest Material Rewards**: Active engagement system where characters gather materials (see Section IX-B)
- **Design Balance**: Quests complement pulls (require characters acquired via pulls); systems are symbiotic
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

### IX-B. Quest & Encounter System

Characters provide utility beyond collection through deployable quests and community encounters that gather materials while viewers watch streams.

#### Quest Mechanics

**Character Deployment**:
- Viewers select 1-3 characters from their inventory to deploy on a quest
- Quest duration tiers:
  - **Short**: Up to 5 minutes (quick rewards, frequent engagement)
  - **Medium**: 15-20 minutes (balanced risk/reward)
  - **Long**: 30-45 minutes (maximum efficiency, requires commitment)
- Characters are NOT consumed; they return after quest completion
- Each character can only be on ONE quest OR encounter at a time

**Quest Zones**:
- System-managed default zones (e.g., "Enchanted Forest", "Cosmic Void", "Ancient Ruins")
- Each zone has specific material reward pools
- **Streamer Customization**: Streamers MAY customize quest start/end messages to match channel theme
- Zones visible in extension UI with active quest counters

**Community Participation**:
- Quest creator's invitation appears in extension overlay (silent, no chat spam)
- Other viewers join via button click in extension panel
- Party size: 1-10 participants (including leader)
- **Success Rate Bonus**: +5% per participant (capped at +50%)
- **Loot Distribution**: All participants receive rewards on success

**Success Calculation**:
```
Base Success Rate: 60%
+ Character Trait Bonuses: +0-30% (varies by deployed characters)
+ Party Participation: +5% per joiner (max +50%)
+ Active Watch Bonus: +10% if leader watched ≥50% of quest duration
= Final Success Rate (capped at 95%, never 100%)
```

**Quest Outcomes**:
- **Success**: All participants receive material rewards
- **Failure**: Small consolation reward (10% of success yield)
- **Quality Distribution**: Materials can drop as Low (0.5x), Normal (1.0x), or High (2.0x) quality

#### Encounter Mechanics

**Community Encounters** are active, time-limited events where viewers collectively "attack" a boss/challenge:

**Encounter Scaling**:
- Encounter difficulty scales with **active chat size** (viewers who chatted in last 5 minutes)
- More active viewers = stronger encounter = better rewards (if defeated)
- Prevents dead channels from facing impossible encounters
- Encourages chat activity

**Attack System**:
- Viewers deploy characters to "attack" the encounter
- Attack power determined by:
  - Character rarity (Common: 1, Rare: 3, Epic: 7, Legendary: 15)
  - Character traits (combat-focused traits provide bonuses)
  - Character quality/level
- Encounter has HP pool that depletes with attacks
- Encounter duration: 10-30 minutes depending on difficulty

**Encounter Rewards**:
- **Victory**: All participants receive quality materials (weighted toward higher quality)
- **Defeat**: Small consolation rewards
- **MVP Bonuses**: Top 3 contributors receive bonus materials
- **First-Time Bonus**: Extra rewards if first encounter participation

**Encounter Frequency**:
- Streamers can trigger encounters manually
- Automatic encounter spawns every 2-4 hours (configurable)
- Special encounters during platform-wide events

#### Material Quality System

All material rewards (from pulls, quests, and encounters) include quality variants:

| Quality Tier | Value Multiplier | Visual Indicator | Drop Rate |
|--------------|------------------|------------------|-----------|
| Low (Chipped) | 0.5x | Cracked/damaged appearance | 60% (quests), 50% (pulls), 30% (encounters) |
| Normal | 1.0x | Standard appearance | 35% (quests), 45% (pulls), 50% (encounters) |
| High (Pristine) | 2.0x | Glowing/enhanced appearance | 5% (quests), 5% (pulls), 20% (encounters) |

**Quality in Pulls**:
- All pull tiers (single/5/10) can drop quality variants
- Bonus character pulls slightly increase High quality chance (+2%)
- Legendary materials always drop as Normal or High quality (never Low)

**Character Traits Modify Quality**:
- "Scavenger" trait: +10% High Quality chance
- "Unlucky" trait: +10% Low Quality chance, +10% total quantity (trade-off)
- "Fortune" trait: +5% total material quantity

**Crafting with Quality**:
- Recipes require total point value, not specific items
- Example: Recipe requires 500 points of Wood
  - 500 Normal Wood (500×1.0) OR
  - 250 High Quality Wood (250×2.0) OR
  - 1000 Low Quality Wood (1000×0.5) OR
  - Mix-and-match to reach 500 points
- Viewer chooses which materials to consume (auto-consume lowest quality first by default)

**Inventory Management**:
- Quality tracked per material stack
- UI displays: "Wood: 50 Low (25pts), 120 Normal (120pts), 8 High (16pts) = 161 total points"
- Crafting UI shows quality-adjusted progress bar
- Hovering material shows equivalent value (e.g., "8 High = 16 Normal = 32 Low")

#### Character Trait System

Every character instance rolls 1-3 procedural traits upon creation (pull or craft):

**Trait Categories**:

| Category | Effect | Examples |
|----------|--------|----------|
| **Gathering** | Quest reward bonuses | Scavenger (+10% High Quality), Specialist (+20% specific material type) |
| **Combat** | Encounter attack bonuses | Warrior (+50% attack power), Tank (+25% HP contribution) |
| **Efficiency** | Quest/encounter mechanics | Speedster (-25% duration), Leader (+10% party success rate) |
| **Luck** | Passive bonuses while in inventory | Lucky Charm (+0.5% character drop rate), Pity Accelerator (+1 pity/pull, max 3 owned) |
| **Trade-off** | Balanced positive/negative | Lazy (+25% duration, +10% High Quality), Brave (+15% Legendary chance, -10% success rate) |

**Trait Assignment by Rarity**:
- **Common**: 1 trait (60% positive, 30% neutral, 10% negative)
- **Rare**: 1-2 traits (80% positive, 15% neutral, 5% negative)
- **Epic**: 2 traits (90% positive, 10% neutral)
- **Legendary**: 2-3 traits (100% positive, always optimal)

**Trait Behavior**:
- Traits are **randomly assigned on creation** (surprise mechanics)
- Traits are **permanent** (no re-rolling in MVP; deferred to Phase 2+)
- Traits are **visible immediately** after character is obtained
- Duplicate characters may have different traits (creates strategic depth)

**Streamer Customization** (Phase 3):
- Trait names/descriptions can be reskinned per channel
- System trait: "Scavenger" → Streamer renames: "Goblin Mode"
- Mechanical effects remain consistent (cross-channel fairness)

**Trait Visibility**:
- Traits displayed on character card with tooltips
- Collection view filterable by trait type
- Quest deployment UI shows trait bonuses in real-time

#### Quest Rewards Balance

Quest/encounter system complements pulls; neither obsoletes the other:

**Expected Value Comparison** (normalized to 1 hour of watching):

| Activity | Materials/Hour (Quality-Adjusted) | Engagement Level | Character Requirement |
|----------|-----------------------------------|------------------|----------------------|
| Passive Watching → Pulling | ~3.6 materials | Low (watch only) | None (currency-based) |
| Active Questing (Solo) | ~5.4-8.1 materials | Medium (deploy + monitor) | 1-3 characters required |
| Community Questing | ~8-12 materials | High (party formation + watching) | 1-3 characters required |
| Encounter Participation | ~10-15 materials | Very High (coordinated attacks + chat activity) | 1+ characters required |

**Design Intent**:
- Quests/encounters reward active engagement and social play
- Pulls required to acquire characters for quest deployment
- Neither system dominates; creates strategic choice
- Solo players can still progress via pulls (no forced social interaction)
- Active community players receive efficiency bonuses (rewarded for engagement)

#### Anti-Exploit Measures

**AFK Prevention**:
- Active watch requirement: +10% success bonus if leader watches ≥50% of quest duration
- Watch time tracked via existing heartbeat system (60s intervals)
- Characters locked during active deployment (prevents double-use exploits)

**Quest Spam Prevention**:
- Maximum 3 simultaneous quests per viewer
- Minimum 5-minute cooldown between creating new quests
- Characters locked during quests (cannot be deployed to multiple quests)

**Encounter Fairness**:
- Each character can only attack once per encounter
- Attack contribution tracked to prevent double-counting
- Encounter difficulty dynamically adjusts to active chat size
- MVP rewards based on attack contribution (prevents free-loading)

**Inventory Limits**:
- Maximum quality-adjusted material storage: 10,000 quality-points per material type
- Example: 10,000 Normal Wood OR 5,000 High Quality Wood OR 20,000 Low Quality Wood
- Excess rewards convert to lower quality tiers or Dust (player's choice)
- Prevents infinite accumulation

#### Raid Event System: "The Caravan"

When Streamer A raids Streamer B (both using extension):

**Trigger Conditions**:
1. Raid includes ≥10 viewers (prevents micro-raid farming)
2. Raiding channel was live ≥1 hour before raid (prevents raid farms)
3. Viewer earned ≥10 Dust in raiding channel today (proves active watching)
4. Viewer hasn't claimed reward from this raiding channel today (24h cooldown)

**Visual Experience**:
1. Extension overlay shows "Caravan Departing!" animation
2. Characters visible in themed wagon (raiding channel's style)
3. 5-minute countdown timer begins
4. If viewer watches raided channel for full 5 minutes, Caravan "Arrives"

**Rewards**:
- **Material Crate**: 5-10 materials from raiding channel's material pool (Normal/High quality bias)
- **Welcome Bonus** (if raided channel uses extension): 50 Dust in destination channel + starter materials
- **First-Time Bonus**: +5 materials if first time watching raided channel
- **Raid Size Scaling**: Larger raids (100+ viewers) provide +20% material quantity

**Anti-Exploit**:
- One reward per viewer per raiding channel per 24h (prevents farming loops)
- Raid size minimum prevents coordinated micro-raids
- Watch time requirement in raiding channel prevents drive-by farmers
- Both channels must use extension (drives adoption, not exploitation)

**Streamer Benefits**:
- Raiders encouraged to stay (5min watch time requirement)
- Cross-pollinates audiences
- Creates "gift exchange" narrative ("We brought you materials from PuffTheStreamer!")
- Drives extension adoption (both parties benefit)

**Rationale**: Quests and encounters solve the "useless low-tier character" problem by giving every character utility value. Material quality creates strategic depth without inventory bloat. Character traits add collection variety and optimization layers. Community encounters encourage social interaction and chat activity. Raid events drive cross-channel discovery while respecting anti-exploit measures.

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
- Raids (trigger Caravan event; see Section IX-B for raid mechanics)

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

**Version**: 1.4.0 | **Ratified**: 2025-12-17 | **Last Amended**: 2025-12-19
