# Phase 2 Completion: Migration & Seeding Instructions

## Overview
All Phase 2 foundational tasks are prepared and ready for execution. The migration and seed scripts need to be run when Node.js environment is available.

## Pre-Execution Status
✅ **T019**: Migration file created with all database schema
✅ **T020**: PostgreSQL sequences and generate_serial function added
⏳ **T025**: Ready for execution

## Required Commands (Execute in Terminal)

### 1. Run Database Migration
```bash
cd backend
npm run db:migrate
# OR
pnpm run db:migrate
# OR
./node_modules/.bin/tsx src/db/migrate.ts
```

### 2. Seed Database with Initial Data
```bash
cd backend
npm run db:seed
# OR
pnpm run db:seed
# OR
./node_modules/.bin/tsx src/db/seed.ts
```

## What These Commands Will Do

### Migration (T025a)
- Apply all database schema changes from `backend/src/db/migrations/0000_open_captain_britain.sql`
- Create 8 tables: viewers, material_definitions, material_inventory, character_definitions, character_instances, recipes, recipe_materials, pull_results
- Add all foreign key constraints and indexes
- Create 5 PostgreSQL sequences for character serial numbers
- Create the `generate_serial()` function

### Seeding (T025b)
- Insert 14 material definitions (4 common, 4 uncommon, 4 rare, 2 legendary)
- Insert 5 character definitions (3 common, 2 rare)
- Insert 5 recipe definitions with point budgets
- Insert recipe material junction table entries
- Create serial number sequences for each character
- Create generate_serial function for unique serial number generation

## Expected Output

### Migration Success
```
🔄 Running database migrations...
✅ Migrations completed successfully
```

### Seeding Success
```
🌱 Starting database seeding...
📦 Inserting material definitions...
   ✓ Inserted 14 materials
🎭 Inserting character definitions...
   ✓ Inserted 5 characters
📢 Creating serial number sequences...
   ✓ Created sequence: char_gpuff_seq
   ✓ Created sequence: char_cbird_seq
   ✓ Created sequence: char_starf_seq
   ✓ Created sequence: char_cowl_seq
   ✓ Created sequence: char_phoenix_seq
📜 Creating generate_serial function...
   ✓ Created generate_serial function
📋 Inserting recipes...
   ✓ Inserted 5 recipes
🔗 Inserting recipe materials...
   ✓ Inserted 13 recipe material entries
✅ Database seeding completed successfully!
```

## Verification Commands

### Check Tables Created
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### Check Material Definitions
```sql
SELECT id, name, rarity, point_value FROM material_definitions ORDER BY rarity, point_value;
```

### Check Character Definitions
```sql
SELECT id, name, rarity FROM character_definitions ORDER BY rarity, name;
```

### Check Recipes
```sql
SELECT id, char_id, total_point_cost FROM recipes ORDER BY total_point_cost;
```

### Check Sequences Created
```sql
SELECT sequence_name FROM information_schema.sequences WHERE sequence_name LIKE 'char_%_seq';
```

### Test Generate Serial Function
```sql
SELECT generate_serial('GPUFF') as serial_test;
```

## Post-Execution Validation
After running both commands, Phase 2 will be 100% complete and ready for Phase 3 & 4 execution.

**Expected Result**: 25/25 Phase 2 tasks complete ✅