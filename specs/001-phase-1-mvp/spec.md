# Feature Specification: Phase 1 MVP - Single-Tenant Gacha Extension

**Feature Branch**: `001-phase-1-mvp`
**Created**: 2025-12-18
**Status**: Draft
**Input**: User description: "I want to create an mvp of this project"

## Clarifications

### Session 2025-12-18

- Q: How many material items does a single pull produce? → A: Tiered pull system - Single pull gives 1-3 materials, 5-pull batch gives 10-20 materials, 10-pull batch gives up to 50 materials
- Q: How much Dust do new viewers start with? → A: 225+ Dust (enough for at least one 5-pull batch)
- Q: What are the maximum limits for currency and material inventory? → A: No limits for MVP (defer to post-launch based on usage data)
- Q: How should the system handle viewers with multiple concurrent sessions? → A: Last-write-wins with optimistic updates (simple conflict resolution)
- Q: How is watch time tracked and validated for currency earning? → A: Twitch native watch time API (if available)

### Session 2025-12-19

- Q: What quest duration options should be available? → A: Short (up to 5 minutes), Medium (15-20 minutes), Long (30-45 minutes)
- Q: How should quest zones be managed? → A: System-managed default zones with optional streamer message customization for quest start/end
- Q: Should pulls also have material quality variants? → A: Yes, all material sources (pulls, quests, encounters) include Low (0.5x), Normal (1.0x), and High (2.0x) quality variants
- Q: Should character traits be visible before crafting? → A: No, traits are surprise mechanics revealed upon character acquisition
- Q: How do encounters scale? → A: Encounter difficulty scales based on active chat size (viewers who chatted in last 5 minutes) and depends on character attack power and quality
- Q: What state lifecycle should quests and encounters use? → A: 4-state model (PENDING → ACTIVE → SUCCESS/FAILED → CLAIMED) with explicit reward claim step
- Q: How should material quality be tracked in inventory? → A: Separate stacks per quality in database, but UI shows consolidated view with quality breakdown on hover/click for clean presentation
- Q: How long should the PENDING party formation phase last? → A: Variable by tier (Short: 30s, Medium: 60s, Long: 90s) with leader early-start option
- Q: How should character trait generation work? → A: Deterministic seed from character ID + timestamp (reproducible for debugging)
- Q: How should quest/encounter rewards transition to CLAIMED state? → A: Auto-claim with notification (immediate reward distribution, zero friction)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Passive Currency Earning (Priority: P1)

As a Twitch viewer watching a participating stream, I want to automatically earn in-game currency while watching, so that I can participate in the gacha system without any initial investment.

**Why this priority**: Without currency earning, users cannot engage with any other feature. This is the foundational mechanic that enables all downstream interactions.

**Independent Test**: Can be fully tested by loading the extension while watching a test stream for 5 minutes, then checking that currency balance increases. Delivers the core value of "rewarding viewership with progression."

**Acceptance Scenarios**:

1. **Given** a viewer is watching a stream with the extension enabled, **When** 5 minutes of watch time elapses, **Then** the viewer's currency balance increases by the configured earning rate
2. **Given** a viewer closes the stream, **When** they return later and start watching again, **Then** their currency balance persists from their previous session
3. **Given** a viewer has never used the extension before, **When** they first open the extension panel, **Then** they see their starting currency balance and an explanation of how currency is earned

---

### User Story 2 - Material Pulls (Priority: P1)

As a viewer with earned currency, I want to perform pulls that give me crafting materials, so that I can work towards crafting characters I want.

**Why this priority**: The pull mechanic is the core engagement loop. Materials are the primary output that enables crafting, making this essential for MVP functionality.

**Independent Test**: Can be tested by granting test currency and executing a pull, verifying materials are added to inventory. Delivers "immediate gacha satisfaction and progression towards goals."

**Acceptance Scenarios**:

1. **Given** a viewer has sufficient currency for a pull, **When** they initiate a pull, **Then** the system deducts the currency cost and displays a pull animation showing the materials received
2. **Given** a viewer performs a pull, **When** the pull completes, **Then** the materials are added to their inventory with appropriate rarity distribution (60% common, 25% uncommon, 12% rare, 3% legendary)
3. **Given** a viewer has insufficient currency, **When** they attempt a pull, **Then** they see a clear message indicating how much more currency they need
4. **Given** a viewer performs multiple pulls in sequence, **When** reviewing their inventory afterward, **Then** all materials from all pulls are correctly accumulated

