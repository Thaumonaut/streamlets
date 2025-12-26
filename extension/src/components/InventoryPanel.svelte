<script lang="ts">
  import { materials } from '$lib/store';

  const rarityColors: Record<string, string> = {
    common: '#9ca3af',
    uncommon: '#10b981',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
  };

  function getRarityColor(rarity: string): string {
    const key = rarity.toLowerCase() as keyof typeof rarityColors;
    return rarityColors[key] ?? rarityColors.common;
  }

  function getRarityEmoji(rarity: string): string {
    const rarityLower = rarity.toLowerCase();
    switch (rarityLower) {
      case 'legendary': return '⭐';
      case 'epic': return '💜';
      case 'rare': return '💙';
      case 'uncommon': return '💚';
      default: return '⚪';
    }
  }

  // Sort materials by rarity (legendary first) and then by name
  const rarityOrder: Record<string, number> = {
    legendary: 0,
    epic: 1,
    rare: 2,
    uncommon: 3,
    common: 4,
  };

  $: sortedMaterials = [...$materials].sort((a, b) => {
    const rarityDiff = (rarityOrder[a.rarity.toLowerCase()] || 99) - (rarityOrder[b.rarity.toLowerCase()] || 99);
    if (rarityDiff !== 0) return rarityDiff;
    return a.name.localeCompare(b.name);
  });
</script>

<div class="inventory-panel">
  <header class="panel-header">
    <h2 class="panel-title">Materials</h2>
    <div class="material-count">{$materials.length}</div>
  </header>

  {#if sortedMaterials.length === 0}
    <div class="empty-state">
      <p class="empty-icon">📦</p>
      <p class="empty-message">No materials yet</p>
      <p class="empty-hint">Pull to collect materials!</p>
    </div>
  {:else}
    <div class="materials-grid">
      {#each sortedMaterials as material}
        <div class="material-card" style="border-color: {getRarityColor(material.rarity)};">
          <div class="material-header">
            <span class="material-emoji">{getRarityEmoji(material.rarity)}</span>
            <span class="material-quantity">×{material.quantity}</span>
          </div>
          <div class="material-name">{material.name}</div>
          <div class="material-rarity" style="color: {getRarityColor(material.rarity)};">
            {material.rarity}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .inventory-panel {
    background: linear-gradient(150deg, rgba(24, 24, 30, 0.92) 0%, rgba(16, 16, 20, 0.88) 100%);
    border-radius: 14px;
    padding: 0.9rem;
    border: 1px solid rgba(99, 102, 241, 0.16);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .panel-title {
    font-size: 0.95rem;
    font-weight: 700;
    margin: 0;
    color: #f4f4ff;
  }

  .material-count {
    font-size: 0.7rem;
    font-weight: 700;
    color: #c7d2fe;
    padding: 0.3rem 0.55rem;
    background: rgba(99, 102, 241, 0.18);
    border-radius: 999px;
    letter-spacing: 0.05em;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 0.75rem;
    text-align: center;
  }

  .empty-icon {
    font-size: 2rem;
    margin: 0 0 0.75rem 0;
    opacity: 0.5;
  }

  .empty-message {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(226, 232, 240, 0.75);
    margin: 0 0 0.35rem 0;
  }

  .empty-hint {
    font-size: 0.75rem;
    color: rgba(209, 213, 219, 0.6);
    margin: 0;
  }

  .materials-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.5rem;
  }

  .material-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 0.75rem;
    background: rgba(20, 20, 27, 0.88);
    border: 1px solid;
    border-radius: 10px;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .material-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(30, 30, 40, 0.45);
  }

  .material-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .material-emoji {
    font-size: 1.2rem;
  }

  .material-quantity {
    font-size: 0.7rem;
    font-weight: 700;
    color: #e0e7ff;
    background: rgba(129, 140, 248, 0.2);
    padding: 0.2rem 0.45rem;
    border-radius: 999px;
  }

  .material-name {
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
    color: rgba(226, 232, 240, 0.88);
    line-height: 1.2;
  }

  .material-rarity {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
</style>
