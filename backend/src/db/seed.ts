/**
 * Database seeding script for Phase 1 MVP
 * Seeds hardcoded materials, characters, and recipes
 */

import { db } from './index';
import {
  materialDefinitions,
  characterDefinitions,
  recipes,
  recipeMaterials,
} from './schema';
import {
  getMaterialsForSeeding,
  getCharactersForSeeding,
  getRecipesForSeeding,
  getRecipeMaterialsForSeeding,
  CHARACTERS,
} from '../lib/recipes';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Check if already seeded
    const existingMaterials = await db.select().from(materialDefinitions).limit(1);
    if (existingMaterials.length > 0) {
      console.log('✅ Database already seeded, skipping...');
      return;
    }

    console.log('📦 Inserting material definitions...');
    const materials = getMaterialsForSeeding();
    await db.insert(materialDefinitions).values(materials);
    console.log(`   ✓ Inserted ${materials.length} materials`);

    console.log('🎭 Inserting character definitions...');
    const characters = getCharactersForSeeding();
    await db.insert(characterDefinitions).values(characters);
    console.log(`   ✓ Inserted ${characters.length} characters`);

    console.log('🔢 Creating serial number sequences...');
    for (const char of CHARACTERS) {
      const seqName = `char_${char.id.toLowerCase()}_seq`;
      await db.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`));
      console.log(`   ✓ Created sequence: ${seqName}`);
    }

    console.log('📜 Creating generate_serial function...');
    await db.execute(sql.raw(`
      CREATE OR REPLACE FUNCTION generate_serial(p_char_id VARCHAR) RETURNS VARCHAR AS $$
      DECLARE
        serial_num INTEGER;
      BEGIN
        -- Get next sequence value (sequence name: char_{lowercase_char_id}_seq)
        EXECUTE format('SELECT nextval(%L)', 'char_' || lower(p_char_id) || '_seq') INTO serial_num;

        -- Format: S1-CHARDEF-00047 (zero-padded to 5 digits)
        RETURN 'S1-' || p_char_id || '-' || LPAD(serial_num::TEXT, 5, '0');
      END;
      $$ LANGUAGE plpgsql;
    `));
    console.log('   ✓ Created generate_serial function');

    console.log('📋 Inserting recipes...');
    const recipeData = getRecipesForSeeding();
    await db.insert(recipes).values(recipeData);
    console.log(`   ✓ Inserted ${recipeData.length} recipes`);

    console.log('🔗 Inserting recipe materials...');
    const recipeMaterialData = getRecipeMaterialsForSeeding();
    await db.insert(recipeMaterials).values(recipeMaterialData);
    console.log(`   ✓ Inserted ${recipeMaterialData.length} recipe material entries`);

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export { seed };