---

### User Story 3 - Bonus Character Drops (Priority: P1)

As a viewer performing pulls, I want a chance to receive a complete character directly, so that I experience the excitement of lucky rare drops while still receiving guaranteed materials.

**Why this priority**: The bonus character drop creates the "wow" moments that make gacha systems engaging. Without this, the system feels purely deterministic and loses the excitement factor.

**Independent Test**: Can be tested by performing pulls and verifying that approximately 5% result in bonus character drops. Delivers "excitement and unexpected delight" independent of other features.

**Acceptance Scenarios**:

1. **Given** a viewer performs a pull, **When** the random bonus triggers (~5% chance), **Then** they receive both the guaranteed materials AND a complete character
2. **Given** a viewer receives a bonus character drop, **When** viewing the pull result, **Then** the character is clearly highlighted as a special bonus with distinct visual treatment
3. **Given** a viewer receives a bonus character, **When** checking their collection, **Then** the character appears immediately with a unique serial number
4. **Given** the bonus system over 1000 test pulls, **When** analyzing the results, **Then** character rarity distribution matches the defined rates (70% common, 20% rare, 8% epic, 2% legendary)

---

### User Story 4 - Character Crafting (Priority: P1)

As a viewer who has collected materials, I want to craft specific characters using recipes, so that I can deterministically obtain characters I want without relying on luck.

**Why this priority**: Crafting provides the deterministic path that makes the system fair and prevents pure gambling frustration. Essential for user retention and satisfaction.

**Independent Test**: Can be tested by granting test materials matching a recipe and verifying successful craft. Delivers "goal-oriented progression and achievement satisfaction."

**Acceptance Scenarios**:

1. **Given** a viewer has all required materials for a recipe, **When** they initiate crafting, **Then** the materials are consumed and a character is created with a unique serial number
2. **Given** a viewer is viewing available recipes, **When** they select a recipe they cannot yet craft, **Then** they clearly see which materials they have and which they still need
3. **Given** a viewer crafts a character, **When** the crafting completes, **Then** they see a success animation and the character appears in their collection
4. **Given** a viewer attempts to craft without sufficient materials, **When** they try to confirm the craft, **Then** the action is prevented with a clear explanation

---

### User Story 5 - Collection Viewing (Priority: P2)

As a viewer who has obtained characters, I want to view my complete collection with details about each character, so that I can appreciate what I've collected and track my progress.

**Why this priority**: While not blocking other features, collection viewing provides the satisfaction and goal visibility that encourages continued engagement. Necessary for a complete MVP experience.

**Independent Test**: Can be tested by granting test characters and verifying they display correctly with all details. Delivers "collection satisfaction and progress visibility."

**Acceptance Scenarios**:

1. **Given** a viewer has collected multiple characters, **When** they open their collection view, **Then** they see all characters displayed with rarity-appropriate visual treatment
2. **Given** a viewer is viewing a character in their collection, **When** they select it, **Then** they see details including serial number, rarity, craft date, and visual effects matching the rarity tier
3. **Given** a viewer has no characters yet, **When** they open the collection view, **Then** they see an encouraging message and guidance on how to obtain their first character
4. **Given** a viewer has duplicate characters, **When** viewing their collection, **Then** duplicates are clearly indicated with quantities

---

### User Story 6 - Inventory Management (Priority: P2)

As a viewer accumulating materials, I want to view my material inventory and see what I can craft, so that I can plan my progression and understand what I'm working towards.

**Why this priority**: Inventory visibility enables strategic decision-making and goal-setting. Secondary to the core mechanics but necessary for good user experience.

**Independent Test**: Can be tested by granting various materials and verifying accurate display and recipe matching. Delivers "clarity and strategic planning ability."

**Acceptance Scenarios**:

1. **Given** a viewer has materials in inventory, **When** they open the inventory view, **Then** they see all materials organized by rarity tier with accurate quantities
2. **Given** a viewer is viewing their inventory, **When** they select a material, **Then** they see which recipes use that material
3. **Given** a viewer has nearly enough materials for a recipe, **When** viewing recipes, **Then** recipes are sorted to show craftable and nearly-craftable options first
4. **Given** a viewer receives new materials, **When** the pull completes, **Then** their inventory updates in real-time without requiring a page refresh

---

### User Story 7 - Pull Animation Experience (Priority: P3)

As a viewer performing pulls, I want an engaging visual experience during pulls, so that the action feels exciting and rewarding rather than instant and forgettable.

**Why this priority**: While important for engagement, the core mechanic works without polish. This is a quality-of-life enhancement that can be simplified for MVP.

**Independent Test**: Can be tested by performing pulls and observing animation timing and visual feedback. Delivers "emotional engagement and excitement."

**Acceptance Scenarios**:

1. **Given** a viewer initiates a pull, **When** the animation plays, **Then** it completes within 3-4 seconds with clear anticipation building
2. **Given** a pull results in a rare or legendary material, **When** the animation reveals the result, **Then** the rarity is immediately apparent through distinct visual effects
3. **Given** a pull includes a bonus character, **When** the animation plays, **Then** there's a special indication before revealing the character
4. **Given** a viewer prefers faster pulls, **When** they adjust settings (future enhancement), **Then** animation duration can be reduced to 1-2 seconds

---

### User Story 8 - Quest Deployment & Participation (Priority: P2)

As a viewer with collected characters, I want to deploy characters on quests to gather materials while watching streams, so that I have an active way to earn resources beyond passive pulling.

**Why this priority**: Quests solve the "useless low-tier character" problem by giving all characters utility value. Creates active engagement and social gameplay without being required for progression (pulls still viable).

**Independent Test**: Can be tested by deploying characters on quests, waiting for completion, and verifying material rewards. Delivers "active engagement and character utility value."

**Acceptance Scenarios**:

1. **Given** a viewer has at least one character, **When** they open the quest interface, **Then** they see available quest zones with duration options (Short: up to 5min, Medium: 15-20min, Long: 30-45min)
2. **Given** a viewer selects 1-3 characters for deployment, **When** they start a quest, **Then** an invitation appears in the extension overlay for other viewers to join (silent, no chat spam)
3. **Given** a quest is in progress, **When** other viewers click to join, **Then** the party size increases and success rate bonus is applied (+5% per joiner, max +50%)
4. **Given** a quest completes successfully, **When** rewards are distributed, **Then** all participants receive quality-varied materials (Low/Normal/High quality)
5. **Given** a viewer is leading a quest, **When** they watch ≥50% of the quest duration, **Then** they receive a +10% success rate bonus
6. **Given** a viewer has characters on an active quest, **When** they try to deploy those same characters again, **Then** they see a message indicating characters are busy
7. **Given** a quest fails, **When** rewards are distributed, **Then** participants receive small consolation rewards (10% of success yield)

---

### User Story 9 - Community Encounters (Priority: P2)

As a viewer in an active channel, I want to participate in community encounters where we collectively attack a boss for better rewards, so that I experience shared gameplay moments with other viewers.

**Why this priority**: Encounters encourage chat activity and social interaction, creating memorable stream moments. Secondary to core mechanics but high engagement value.

**Independent Test**: Can be tested by triggering an encounter, having multiple test viewers attack, and verifying reward distribution based on contribution. Delivers "community engagement and social gameplay."

**Acceptance Scenarios**:

1. **Given** an encounter spawns in the channel, **When** viewers see the notification, **Then** they can deploy characters to attack the encounter
2. **Given** an encounter is active, **When** a viewer deploys a character to attack, **Then** their attack power is calculated based on character rarity, traits, and level
3. **Given** an encounter's HP depletes to zero, **When** victory occurs, **Then** all participants receive quality materials with bias toward Higher quality
4. **Given** an encounter is defeated, **When** rewards are distributed, **Then** top 3 contributors receive bonus materials (MVP rewards)
5. **Given** an encounter scales with active chat size, **When** more viewers chat, **Then** the encounter becomes stronger but rewards increase proportionally
6. **Given** an encounter ends in defeat, **When** timeout occurs, **Then** all participants receive small consolation rewards
7. **Given** a viewer attacks an encounter, **When** they try to attack again, **Then** they see a message that each character can only attack once per encounter

