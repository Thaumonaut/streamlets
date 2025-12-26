/**
 * Script to add new epic materials to the database
 */

import { db } from './index';
import { materialDefinitions } from './schema';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function addEpicMaterials() {
  console.log('🎨 Adding new epic materials...');

  const epicMaterials = [
    { id: 'NEXUS', name: 'Nexus Shard', rarity: 'epic' as const, pointValue: 50, description: 'A shard from the cosmic nexus', iconUrl: null },
    { id: 'VOID_ESSENCE', name: 'Void Essence', rarity: 'epic' as const, pointValue: 50, description: 'Essence extracted from the void', iconUrl: null },
    { id: 'ASTRAL_GEM', name: 'Astral Gem', rarity: 'epic' as const, pointValue: 50, description: 'A gem infused with astral energy', iconUrl: null },
  ];

  try {
    for (const material of epicMaterials) {
      await db.insert(materialDefinitions).values(material).onConflictDoNothing();
      console.log(`   ✓ Added ${material.name} (${material.rarity})`);
    }
    console.log('✅ All epic materials added successfully!');
  } catch (error) {
    console.error('❌ Error adding materials:', error);
    throw error;
  }
}

// Run if called directly
addEpicMaterials()
  .then(() => {
    console.log('✅ Complete, exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
