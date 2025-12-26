# Design Evolution: Quest/Expedition Systems & Material Quality

**Created**: 2025-12-19
**Status**: Design Review - Pending Approval
**Constitution Impact**: MINOR (New systems, expanded gameplay)

---

## Executive Summary

This document proposes a significant evolution of the Streamlets gameplay loop, moving from a simple "watch → pull → craft" model to an active engagement system where characters have utility beyond collection. The core additions are:

1. **Quest/Expedition System** - Characters deployed on timed missions to gather materials
2. **Material Quality Multipliers** - Materials have 0.5x/1.0x/2.0x value variants
3. **Community Quest Participation** - Multi-viewer cooperation for improved rewards
4. **Character Trait System** - Procedurally generated skills with streamer customization
5. **Raid Event Integration** - Cross-streamer "Caravan" system

---

## 1. Design Validation: Logical Consistency Analysis

### ✅ **What Works Well**

#### 1.1 Solves the "Useless Low-Tier" Problem

**Current Issue**: Common/Rare characters feel like crafting fodder with no intrinsic value.

**Solution**: Every character becomes a "worker" with potential utility:
- Commons may have valuable gathering passives
- Rares might have niche skills that suddenly matter
- Creates "Wait, I actually need this!" moments for low-tier pulls

**Verdict**: ✅ Excellent solution that aligns with Constitution Principle XII (Collector Experience)

#### 1.2 Encourages Community Interaction

**Design Goal**: Quest participation creates social gameplay without forcing competition.

**Implementation**:
- Quest creator initiates via overlay button (no chat spam)
- Others join silently via extension UI
- Everyone benefits (cooperative, not competitive)
- Success bonuses scale with participation (+5% per joiner, capped at +50%)

**Verdict**: ✅ Aligns with Constitution Principle VIII (Community Over Competition)

#### 1.3 Material Quality Creates Depth Without Bloat

**Current Issue**: Too many material variants clutter inventory.

**Solution**: Track one item with quality multiplier:
- Low Quality (Chipped): 0.5x value
- Normal Quality: 1.0x value
- High Quality (Pristine): 2.0x value

**Example**: Recipe requires 500 points of Wood
- 500 Normal Wood OR
- 250 High Quality Wood OR
- 1000 Low Quality Wood

**Verdict**: ✅ Elegant solution preventing inventory bloat while adding strategic depth

#### 1.4 Raid Events Drive Cross-Channel Discovery

**Design Goal**: Encourage viewers to stay after raids.

**Implementation**:
- Raid triggers "Caravan" animation in extension
- Watching raided channel for 5 minutes completes journey
- Reward: Supply crate with materials from origin channel + bonus items for destination channel

**Verdict**: ✅ Natural cross-pollination that benefits all parties

---

### ⚠️ **Potential Issues & Recommended Fixes**

#### 2.1 Quest System Could Enable Idle/Bot Farming

**Problem**: If quests are truly passive (just deploy and wait), users could:
- Open multiple browser tabs
- Run on multiple accounts
- AFK farm while not actually watching

**Recommended Fix**: Add Active Watch Requirements
```
Quest Success Formula:
Base Success Rate: 60%
+ Character Skills: +0-30%
+ Community Participation: +5% per joiner (max +50%)
+ ACTIVE WATCH TIME: +10% if leader watched ≥50% of quest duration
= Final Success Rate (capped at 95%, never 100%)
```

**Why This Works**:
- Incentivizes genuine viewership
- Doesn't punish legitimate multitasking
- Prevents pure AFK farming
- Aligns with Constitution Principle VII (currency earned through watching)

#### 2.2 Material Quality Could Break Economy Balance

**Problem**: If high-quality materials are too common:
- Crafting becomes trivial
- Low-quality materials become worthless
- Economy inflates rapidly

**Recommended Fix**: Quality Distribution Curve
```
Quest Rewards Quality Distribution:
- Low Quality (0.5x): 60%
- Normal Quality (1.0x): 35%
- High Quality (2.0x): 5%

Weighted Average: (0.6×0.5) + (0.35×1.0) + (0.05×2.0) = 0.75x

Result: Quests slightly less efficient than pulls (intentional)
```

**Character Skills Can Shift This**:
- "Scavenger" trait: +10% High Quality chance (5% → 15%)
- "Unlucky" trait: +10% Low Quality chance (60% → 70%)