---

### User Story 10 - Material Quality System (Priority: P2)

As a viewer accumulating materials, I want to see material quality variants in my inventory, so that I can strategically use higher quality materials to craft more efficiently.

**Why this priority**: Quality adds strategic depth without complexity. Enables optimization layer for engaged players while remaining optional for casual play.

**Independent Test**: Can be tested by performing pulls/quests and verifying materials drop with quality variants and are correctly tracked. Delivers "strategic depth and optimization gameplay."

**Acceptance Scenarios**:

1. **Given** a viewer receives materials from a pull, **When** viewing the results, **Then** each material displays its quality tier (Low/Normal/High) with visual indicators
2. **Given** a viewer has materials of varying quality, **When** they view their inventory, **Then** materials are grouped by type and show quality breakdowns (e.g., "Wood: 50 Low, 120 Normal, 8 High")
3. **Given** a viewer is crafting a character, **When** they select materials to consume, **Then** they see the quality-adjusted point values and can choose which quality to use
4. **Given** a viewer has the "Scavenger" character trait active, **When** that character completes a quest, **Then** the High quality material chance increases by +10%
5. **Given** a recipe requires 500 points of a material, **When** a viewer uses materials, **Then** they can mix qualities (e.g., 250 Normal + 125 High = 500 points)
6. **Given** a viewer receives a Legendary material, **When** viewing its quality, **Then** it is always Normal or High quality (never Low)
7. **Given** a viewer views material tooltips, **When** hovering, **Then** they see equivalent value conversions (e.g., "8 High = 16 Normal = 32 Low")

---

### User Story 11 - Character Traits System (Priority: P2)

As a viewer collecting characters, I want each character to have unique procedural traits that affect gameplay, so that duplicate characters feel distinct and strategic collection matters.

**Why this priority**: Traits create variety and optimization gameplay. Makes low-tier characters potentially valuable based on traits, supporting the quest system's character utility goals.

**Independent Test**: Can be tested by crafting/pulling multiple characters and verifying traits are assigned, displayed, and affect gameplay mechanics. Delivers "collection variety and strategic optimization."

**Acceptance Scenarios**:

1. **Given** a viewer crafts or pulls a character, **When** they receive the character, **Then** the character has 1-3 randomly assigned traits based on rarity (Common: 1 trait, Legendary: 2-3 traits)
2. **Given** a character has the "Speedster" trait, **When** deployed on a quest, **Then** the quest duration is reduced by 25%
3. **Given** a character has the "Warrior" trait, **When** deployed in an encounter, **Then** its attack power is increased by +50%
4. **Given** a character has the "Lucky Charm" trait, **When** in the viewer's inventory, **Then** the viewer's bonus character drop rate increases by +0.5%
5. **Given** a viewer views a character card, **When** examining traits, **Then** tooltips explain the mechanical effects clearly
6. **Given** a viewer has multiple copies of the same character, **When** comparing them, **Then** each may have different traits (creates strategic collecting)
7. **Given** a viewer filters their collection by traits, **When** using the collection view, **Then** they can find all characters with specific traits (e.g., all "Scavenger" characters)

---

### Edge Cases

- Currency and material inventory have no enforced limits for MVP (database integer limits serve as de facto maximum)
- How does the system handle rapid repeated pull attempts (spam clicking)? → Addressed by FR-013 (2-second rate limit)
- What happens if a viewer closes the extension mid-pull-animation? → Pull transaction must complete server-side before animation starts
- How does the system prevent double-spending of materials during crafting? → Addressed by FR-022 (atomic consumption)
- What happens when displaying a collection with hundreds of characters (performance)? → SC-003 validates performance up to 100 characters; beyond that is acceptable degradation for MVP
- How are pull results calculated to prevent client-side manipulation? → Addressed by FR-011 (server-side calculation)
- What happens if the viewer's session expires while they have unsaved progress? → Addressed by FR-040 (commit before feedback)
- How does the system handle viewers with ad blockers that might interfere with the extension? → Graceful degradation; Twitch extension APIs should work regardless
- What happens if a viewer opens the extension in multiple tabs/devices? → Last-write-wins conflict resolution; each session shows optimistic updates

