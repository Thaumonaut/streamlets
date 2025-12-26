<script lang="ts">
  import { characters } from '$lib/store';

  const rarityColors: Record<string, string> = {
    common: '#9ca3af',
    uncommon: '#10b981',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
  };

  function getRarityColor(rarity: string): string {
    return rarityColors[rarity.toLowerCase()] || rarityColors.common;
  }

  // Sort characters by rarity (legendary first), then by acquisition date (newest first)
  const rarityOrder: Record<string, number> = {
    legendary: 0,
    epic: 1,
    rare: 2,
    uncommon: 3,
    common: 4,
  };

  $: sortedCharacters = [...$characters].sort((a, b) => {
    const rarityDiff = (rarityOrder[a.rarity.toLowerCase()] || 99) - (rarityOrder[b.rarity.toLowerCase()] || 99);
    if (rarityDiff !== 0) return rarityDiff;

    // Sort by date, newest first
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
</script>

<div class="collection-panel">
  <div class="panel-header">
    <h2 class="panel-title">Character Collection</h2>
    <div class="character-count">{$characters.length} collected</div>
  </div>

  {#if sortedCharacters.length === 0}
    <div class="empty-state">
      <p class="empty-icon">🎭</p>
      <p class="empty-message">No characters yet</p>
      <p class="empty-hint">Characters have a 5% drop chance per pull!</p>
    </div>
  {:else}
    <div class="characters-grid">
      {#each sortedCharacters as character}
        <div class="character-card" style="border-color: {getRarityColor(character.rarity)};">
          <div class="character-badge" style="background: {getRarityColor(character.rarity)};">
            {character.rarity}
          </div>
          <div class="character-icon">🎭</div>
          <div class="character-info">
            <div class="character-name">{character.name}</div>
            <div class="character-serial">{character.serialNumber}</div>
            <div class="character-acquisition">
              {character.acquisitionMethod === 'pull' ? '🎰 Pulled' : '⚒️ Crafted'}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .collection-panel {
    background: #1f1f23;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #2c2c30;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    color: #efeff1;
  }

  .character-count {
    font-size: 0.875rem;
    font-weight: 600;
    color: #adadb8;
    padding: 0.25rem 0.75rem;
    background: #2c2c30;
    border-radius: 12px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
  }

  .empty-icon {
    font-size: 3rem;
    margin: 0 0 1rem 0;
    opacity: 0.5;
  }

  .empty-message {
    font-size: 1rem;
    font-weight: 600;
    color: #efeff1;
    margin: 0 0 0.5rem 0;
  }

  .empty-hint {
    font-size: 0.875rem;
    color: #adadb8;
    margin: 0;
  }

  .characters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .character-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 1rem;
    background: linear-gradient(135deg, #18181b 0%, #1f1f23 100%);
    border: 2px solid;
    border-radius: 8px;
    transition: all 0.2s;
    overflow: hidden;
  }

  .character-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
  }

  .character-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #000;
  }

  .character-icon {
    font-size: 2.5rem;
    margin: 0.5rem 0;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }

  .character-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
  }

  .character-name {
    font-size: 0.875rem;
    font-weight: 700;
    text-align: center;
    color: #efeff1;
    line-height: 1.2;
  }

  .character-serial {
    font-size: 0.625rem;
    font-weight: 600;
    font-family: 'Courier New', monospace;
    color: #adadb8;
    background: #2c2c30;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .character-acquisition {
    font-size: 0.625rem;
    color: #adadb8;
    margin-top: 0.25rem;
  }
</style>