**Why This Works**:
- Quests feel rewarding but don't replace pulls
- High quality materials remain special
- Character traits have meaningful impact
- Economy stays balanced

#### 2.3 Cross-Channel Raid Events Could Be Exploited

**Problem**: Users could "raid farm" by:
- Streamer A raids Streamer B (both using extension)
- Everyone gets free materials
- Streamers collude to raid each other repeatedly

**Recommended Fix**: Raid Event Cooldowns & Limits
```
Raid Caravan Rules:
1. Each viewer can only receive ONE caravan reward per raiding channel per 24h
   - Example: If PuffTheStreamer raids CozyGamer, you get 1 reward
   - If PuffTheStreamer raids again later, you don't get another

2. Raiding channel must have been live for ≥1 hour before raid
   - Prevents "raid farms" where streamers go live just to raid

3. Reward scales with raid size (minimum 10 viewers)
   - Small test raids don't trigger rewards

4. Viewer must have earned ≥10 Dust in raiding channel today
   - Proves they actually watched, not just opened tab
```

**Why This Works**:
- Legitimate raids feel rewarding
- Prevents farming/exploitation
- Encourages genuine cross-channel engagement
- Protects small streamers from being "raid targets"

#### 2.4 Quest Duration Could Conflict With Pull Cooldown

**Current System**:
- Pull cooldown: 2 seconds (from Constitution, Technical Constraints)
- Watch time heartbeat: 60 seconds

**New System**:
- Quest duration: 15-60 minutes

**Potential Conflict**: If quests are TOO efficient, pulls become obsolete.

**Recommended Fix**: Quest Material Yields vs Pull Yields
```
Expected Value Comparison (normalized to 1 hour):

Passive Watching:
- Earn 10 Dust per 5 minutes = 120 Dust/hour
- Spend on single pulls (50 Dust) = 2.4 pulls/hour
- Average yield: 2.4 × 2 materials × 0.75 weighted quality = 3.6 quality-adjusted materials/hour

Active Questing:
- Send 3 characters on 60-minute quest
- Base success: 60%
- Expected yield per quest: 4-6 materials × 60% success × 0.75 quality = 1.8-2.7 materials/hour per character
- Total: 5.4-8.1 materials/hour (BETTER than passive)

BUT requires:
- Having characters to deploy (must pull first)
- Active engagement (starting quests, joining parties)
- Character skills matter (optimization layer)
```

**Why This Balance Works**:
- Quests reward active engagement (good!)
- Pulls still required to GET characters for questing
- Neither system obsoletes the other
- Creates strategic choice: "Pull more or quest more?"

#### 2.5 Character Skills Could Create "Trash Tier" Characters

**Problem**: If skills are randomly assigned:
- Some characters become clearly better (always desired)
- Others become "vendor trash" (never wanted)
- Defeats the purpose of making low-tiers valuable

**Recommended Fix**: Trait Balance System
```
Trait Categories (each character gets 1-2 traits):

Gathering Traits (affect quest rewards):
- Scavenger: +10% High Quality material chance
- Fortune: +5% total material quantity
- Specialist: +20% specific material type (e.g., +20% Wood drops)

Efficiency Traits (affect quest mechanics):
- Speedster: -25% quest duration
- Leader: +10% party success rate when this character leads
- Charismatic: +2% bonus per party member (stacks with base +5%)

Luck Traits (affect pull mechanics while in inventory):
- Lucky Charm: +0.5% character bonus drop rate while owned
- Pity Accelerator: +1 pity per pull while owned (max 3 owned)

Neutral/Negative Traits (for balance):
- Lazy: +25% quest duration, +10% High Quality chance (trade-off)
- Unlucky: +10% Low Quality chance, +10% total material quantity (trade-off)
- Brave: +15% Legendary material chance, -10% success rate (high risk/reward)
```

**Trait Assignment Rules**:
1. Common characters: 1 trait (60% positive, 30% neutral, 10% negative)
2. Rare characters: 1-2 traits (80% positive, 15% neutral, 5% negative)
3. Epic characters: 2 traits (90% positive, 10% neutral, 0% negative)
4. Legendary characters: 2-3 traits (100% positive, always optimal)

**Why This Works**:
- Even "unlucky" commons have niche value (quantity over quality)
- Legendary characters are always good (maintains prestige)
- Strategic diversity (no single "best" character)
- Some characters better for certain quests

---

## 3. Constitution Alignment Check

### ✅ **Systems That Align With Existing Principles**