## Requirements *(mandatory)*

### Functional Requirements

#### Currency System
- **FR-001**: System MUST track currency balance per viewer with persistent storage
- **FR-002**: System MUST automatically award currency at a configured rate (default: 10 Dust per 5 minutes of watch time)
- **FR-003**: System MUST validate watch time eligibility before awarding currency using Twitch's native watch time API (with fallback to client heartbeat if API unavailable)
- **FR-004**: System MUST prevent currency balance from going negative during pull transactions
- **FR-005**: Currency transactions MUST be atomic (deduction and reward occur together or not at all)

#### Pull Mechanics
- **FR-006**: System MUST support three pull tiers with defined currency costs: Single Pull, 5-Pull Batch, and 10-Pull Batch
- **FR-007**: Pull material yields MUST be: Single Pull produces 1-3 materials, 5-Pull Batch produces 10-20 materials, 10-Pull Batch produces up to 50 materials
- **FR-008**: Each material within a pull MUST follow rarity distribution (60% common, 25% uncommon, 12% rare, 3% legendary)
- **FR-009**: Each pull tier MUST have a separate ~5% chance per pull for a bonus character drop (5-Pull has 5 chances, 10-Pull has 10 chances)
- **FR-010**: Bonus character drops MUST follow rarity distribution (70% common, 20% rare, 8% epic, 2% legendary)
- **FR-011**: Pull randomness MUST be server-side calculated to prevent manipulation
- **FR-012**: System MUST display pull results clearly showing all materials and any bonus characters
- **FR-013**: System MUST rate-limit pulls to prevent spam (minimum 2 seconds between pull initiations per user)

#### Materials & Inventory
- **FR-014**: System MUST define hardcoded materials for the test channel (4-6 materials per tier)
- **FR-015**: System MUST track material quantities per viewer
- **FR-016**: Materials MUST be categorized by rarity tier (Common, Uncommon, Rare, Legendary)
- **FR-017**: System MUST display material inventory with quantities and rarity indicators
- **FR-018**: Material inventory MUST update immediately when pulls complete

#### Crafting System
- **FR-019**: System MUST define hardcoded recipes for test channel characters
- **FR-020**: Each recipe MUST specify required materials and quantities
- **FR-021**: System MUST validate material availability before allowing craft execution
- **FR-022**: System MUST consume materials atomically when crafting (all or nothing)
- **FR-023**: Crafting MUST create a character with a unique global serial number
- **FR-024**: System MUST display recipe list showing which recipes are craftable with current materials
- **FR-025**: Common character recipes MUST be immediately available (no research required for MVP)

#### Character System
- **FR-026**: Each character instance MUST have a unique serial number (format: S1-[CHAR_ID]-[SERIAL])
- **FR-027**: Characters MUST be associated with rarity tiers (Common, Rare, Epic, Legendary)
- **FR-028**: System MUST track which viewer owns each character instance
- **FR-029**: Characters MUST persist across sessions
- **FR-030**: System MUST track creation date/time for each character
- **FR-031**: Characters MUST display with rarity-appropriate visual styling

#### Collection Display
- **FR-032**: System MUST display all characters owned by the viewer
- **FR-033**: Collection view MUST show character name, rarity, serial number, and creation date
- **FR-034**: Collection MUST be sortable by rarity and creation date
- **FR-035**: System MUST handle duplicate characters by showing quantity or multiple instances
- **FR-036**: Empty collection state MUST provide helpful guidance to new users

#### Data Persistence
- **FR-037**: All viewer data (currency, materials, characters) MUST persist across sessions
- **FR-038**: System MUST associate data with Twitch viewer ID
- **FR-039**: System MUST handle first-time viewers by initializing their data with a starting balance of 250 Dust (enough for one 5-pull batch with buffer)
- **FR-040**: Data updates MUST be committed before showing success feedback to users

#### Extension Interface
- **FR-041**: Extension MUST render in Twitch panel view
- **FR-042**: Extension MUST authenticate viewers via Twitch JWT tokens
- **FR-043**: Extension MUST handle mobile viewport (375px minimum width)
- **FR-044**: Extension MUST provide navigation between currency/pull, crafting, inventory, and collection views
- **FR-045**: Extension MUST display loading states during data fetches
- **FR-046**: Extension MUST display user-friendly error messages when operations fail

