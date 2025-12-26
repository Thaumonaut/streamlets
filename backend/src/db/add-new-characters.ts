/**
 * Script to add new epic and legendary characters to the database
 */

import { db } from './index';
import { characterDefinitions } from './schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function addNewCharacters() {
  console.log('🎭 Adding new epic and legendary characters...');

  // Insert new epic characters
  const epicChars = [
    { id: 'NEBULA', name: 'Nebula Dragon', rarity: 'epic' as const, description: 'A majestic dragon born from cosmic nebulae', artworkUrl: null, season: 1 },
    { id: 'ASTRAL', name: 'Astral Guardian', rarity: 'epic' as const, description: 'An ancient guardian of the stars', artworkUrl: null, season: 1 },
    { id: 'VOID', name: 'Void Walker', rarity: 'epic' as const, description: 'A mysterious entity that walks between dimensions', artworkUrl: null, season: 1 },
  ];

  // Insert new legendary characters
  const legendaryChars = [
    { id: 'COSMOS', name: 'Cosmos Emperor', rarity: 'legendary' as const, description: 'The supreme ruler of all cosmic realms', artworkUrl: null, season: 1 },
    { id: 'CELESTIAL', name: 'Celestial Phoenix', rarity: 'legendary' as const, description: 'A divine phoenix that embodies the universe itself', artworkUrl: null, season: 1 },
  ];

  try {
    for (const char of [...epicChars, ...legendaryChars]) {
      await db.insert(characterDefinitions).values(char).onConflictDoNothing();
      const seqName = `char_${char.id.toLowerCase()}_seq`;
      await db.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`));
      console.log(`   ✓ Added ${char.name} (${char.rarity}) and sequence`);
    }
    console.log('✅ All new characters added successfully!');
  } catch (error) {
    console.error('❌ Error adding characters:', error);
    throw error;
  }
}

// Run if called directly
addNewCharacters()
  .then(() => {
    console.log('✅ Complete, exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