| New System | Constitution Principle | Alignment |
|-----------|------------------------|-----------|
| Quest System | VIII. Progression Philosophy - "Depth Over Time" | ✅ Rewards character investment, not just daily login |
| Community Participation | VIII. Progression Philosophy - "Community Over Competition" | ✅ Cooperative quests, not competitive |
| Material Quality | IX. Crafting & Research - Point Budget System | ✅ Quality multipliers fit naturally into point-based crafting |
| Raid Events | XI. Platform-First Value - Discovery | ✅ Drives cross-channel exploration |
| Character Traits | XII. Collector Experience - Variants | ✅ Creates chase targets and strategic depth |

### ⚠️ **Systems Requiring Constitution Updates**

#### 3.1 Currency Earning (Principle VII)

**Current Constitution**:
> Base Earning Rate: 10 Dust per 5 minutes watched

**New Reality**: Quests provide materials directly, bypassing currency.

**Proposed Amendment**:
```markdown
#### Currency Earning Rules

- **Base Earning Rate**: 10 Dust per 5 minutes watched (passive income)
- **Quest Material Rewards**: Active engagement system; complements pulling (see Section IX-B)
- **Design Balance**: Quests require character deployment (acquired via pulls); systems are symbiotic
```

#### 3.2 Crafting System Expansion (Principle IX)

**Current Constitution**: Only covers recipe research and point budgets.

**Required Addition**: New subsection for Quest/Expedition system.

**Proposed Amendment**: Add Section IX-B (see detailed constitution update below)

#### 3.3 Stream Integration (Principle X)

**Current Constitution**: Covers alerts, commands, EventSub.

**Missing**: Raid event mechanics.

**Proposed Amendment**:
```markdown
#### Twitch EventSub Integration

Backend MUST subscribe to relevant channel events:
- Subscriptions (trigger currency drops)
- Bits cheers (trigger currency drops)
- Hype trains (activate multiplier)
- **Raids (trigger Caravan event; see Section IX-B.4)**
```

---

## 4. Database Schema Requirements

### New Tables Required

#### 4.1 `character_traits` Table
```sql
CREATE TABLE character_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_instance_id INTEGER REFERENCES character_instances(id) ON DELETE CASCADE,
  trait_type VARCHAR(50) NOT NULL, -- 'scavenger', 'speedster', 'lucky_charm', etc.
  trait_value NUMERIC(5,2), -- Modifier value (e.g., 0.10 for +10%)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_character_traits_instance ON character_traits(character_instance_id);
```

#### 4.2 `active_quests` Table
```sql
CREATE TABLE active_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_user_id VARCHAR(100) NOT NULL REFERENCES viewers(twitch_id),
  streamer_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PREPARING', -- 'PREPARING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
  quest_zone VARCHAR(50), -- 'Forest', 'Mountain', 'Void', etc. (streamer-defined)
  deployed_characters JSONB NOT NULL, -- [{character_instance_id, char_id}]
  party_members JSONB DEFAULT '[]', -- [{user_id, joined_at}]
  base_success_rate NUMERIC(5,2) DEFAULT 0.60,
  duration_minutes INTEGER NOT NULL,
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  rewards JSONB, -- Populated on completion
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_active_quests_leader ON active_quests(leader_user_id);
CREATE INDEX idx_active_quests_streamer ON active_quests(streamer_id);
CREATE INDEX idx_active_quests_status ON active_quests(status);
CREATE INDEX idx_active_quests_expires ON active_quests(expires_at) WHERE status = 'IN_PROGRESS';
```

#### 4.3 `material_inventory` Schema Update
```sql
ALTER TABLE material_inventory
ADD COLUMN quality NUMERIC(3,2) DEFAULT 1.0 CHECK (quality IN (0.5, 1.0, 2.0));

-- Update existing rows to default quality
UPDATE material_inventory SET quality = 1.0 WHERE quality IS NULL;
```

#### 4.4 `raid_events` Table
```sql
CREATE TABLE raid_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_streamer_id VARCHAR(100) NOT NULL,
  to_streamer_id VARCHAR(100) NOT NULL,
  raid_size INTEGER NOT NULL,
  viewer_rewards JSONB DEFAULT '[]', -- [{user_id, rewarded_at}]
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_raid_events_from ON raid_events(from_streamer_id, created_at DESC);
CREATE INDEX idx_raid_events_to ON raid_events(to_streamer_id, created_at DESC);
```