#### Quest System
- **FR-047**: System MUST support three quest duration tiers: Short (up to 5min), Medium (15-20min), Long (30-45min)
- **FR-048**: System MUST allow viewers to deploy 1-3 characters per quest
- **FR-049**: Characters deployed on quests MUST be locked (cannot be deployed to multiple quests simultaneously)
- **FR-050**: Quest success rate MUST calculate as: Base (60%) + Character Traits (0-30%) + Party Size (+5% per joiner, max +50%) + Watch Time Bonus (+10% if leader watched ≥50%)
- **FR-051**: Quest invitations MUST appear in extension overlay (not chat) for silent party formation
- **FR-052**: System MUST support up to 10 participants per quest (including leader)
- **FR-053**: Quest rewards MUST include quality-varied materials based on success/failure outcome
- **FR-054**: Failed quests MUST provide consolation rewards (10% of success yield)
- **FR-055**: System MUST enforce maximum 3 simultaneous quests per viewer
- **FR-056**: System MUST enforce minimum 5-minute cooldown between creating new quests
- **FR-056a**: Quest state lifecycle MUST follow: PENDING (party formation allowed), ACTIVE (in progress, no new joins), SUCCESS/FAILED (outcome determined), CLAIMED (rewards distributed)
- **FR-056b**: PENDING phase duration MUST scale by tier: Short (30s), Medium (60s), Long (90s), with leader option to force-start early
- **FR-056c**: Database schema MUST track quest state transitions and prevent invalid state changes
- **FR-056d**: Rewards MUST auto-claim immediately when quest transitions to SUCCESS/FAILED state, with notification to all participants
- **FR-057**: System MUST track watch time during quests for active watch bonus calculation

#### Encounter System
- **FR-058**: System MUST allow viewers to deploy characters to attack active encounters
- **FR-059**: Encounter difficulty MUST scale based on active chat size (viewers who chatted in last 5 minutes)
- **FR-060**: Attack power MUST calculate based on: Character rarity (Common:1, Rare:3, Epic:7, Legendary:15) + Character traits + Character level
- **FR-061**: System MUST track encounter HP and deplete based on cumulative attacks
- **FR-062**: Each character MUST only be able to attack once per encounter
- **FR-063**: System MUST distribute victory rewards to all participants with bias toward Higher quality materials
- **FR-064**: System MUST identify and reward top 3 contributors with MVP bonuses
- **FR-065**: Defeated encounters MUST provide small consolation rewards
- **FR-066**: Encounter duration MUST be 10-30 minutes depending on difficulty scaling
- **FR-066a**: Encounter state lifecycle MUST follow: PENDING (awaiting first attack), ACTIVE (receiving attacks), SUCCESS/FAILED (outcome determined), CLAIMED (rewards distributed)
- **FR-066b**: Database schema MUST track encounter state transitions and enforce one-attack-per-character constraint
- **FR-066c**: Rewards MUST auto-claim immediately when encounter transitions to SUCCESS/FAILED state, with notification to all participants

#### Material Quality System
- **FR-067**: All material drops (pulls, quests, encounters) MUST include quality variants: Low (0.5x), Normal (1.0x), High (2.0x)
- **FR-068**: Pull quality distribution MUST be: Low (50%), Normal (45%), High (5%)
- **FR-069**: Quest quality distribution MUST be: Low (60%), Normal (35%), High (5%)
- **FR-070**: Encounter quality distribution MUST be: Low (30%), Normal (50%), High (20%)
- **FR-071**: Legendary materials MUST never drop as Low quality (Normal or High only)
- **FR-072**: Bonus character pulls MUST increase High quality chance by +2%
- **FR-073**: System MUST track quality per material stack in inventory
- **FR-074**: Inventory UI MUST display consolidated material view with total point value, revealing quality breakdown (Low/Normal/High quantities) on hover or click for clean presentation with granular detail
- **FR-075**: Crafting UI MUST allow viewers to select which quality materials to consume
- **FR-076**: Crafting MUST default to consuming lowest quality materials first (configurable by viewer)
- **FR-077**: Material tooltips MUST show equivalent value conversions (e.g., "8 High = 16 Normal = 32 Low")

