<script lang="ts">
  import { dustBalance, addMaterials, updateDustBalance } from '$lib/store';
  import { executePull } from '$lib/api';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    pullComplete: {
      materials: Array<{ materialId: string; name: string; rarity: string; quantity: number }>;
      characters: Array<{ charId: string; name: string; rarity: string }>;
    };
  }>();

  const PULL_COSTS = {
    single: 50,
    '5': 225,
    '10': 400,
  } as const;

  const PULL_CONFIG = [
    { tier: 'single' as const, label: 'Single', range: '1-3 mats' },
    { tier: '5' as const, label: '5 Pull', range: '10-20 mats' },
    { tier: '10' as const, label: '10 Pull', range: '25-50 mats' },
  ];

  let isPulling = false;
  let pullError: string | null = null;

  async function handlePull(tier: 'single' | '5' | '10') {
    if (isPulling) return;

    const cost = PULL_COSTS[tier];
    if ($dustBalance < cost) {
      pullError = 'Insufficient Dust';
      setTimeout(() => pullError = null, 3000);
      return;
    }

    try {
      isPulling = true;
      pullError = null;

      const result = await executePull(tier);

      // Update dust balance
      updateDustBalance(result.newBalance);

      // Add materials to inventory (this will trigger reactivity in other components)
      addMaterials(result.materials);

      // Dispatch event with pull results
      dispatch('pullComplete', {
        materials: result.materials,
        characters: result.characters,
      });

      if (import.meta.env.DEV) {
        console.log('[Pull] Results:', result);
      }
    } catch (error) {
      pullError = error instanceof Error ? error.message : 'Pull failed';
      console.error('[Pull] Error:', error);
    } finally {
      isPulling = false;
    }
  }
</script>

<div class="pull-panel">
  <header class="panel-header">
    <div>
      <h2 class="panel-title">Gacha Pulls</h2>
      <p class="panel-description">Spend Dust to pull materials and characters</p>
    </div>
    <button
      class="pull-action"
      class:spinning={isPulling}
      on:click={() => handlePull('single')}
      disabled={isPulling}
      title="Quick single pull"
    >
      <span aria-hidden="true">⚡</span>
      <span class="sr-only">Quick single pull</span>
    </button>
  </header>

  <div class="pull-options">
    {#each PULL_CONFIG as option}
      <button
        class="pull-chip"
        class:disabled={$dustBalance < PULL_COSTS[option.tier] || isPulling}
        disabled={$dustBalance < PULL_COSTS[option.tier] || isPulling}
        on:click={() => handlePull(option.tier)}
      >
        <div class="chip-row">
          <span class="chip-label">{option.label}</span>
          <span class="chip-cost">💎 {PULL_COSTS[option.tier]}</span>
        </div>
        <span class="chip-meta">{option.range}</span>
      </button>
    {/each}
  </div>

  {#if isPulling}
    <div class="pull-status pulling">
      <span class="spinner">⏳</span>
      Pulling...
    </div>
  {/if}

  {#if pullError}
    <div class="pull-status error">{pullError}</div>
  {/if}
</div>

<style>
  .pull-panel {
    background: linear-gradient(155deg, rgba(24, 24, 27, 0.92) 0%, rgba(12, 12, 14, 0.86) 100%);
    border-radius: 14px;
    padding: 1rem;
    border: 1px solid rgba(145, 71, 255, 0.12);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .pull-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(145, 71, 255, 0.16);
    border: 1px solid rgba(145, 71, 255, 0.38);
    color: #e5dbff;
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .pull-action:hover:not(:disabled) {
    background: rgba(145, 71, 255, 0.28);
    transform: translateY(-1px);
  }

  .pull-action:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pull-action.spinning {
    animation: spin 0.9s linear infinite;
  }

  .panel-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0;
    color: #faf8ff;
    letter-spacing: 0.02em;
  }

  .panel-description {
    font-size: 0.75rem;
    color: rgba(239, 239, 241, 0.7);
    margin: 0.25rem 0 0;
    max-width: 16rem;
  }

  .pull-options {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
  }

  .pull-chip {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.65rem 0.6rem;
    border-radius: 10px;
    border: 1px solid rgba(99, 102, 241, 0.22);
    background: rgba(28, 28, 34, 0.92);
    color: #f4f4ff;
    font-family: inherit;
    cursor: pointer;
    transition: transform 0.18s ease, border 0.18s ease, box-shadow 0.18s ease;
  }

  .pull-chip:hover:not(.disabled) {
    border-color: rgba(129, 140, 248, 0.6);
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(88, 28, 135, 0.26);
  }

  .pull-chip.disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  .chip-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
  }

  .chip-label {
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .chip-cost {
    font-size: 0.78rem;
    font-weight: 600;
    color: #c7d2fe;
  }

  .chip-meta {
    font-size: 0.65rem;
    color: rgba(226, 232, 240, 0.65);
    letter-spacing: 0.05em;
  }

  .pull-status {
    margin-top: 0.5rem;
    padding: 0.5rem;
    border-radius: 8px;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .pull-status.pulling {
    background: rgba(129, 140, 248, 0.2);
    color: #c7d2fe;
  }

  .pull-status.error {
    background: rgba(248, 113, 113, 0.18);
    color: #fda4af;
  }

  .spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