#### 4.5 `viewer_raid_claims` Table (Anti-Exploit)
```sql
CREATE TABLE viewer_raid_claims (
  viewer_id VARCHAR(100) NOT NULL REFERENCES viewers(twitch_id),
  from_streamer_id VARCHAR(100) NOT NULL,
  claimed_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (viewer_id, from_streamer_id, DATE(claimed_at))
);

-- Ensures one claim per viewer per raiding streamer per day
```

---

## 5. API Endpoints Required

### 5.1 Quest System

```typescript
// POST /api/quests/create
interface CreateQuestRequest {
  characterInstanceIds: number[]; // 1-3 characters
  zone: string; // Streamer-defined zone name
  durationMinutes: 15 | 30 | 60;
}

interface CreateQuestResponse {
  questId: string;
  status: 'PREPARING';
  expiresAt: string; // ISO timestamp when quest starts
}

// POST /api/quests/join
interface JoinQuestRequest {
  questId: string;
}

interface JoinQuestResponse {
  success: boolean;
  partySize: number;
  successBonus: number; // +5% per member
}

// GET /api/quests/active
interface ActiveQuestsResponse {
  quests: Array<{
    questId: string;
    leader: string;
    zone: string;
    partySize: number;
    expiresAt: string;
  }>;
}

// POST /api/quests/claim
interface ClaimQuestRequest {
  questId: string;
}

interface ClaimQuestResponse {
  success: boolean;
  rewards: {
    materials: Array<{
      materialId: string;
      name: string;
      rarity: Rarity;
      quality: 0.5 | 1.0 | 2.0;
      quantity: number;
    }>;
  };
}
```

### 5.2 Raid Events

```typescript
// POST /api/raids/process (called by EventSub webhook)
interface ProcessRaidRequest {
  fromStreamerId: string;
  toStreamerId: string;
  raidSize: number;
  timestamp: string;
}

// GET /api/raids/check-eligibility
interface RaidEligibilityResponse {
  eligible: boolean;
  reason?: string; // "already_claimed_today" | "insufficient_watch_time" | "raid_too_small"
}

// POST /api/raids/claim
interface ClaimRaidRequest {
  raidEventId: string;
}

interface ClaimRaidResponse {
  success: boolean;
  rewards: {
    materials: Array<{
      materialId: string;
      name: string;
      quantity: number;
      quality: number;
    }>;
    bonus: string; // Description of bonus (e.g., "Welcome bonus from PuffTheStreamer!")
  };
}
```

---

## 6. Proposed Constitution Amendment

### Section IX-B: Quest & Expedition System (NEW)

Add this section after existing Section IX (Crafting & Research System):