#### Character Trait System
- **FR-078**: Every character instance MUST receive 1-3 procedural traits on creation based on rarity
- **FR-079**: Common characters MUST receive 1 trait (60% positive, 30% neutral, 10% negative distribution)
- **FR-080**: Rare characters MUST receive 1-2 traits (80% positive, 15% neutral, 5% negative distribution)
- **FR-081**: Epic characters MUST receive 2 traits (90% positive, 10% neutral distribution)
- **FR-082**: Legendary characters MUST receive 2-3 traits (100% positive, all optimal)
- **FR-083**: Traits MUST be randomly assigned using deterministic seed (character ID + timestamp) for reproducibility and debugging
- **FR-084**: Traits MUST be permanent (no re-rolling in MVP)
- **FR-085**: Traits MUST be visible immediately after character acquisition
- **FR-086**: Character cards MUST display traits with tooltips explaining mechanical effects
- **FR-087**: Collection view MUST support filtering by trait type
- **FR-088**: Quest deployment UI MUST show trait bonuses in real-time
- **FR-089**: System MUST support trait categories: Gathering (quest bonuses), Combat (encounter bonuses), Efficiency (mechanics), Luck (passive bonuses), Trade-off (balanced pos/neg)
- **FR-090**: Character traits MUST affect gameplay mechanics as specified (e.g., "Scavenger" +10% High Quality chance)

### Key Entities

- **Viewer**: The Twitch user interacting with the extension
  - Has a unique Twitch ID
  - Has a currency balance
  - Has an inventory of materials
  - Has a collection of character instances
  - Has watch time tracking state

- **Currency (Dust)**: The base currency earned from watching
  - Has a balance amount per viewer
  - Has earning rate configuration
  - Has pull cost definition

- **Material**: Crafting components obtained from pulls
  - Has a name and description
  - Has a rarity tier (Common, Uncommon, Rare, Legendary)
  - Has a point value (1, 5, 25, 100)
  - Exists in viewer inventory with quantities

- **Recipe**: Blueprint for crafting a character
  - Defines which character it creates
  - Specifies required materials and quantities
  - Has a total point budget
  - Has availability status (for MVP, all Common recipes are available)

- **Character Definition**: The template for a character type
  - Has a unique character ID
  - Has a name and visual design reference
  - Has a rarity tier
  - Has associated recipes

- **Character Instance**: A specific owned copy of a character
  - Has a globally unique serial number
  - References a character definition
  - Has an owner (viewer)
  - Has creation timestamp
  - Has acquisition method (pull/craft)

- **Pull Result**: The outcome of a gacha pull
  - Contains guaranteed materials with quantities
  - May contain a bonus character instance
  - Has transaction timestamp
  - Associated with the viewer who pulled

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Viewers can perform a complete cycle (watch → earn → pull → craft → collect) within 10 minutes using accelerated test settings
- **SC-002**: Pull animations complete within 3-4 seconds providing clear feedback
- **SC-003**: Collection view displays instantly (under 1 second) for collections up to 100 characters
- **SC-004**: Material pull rarity distribution matches defined percentages within ±2% over 1000 test pulls
- **SC-005**: Bonus character drop rate averages 5% within ±1% over 1000 test pulls
- **SC-006**: Zero instances of duplicate serial numbers across all character instances
- **SC-007**: Extension loads successfully in both desktop and mobile Twitch panel views
- **SC-008**: Viewer data persists correctly across browser sessions with 100% consistency
- **SC-009**: System prevents all attempts to craft without sufficient materials
- **SC-010**: System prevents all attempts to pull without sufficient currency
- **SC-011**: First-time viewers see helpful onboarding messaging explaining the core mechanics
- **SC-012**: Extension renders without errors in both Chrome and Firefox

## Assumptions *(mandatory)*

### Technical Assumptions
- Twitch extension framework and JWT authentication are available and functional
- Twitch provides native watch time API for extensions (with client heartbeat fallback if needed)
- Database (PostgreSQL via Supabase) is accessible and configured
- A single test Twitch channel is available for development and testing
- Viewer session state can be maintained via Twitch's extension architecture
- Asset hosting for character artwork is available (can use placeholder images for MVP)
- Concurrent sessions use last-write-wins conflict resolution with optimistic UI updates

