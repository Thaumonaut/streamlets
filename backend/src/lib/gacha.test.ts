/**
 * Gacha System Tests
 * Statistical validation of drop rates and pity mechanics
 * Run with: tsx src/lib/gacha.test.ts
 */

import {
  rollMaterialRarity,
  rollBonusCharacters,
  rollMaterials,
  calculateLegendaryRate,
} from './gacha.js';
import type { Rarity } from '@project-puff/shared';

// Test configuration
const SAMPLE_SIZES = {
  small: 100,
  medium: 1000,
  large: 10000,
};

const VARIANCE_TOLERANCE = 0.15; // ±15% variance allowed

/**
 * Helper: Calculate percentage difference from expected
 */
function calculateVariance(actual: number, expected: number): number {
  return Math.abs((actual - expected) / expected);
}

/**
 * Helper: Run multiple pulls and count results
 */
function runPullTest<T extends string>(
  pullFn: () => T,
  sampleSize: number
): Record<T, number> {
  const results: Record<string, number> = {};

  for (let i = 0; i < sampleSize; i++) {
    const result = pullFn();
    results[result] = (results[result] || 0) + 1;
  }

  return results as Record<T, number>;
}

/**
 * Simple assertion function
 */
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
}

/**
 * Test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Gacha System Statistical Tests                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Material Rarity Distribution (non-legendary, 10k pulls with pity 0)
  try {
    console.log('\n📊 Test 1: Material Rarity Distribution (10k pulls at pity 0)');
    console.log('─'.repeat(60));

    const expectedRates: Record<Rarity, number> = {
      common: 0.6,
      uncommon: 0.25,
      rare: 0.12,
      epic: 0.03,
      legendary: 0.0, // Should be 0% at pity 0
    };

    // Test at pity 0 (before legendary soft pity kicks in)
    const results = runPullTest(() => rollMaterialRarity(0), SAMPLE_SIZES.large);
    const total = SAMPLE_SIZES.large;

    (Object.entries(expectedRates) as [Rarity, number][]).forEach(([rarity, expectedRate]) => {
      const actualCount = results[rarity] || 0;
      const actualRate = actualCount / total;
      const variance = expectedRate === 0 ? 0 : calculateVariance(actualRate, expectedRate);

      console.log(
        `${rarity.padEnd(12)}: ${actualCount.toString().padStart(5)} ` +
        `(${(actualRate * 100).toFixed(2)}%) ` +
        `Expected: ${(expectedRate * 100).toFixed(2)}% ` +
        `Variance: ${variance === 0 ? '0.00' : (variance * 100).toFixed(2)}%`
      );

      if (expectedRate === 0) {
        assert(actualCount === 0, `${rarity} should have 0 drops at pity 0`);
      } else {
        assert(
          variance < VARIANCE_TOLERANCE,
          `${rarity} variance ${(variance * 100).toFixed(2)}% within ${(VARIANCE_TOLERANCE * 100)}% tolerance`
        );
      }
    });

    passedTests++;
  } catch (error) {
    failedTests++;
    console.error('Test 1 failed:', error instanceof Error ? error.message : error);
  }

  // Test 2: Bonus Character Drop Rate
  try {
    console.log('\n📊 Test 2: Bonus Character Drop Rate (10k pulls)');
    console.log('─'.repeat(60));

    const expectedRate = 0.05;
    let characterDrops = 0;
    const totalPulls = SAMPLE_SIZES.large;

    for (let i = 0; i < totalPulls; i++) {
      const { characters } = rollBonusCharacters('single', 0);
      if (characters.length > 0) {
        characterDrops++;
      }
    }

    const actualRate = characterDrops / totalPulls;
    const variance = calculateVariance(actualRate, expectedRate);

    console.log(`Character drops: ${characterDrops}/${totalPulls} (${(actualRate * 100).toFixed(2)}%)`);
    console.log(`Expected: ${(expectedRate * 100).toFixed(2)}%`);
    console.log(`Variance: ${(variance * 100).toFixed(2)}%`);

    assert(
      variance < VARIANCE_TOLERANCE,
      `Character drop rate variance ${(variance * 100).toFixed(2)}% within tolerance`
    );

    passedTests++;
  } catch (error) {
    failedTests++;
    console.error('Test 2 failed:', error instanceof Error ? error.message : error);
  }

  // Test 3: Pity System Mechanics
  try {
    console.log('\n📊 Test 3: Pity System Mechanics');
    console.log('─'.repeat(60));

    // Test hard pity at 90
    const rate90 = calculateLegendaryRate(90);
    console.log(`Pull 90 legendary rate: ${(rate90 * 100).toFixed(2)}%`);
    assert(rate90 === 1.0, 'Pull 90 guarantees legendary (100%)');

    // Test cubic scaling at various points
    const testPoints = [1, 10, 50, 75, 85, 89];
    console.log('\nCubic scaling progression:');

    testPoints.forEach((pity) => {
      const rate = calculateLegendaryRate(pity);
      console.log(`  Pull ${pity.toString().padStart(2)}: ${(rate * 100).toFixed(4)}%`);

      assert(rate < 1.0, `Pull ${pity} rate is less than 100%`);
      assert(rate >= 0, `Pull ${pity} rate is non-negative`);
    });

    // Verify rates increase monotonically in the scaling range (75+)
    const scalingPoints = [75, 80, 85, 89];
    for (let i = 0; i < scalingPoints.length - 1; i++) {
      const rate1 = calculateLegendaryRate(scalingPoints[i]!);
      const rate2 = calculateLegendaryRate(scalingPoints[i + 1]!);
      assert(
        rate2 > rate1,
        `Rates increase monotonically (${scalingPoints[i]} < ${scalingPoints[i + 1]})`
      );
    }

    // Verify flat rate before soft pity
    const preSoftPityPoints = [1, 50, 74];
    preSoftPityPoints.forEach((pity) => {
      const rate = calculateLegendaryRate(pity);
      assert(rate === 0, `Pull ${pity} has 0% legendary rate (before soft pity)`);
    });

    passedTests++;
  } catch (error) {
    failedTests++;
    console.error('Test 3 failed:', error instanceof Error ? error.message : error);
  }

  // Test 4: Pull Tier Material Counts
  try {
    console.log('\n📊 Test 4: Pull Tier Material Counts');
    console.log('─'.repeat(60));

    const tiers: Array<'single' | '5' | '10'> = ['single', '5', '10'];
    const expectedRanges = {
      single: { min: 1, max: 3 },
      '5': { min: 10, max: 20 },
      '10': { min: 25, max: 50 },
    };

    const samples = 100; // Test each tier 100 times
    tiers.forEach((tier) => {
      const counts: number[] = [];

      for (let i = 0; i < samples; i++) {
        const { materials } = rollMaterials(tier, 0); // Start at pity 0
        counts.push(materials.length);
      }

      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const min = Math.min(...counts);
      const max = Math.max(...counts);
      const { min: expectedMin, max: expectedMax } = expectedRanges[tier];

      console.log(
        `${tier.padEnd(6)} tier: avg=${avg.toFixed(1)} ` +
        `range=[${min}-${max}] expected=[${expectedMin}-${expectedMax}]`
      );

      assert(
        min >= expectedMin && max <= expectedMax,
        `${tier} tier material counts within expected range`
      );
    });

    passedTests++;
  } catch (error) {
    failedTests++;
    console.error('Test 4 failed:', error instanceof Error ? error.message : error);
  }

  // Test 5: Pity Counter Progression
  try {
    console.log('\n📊 Test 5: Pity Counter Progression');
    console.log('─'.repeat(60));

    // Test pity increments correctly
    let currentPity = 0;
    for (let i = 0; i < 10; i++) {
      const { newPityCounter } = rollBonusCharacters('single', currentPity);
      console.log(`Pull ${i + 1}: pity ${currentPity} → ${newPityCounter}`);

      assert(
        newPityCounter >= currentPity,
        `Pity counter increases or resets (${currentPity} → ${newPityCounter})`
      );

      // If pity reset, it should be 0
      if (newPityCounter < currentPity) {
        assert(newPityCounter === 0, 'Pity resets to 0 when legendary drops');
      }

      currentPity = newPityCounter;
    }

    passedTests++;
  } catch (error) {
    failedTests++;
    console.error('Test 5 failed:', error instanceof Error ? error.message : error);
  }

  // Test 6: Extensive Pity Testing - 500 pulls per tier
  try {
    console.log('\n📊 Test 6: Extensive Pity Testing (500 pulls per tier)');
    console.log('─'.repeat(60));

    const tiers: Array<'single' | '5' | '10'> = ['single', '5', '10'];

    for (const tier of tiers) {
      console.log(`\nTesting ${tier} tier with 500 pulls...`);

      let currentPity = 0;
      let legendaryDrops: Array<{ batchNumber: number; pityBefore: number; pityAfter: number }> = [];
      let totalBatches = 0;

      for (let i = 0; i < 500; i++) {
        totalBatches++;
        const pityBefore = currentPity;
        const { characters, newPityCounter } = rollBonusCharacters(tier, currentPity);

        // Check if pity reset (legendary dropped)
        // Pity can reset to 0, or be low if legendary dropped early in multi-pull batch
        if (newPityCounter < pityBefore) {
          legendaryDrops.push({
            batchNumber: totalBatches,
            pityBefore,
            pityAfter: newPityCounter,
          });
        }

        currentPity = newPityCounter;
      }

      const pullsInBatch = tier === 'single' ? 1 : tier === '5' ? 5 : 10;
      const totalPulls = totalBatches * pullsInBatch;

      console.log(`Total batches: ${totalBatches}`);
      console.log(`Total individual pulls: ${totalPulls}`);
      console.log(`Legendary drops: ${legendaryDrops.length}`);
      console.log(`Expected legendaries: ${Math.floor(totalPulls / 90)} - ${Math.ceil(totalPulls / 90) + 1}`);

      if (legendaryDrops.length > 0) {
        console.log('Legendary drop details:');
        legendaryDrops.forEach((drop, idx) => {
          console.log(`  ${idx + 1}. Batch #${drop.batchNumber}, Pity before: ${drop.pityBefore}, Pity after: ${drop.pityAfter}`);
        });

        // Calculate average pity before legendary drop
        const avgPityBefore = legendaryDrops.reduce((sum, d) => sum + d.pityBefore, 0) / legendaryDrops.length;
        console.log(`Average pity before legendary drop: ${avgPityBefore.toFixed(1)}`);

        // Verify most legendaries happen when pity is 80+ before the pull
        const dropsIn80PlusRange = legendaryDrops.filter(d => d.pityBefore >= 80).length;
        const percentageIn80Plus = (dropsIn80PlusRange / legendaryDrops.length) * 100;
        console.log(`Legendaries at pity 80+: ${dropsIn80PlusRange}/${legendaryDrops.length} (${percentageIn80Plus.toFixed(1)}%)`);

        assert(
          avgPityBefore >= 75,
          `Average pity before legendary drop should be >= 75 (was ${avgPityBefore.toFixed(1)})`
        );

        // Verify legendaries are rare enough (not more than expected)
        const maxExpectedLegendaries = Math.ceil(totalPulls / 80); // At most 1 per 80 pulls
        assert(
          legendaryDrops.length <= maxExpectedLegendaries,
          `Too many legendaries dropped: ${legendaryDrops.length} (max expected ~${maxExpectedLegendaries})`
        );
      } else {
        console.log('No legendary drops occurred (total pulls < 80 or very unlucky)');
      }
    }

    passedTests++;
  } catch (error) {
    failedTests++;
    console.error('Test 6 failed:', error instanceof Error ? error.message : error);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`✓ Passed: ${passedTests}`);
  console.log(`✗ Failed: ${failedTests}`);
  console.log(`Total:    ${passedTests + failedTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