```markdown
### IX-B. Quest & Expedition System

Characters provide utility beyond collection through deployable expeditions that gather materials while viewers watch streams.

#### Quest Mechanics

**Character Deployment**:
- Viewers select 1-3 characters from their inventory to send on a quest
- Quest duration: 15, 30, or 60 minutes (viewer's choice)
- Characters are NOT consumed; they return after quest completion
- Each character can only be on ONE quest at a time

**Quest Zones**:
- Streamers define themed zones matching their channel (e.g., "Enchanted Forest", "Cosmic Void")
- Each zone has a specific material reward table
- Zones visible in extension UI with current active quests

**Community Participation**:
- Quest creator's invitation appears in extension overlay (not chat spam)
- Other viewers can join via silent button click
- Party size: 1-10 participants (including leader)
- Success Rate Bonus: +5% per participant (capped at +50%)
- All participants receive rewards on success

**Success Calculation**:
```
Base Success Rate: 60%
+ Character Trait Bonuses: +0-30% (varies by deployed characters)
+ Party Participation: +5% per joiner (max +50%)
+ Active Watch Bonus: +10% if leader watched ≥50% of quest duration
= Final Success Rate (capped at 95%)
```

**Quest Outcomes**:
- **Success**: All participants receive material rewards
- **Failure**: Small consolation reward (10% of success yield)
- **Partial Success**: Possible with certain character traits

#### Material Quality System

Quest rewards include quality variants affecting crafting value:

| Quality Tier | Value Multiplier | Visual Indicator |
|--------------|------------------|------------------|
| Low (Chipped) | 0.5x | Cracked/damaged appearance |
| Normal | 1.0x | Standard appearance |
| High (Pristine) | 2.0x | Glowing/enhanced appearance |

**Quality Distribution** (base rates):
- Low Quality: 60%
- Normal Quality: 35%
- High Quality: 5%

**Character Traits Modify Quality**:
- "Scavenger" trait: +10% High Quality chance
- "Unlucky" trait: +10% Low Quality chance (but +10% total quantity)

**Crafting with Quality**:
- Recipes require total point value, not specific items
- Example: Recipe requires 500 points of Wood
  - 500 Normal Wood (500×1.0) OR
  - 250 High Quality Wood (250×2.0) OR
  - 1000 Low Quality Wood (1000×0.5)
- Viewer chooses which materials to use

**Inventory Management**:
- Quality tracked per material stack
- UI shows: "Wood: 50 Low, 120 Normal, 8 High"
- Auto-consume lowest quality first (configurable by viewer)

#### Character Trait System

Every character instance rolls 1-3 procedural traits upon creation:

**Trait Categories**:

| Category | Effect | Examples |
|----------|--------|----------|
| **Gathering** | Affects quest reward quality/type | Scavenger (+10% High Quality), Specialist (+20% specific material) |
| **Efficiency** | Affects quest mechanics | Speedster (-25% duration), Leader (+10% party success) |
| **Luck** | Passive bonuses while in inventory | Lucky Charm (+0.5% character drop rate), Pity Accelerator (+1 pity/pull) |
| **Trade-off** | Negative + positive balance | Lazy (+25% duration, +10% High Quality), Brave (+15% Legendary chance, -10% success) |

**Trait Assignment by Rarity**:
- **Common**: 1 trait (60% positive, 30% neutral, 10% negative)
- **Rare**: 1-2 traits (80% positive, 15% neutral, 5% negative)
- **Epic**: 2 traits (90% positive, 10% neutral)
- **Legendary**: 2-3 traits (100% positive, always optimal)

**Streamer Customization**:
- Trait names/descriptions are customizable per channel
- System trait: "Scavenger"
- Streamer rename: "Goblin Mode" or "Hoarder" (flavor text only)
- Mechanical effects remain consistent (cross-channel fairness)

**Trait Visibility**:
- Traits displayed on character card
- Tooltips explain mechanical effects
- Collection view filterable by trait

#### Quest Rewards Balance

Quest system complements pulls; neither obsoletes the other:

**Expected Value (normalized to 1 hour of watching)**:

Passive Watching → Pulling:
- Earn 120 Dust/hour
- 2.4 single pulls/hour
- ~3.6 quality-adjusted materials/hour

Active Questing:
- Deploy 3 characters on 60min quest
- ~5.4-8.1 materials/hour (including quality adjustment)
- Requires active engagement + character deployment

**Design Intent**:
- Quests reward active participation
- Pulls required to acquire characters for questing
- Strategic choice: invest in pulls for characters OR quest with existing roster
- Neither system dominates

#### Anti-Exploit Measures

**AFK Prevention**:
- Active watch requirement: Leader must watch ≥50% of quest duration for +10% success bonus
- Watch time tracked via existing heartbeat system
- Failure to watch reduces success rate (but doesn't block quest)

**Quest Spam Prevention**:
- Maximum 3 simultaneous quests per viewer
- Minimum 5-minute cooldown between creating quests
- Characters locked during active quests (can't deploy twice)

**Inventory Limits**:
- Maximum quality-adjusted material storage (e.g., 10,000 quality-points per material type)
- Prevents infinite accumulation
- Excess rewards convert to lower tiers or Dust

---

### IX-B.4 Raid Event System: "The Caravan"

When Streamer A raids Streamer B, both using the extension:

**Trigger Conditions**:
1. Raid must include ≥10 viewers
2. Raiding channel was live for ≥1 hour before raid
3. Viewer earned ≥10 Dust in raiding channel today (proves active watching)
4. Viewer hasn't claimed a reward from this raiding channel today (24h cooldown)

**Visual Experience**:
1. Extension overlay shows "Caravan Departing!" animation
2. Characters visible in Streamer A's themed wagon
3. 5-minute timer begins
4. If viewer watches raided channel for full 5 minutes, Caravan "Arrives"

**Rewards**:
- **Material Crate**: 5-10 materials from raiding channel's material pool
- **Bonus Welcome Pack** (if raided channel uses extension): 50 Dust in destination channel + starter materials
- **First-Time Bonus**: Extra materials if first time watching raided channel

**Anti-Exploit**:
- One reward per viewer per raiding channel per 24h
- Raid size must be ≥10 viewers (prevents coordinated micro-raids)
- Watch time requirement in raiding channel prevents drive-by farmers

**Streamer Benefits**:
- Encourages raiders to stay (retention after raid)
- Cross-pollinates audiences
- Creates shared moments ("We brought you gifts from PuffTheStreamer!")
- Drives discovery of new channels

**Platform Benefits**:
- Incentivizes extension adoption (both streamers benefit)
- Creates network effects
- Encourages cross-channel engagement
```