### Scope Assumptions
- This MVP is single-tenant only (hardcoded for one test channel)
- Character artwork can use placeholders or simple designs
- No community research system needed (all recipes immediately available)
- No character leveling or bonding in MVP
- No breakdown/recycling of characters in MVP
- No trading or cross-viewer interactions
- No integration with Twitch Bits or subscriptions
- No EventSub integration for hype trains or special events
- No broadcaster commands or moderator features
- No website or browser overlay components
- Animation quality can be basic/simplified for MVP validation

### Design Assumptions
- Default earning rate of 10 Dust per 5 minutes is reasonable for testing
- New viewers start with 250 Dust to immediately experience the 5-pull batch mechanic
- Pull costs are balanced for testing timeframe: Single Pull (50 Dust), 5-Pull Batch (225 Dust - 10% discount), 10-Pull Batch (400 Dust - 20% discount)
- Batch pulls offer cost efficiency incentives while maintaining engagement pacing
- No enforced limits on currency or material inventory for MVP (database integer limits sufficient)
- 4-6 materials per rarity tier provides sufficient variety without overwhelming
- Common character recipes require materials totaling ~100 points
- Rare character recipes require materials totaling ~500 points
- MVP includes at least 3 Common characters and 2 Rare characters for testing variety

### User Behavior Assumptions
- Viewers understand basic gacha mechanics or will learn through experimentation
- Mobile viewers comprise a significant portion of audience (responsive design required)
- Viewers will engage with the extension while passively watching streams
- The core loop is engaging enough to validate the concept without polish

## Out of Scope *(mandatory)*

The following are explicitly excluded from this MVP to maintain focus on core mechanics:

### Features Deferred to Later Phases
- Multi-tenant support and creator dashboard
- Community research system for unlocking recipes
- Character leveling and bond systems
- Character breakdown/recycling mechanics
- Trading between viewers
- Cross-channel collection and visitor badges
- Twitch Bits integration and monetization
- Subscription benefits and premium features
- EventSub integration (hype trains, raids, subscriptions)
- Broadcaster and moderator chat commands
- Platform website (streamlets.com/streamlets.app)
- Browser source overlay for OBS
- Constellations and cross-character sets
- Community Tides (platform-wide events)
- Global leaderboards and statistics
- Streamer-created custom quest zones (using system defaults for MVP)
- Character trait re-rolling mechanics

### Technical Features Deferred
- Advanced animation and visual effects polish
- Sound effects and audio feedback
- Customizable pull animation speeds
- Performance optimizations beyond basic requirements
- Analytics and telemetry systems
- Admin tools and dashboards
- Automated testing infrastructure (manual testing acceptable for MVP)

### Design Features Deferred
- Custom theme support
- Accessibility features beyond basic semantic HTML
- Internationalization and multiple language support
- Dark mode or alternative color schemes
- Advanced collection filtering and search
- Export or sharing of collections

## Dependencies *(mandatory)*

### External Dependencies
- **Twitch Extension Platform**: Required for hosting, authentication, and viewer integration
- **Twitch Developer Account**: Required for extension registration and testing
- **Twitch JWT Tokens**: Required for viewer authentication
- **PostgreSQL Database**: Required via Supabase for data persistence
- **Supabase Account**: Required for database hosting and management

### Internal Dependencies
- **Character Artwork**: Need at least 5 character designs (3 common, 2 rare) with placeholder acceptable
- **Material Artwork**: Need visual assets for materials across rarity tiers (icons acceptable)
- **Recipe Definitions**: Need balanced recipes defined before crafting can be tested
- **Test Twitch Channel**: Need a channel configured with extension for testing

### Technical Stack Dependencies
- SvelteKit framework (version specified in constitution)
- TypeScript compiler and type definitions
- Drizzle ORM for type-safe database queries
- Twitch Extension Helper library for JWT validation

## Open Questions

None - all critical decisions have been resolved with documented assumptions above. The MVP scope is intentionally narrow to enable rapid validation of core mechanics.