---

## 7. Implementation Path Forward

### Phase 1: Foundation (Current Sprint - Gacha Core)

**Status**: ✅ COMPLETE
- Pity system working
- Epic materials added
- Test suite validates drop rates
- Unified pity counter across materials and characters

### Phase 2A: Material Quality System (Next Sprint)

**Priority**: HIGH - Simple, High Impact

**Tasks**:
1. ✅ Add `quality` column to `material_inventory` table
2. Update `rollMaterials()` to assign quality based on distribution
3. Update inventory API to return quality-grouped materials
4. Update frontend inventory UI to display quality variants
5. Update crafting UI to show quality-adjusted progress bars
6. Test: Verify quality multipliers work in crafting

**Estimate**: 2-3 days
**Risk**: LOW (isolated change, no new systems)

### Phase 2B: Character Traits System (Following Sprint)

**Priority**: MEDIUM - Enables quest system

**Tasks**:
1. Create `character_traits` table
2. Define trait library (20-30 traits with mechanical effects)
3. Implement trait assignment on character creation
4. Update `pullsHandler` and `craftHandler` to assign traits
5. Update character instance API to return traits
6. Update frontend character cards to display traits
7. Test: Verify trait assignment and distribution

**Estimate**: 4-5 days
**Risk**: MEDIUM (complex logic, balance required)

### Phase 3: Quest System Core (Major Sprint)

**Priority**: HIGH - Core new gameplay loop

**Tasks**:
1. Create `active_quests` table
2. Implement quest creation API (`POST /api/quests/create`)
3. Implement quest join API (`POST /api/quests/join`)
4. Implement quest completion logic (cron job or event-driven)
5. Implement quest reward calculation (traits + quality + party size)
6. Update frontend with quest UI (create, browse, join)
7. Add quest status to character cards (if deployed)
8. Test: Full quest lifecycle with various party sizes

**Estimate**: 7-10 days
**Risk**: HIGH (new complex system, many edge cases)

**Blockers**: Requires Phase 2B (character traits) to be complete

### Phase 4: Raid Event System (Optional - Post-MVP)

**Priority**: LOW - Nice to have, not core MVP

**Tasks**:
1. Set up EventSub subscription for `channel.raid` events
2. Create `raid_events` and `viewer_raid_claims` tables
3. Implement raid webhook handler
4. Implement raid eligibility check API
5. Implement raid claim API
6. Update frontend with Caravan animation
7. Test: Simulate raid events, verify anti-exploit measures

**Estimate**: 5-7 days
**Risk**: MEDIUM (depends on Twitch EventSub reliability)

**Deferral Rationale**: Raid events are a discovery feature, not core to single-channel MVP. Can be added in Phase 2 (Engagement) or Phase 3 (Platform).

---

## 8. Risks & Mitigation Strategies

### Risk 1: Quest System Too Addictive (Retention Risk)

**Threat**: Players feel obligated to check quests constantly; creates FOMO.

**Mitigation**:
- Cap quest frequency (3 simultaneous, 5min cooldown)
- Long durations (15-60min) prevent constant micro-management
- Failure has small consolation reward (not punishing)
- Push notifications ONLY for completed quests, not "quest available"

### Risk 2: Material Quality Creates Inflation

**Threat**: High quality materials become expected; normal quality feels bad.

**Mitigation**:
- Keep high quality rare (5% base rate)
- Make low quality viable (just requires more quantity)
- Some recipes might prefer specific quality (future: "10 Low Quality Wood" recipes for commons)
- Display quality-adjusted totals so players see value

### Risk 3: Character Traits Create "Meta" Characters

**Threat**: Everyone wants "Scavenger" commons; other traits feel useless.

**Mitigation**:
- Diverse trait effects (gathering vs efficiency vs luck)
- No trait is universally best (speedster good for fast quests, scavenger for quality)
- Trade-off traits create interesting choices (Lazy = slow but better quality)
- Legendary characters always get top traits (maintains prestige)

### Risk 4: Quest System Development Scope Creep

**Threat**: Quest system keeps expanding; never ships.

**Mitigation**:
- MVP quest system: Basic deployment, fixed zones, simple success/fail
- Defer advanced features to Phase 2+:
  - Streamer-created custom zones ❌ (Phase 3)
  - Multi-day quests ❌ (Phase 3)
  - Quest storylines/narratives ❌ (Phase 3)
  - Quest leaderboards ❌ (Phase 2)

### Risk 5: Database Query Performance

**Threat**: Quest completion cron job creates heavy DB load.

**Mitigation**:
- Index on `active_quests.expires_at` where `status = 'IN_PROGRESS'`
- Batch process quests in groups (not one query per quest)
- Use DB triggers for automatic reward distribution
- Monitor query performance; optimize before scaling

---

## 9. Open Questions for User Decision

### Q1: Quest Duration Options

**Proposal**: 15min, 30min, 60min

**Alternative**: Also allow 3h, 6h, 12h for "overnight" quests?

**Trade-offs**:
- ✅ Longer quests better for casual players (check once per day)
- ❌ Longer quests harder to balance (too rewarding or not worth it?)
- ❌ Longer durations reduce engagement frequency

**Recommendation**: Start with 15/30/60, add longer durations in Phase 2 if requested.

---

### Q2: Quest Zones

**Proposal**: Streamers define zones with themed material pools.

**Alternative**: Platform provides default zones; streamers customize visually?

**Trade-offs**:
- ✅ Streamer-defined zones create unique channel identity
- ❌ Streamer-defined zones require creator dashboard (Phase 3)
- ✅ Platform default zones ship faster (MVP viable)

**Recommendation**:
- **Phase 1 (MVP)**: 3 platform-default zones (Forest, Mountain, Void)
- **Phase 3**: Streamer customization unlocked

---

### Q3: Material Quality in Pulls vs Quests

**Proposal**: Quests drop quality variants; pulls always drop Normal (1.0x).

**Alternative**: Pulls can also drop quality variants?

**Trade-offs**:
- ✅ Pull quality variants create more excitement
- ❌ Pull quality variants add RNG complexity (players hate bad RNG on top of RNG)
- ✅ Quest-only quality makes quests feel more rewarding

**Recommendation**: Quest-only quality for MVP; revisit in Phase 2.

---

### Q4: Character Trait Visibility Before Craft

**Proposal**: Traits assigned on creation; unknown until crafted/pulled.

**Alternative**: Show potential trait pool before crafting?

**Trade-offs**:
- ✅ Surprise traits create excitement ("Ooh, I got Scavenger!")
- ❌ Surprise traits can disappoint ("Ugh, Unlucky again")
- ✅ Hidden traits encourage collecting multiple copies

**Recommendation**: Traits are surprises for MVP; consider trait re-rolling in Phase 2.

---

## 10. Summary & Recommendation

### ✅ **Approval Recommended**

The proposed Quest/Expedition system with Material Quality and Character Traits is:

1. **Strategically Sound**: Solves the "useless low-tier" problem
2. **Technically Feasible**: Database and API changes are well-scoped
3. **Constitution-Aligned**: Fits within existing principles with minor amendments
4. **Economically Balanced**: Neither quests nor pulls dominate; they're symbiotic
5. **Community-Focused**: Encourages cooperation without forced competition
6. **Scalable**: Can start simple (MVP) and expand (Phase 2/3)

### 📋 **Required Actions**

1. **Approve Constitution Amendment**: Add Section IX-B (Quest & Expedition System)
2. **Approve Database Schema Changes**: `character_traits`, `active_quests`, quality column
3. **Approve Implementation Path**: Phase 2A (Quality) → 2B (Traits) → 3 (Quests)
4. **Decide on Open Questions**: Quest durations, zone system, quality distribution

### ⏭️ **Next Steps**

1. User reviews this document and approves/requests changes
2. Update `.specify/memory/constitution.md` with Section IX-B
3. Create database migration for quality column and character_traits table
4. Begin Phase 2A implementation (Material Quality System)

---

**Document Status**: ✅ Ready for User Review
**Constitution Impact**: MINOR version bump (1.3.2 → 1.4.0)
**Implementation Risk**: MEDIUM (new complex systems, significant scope)
**Estimated Timeline**: 3-4 weeks for full quest system (MVP scope)
