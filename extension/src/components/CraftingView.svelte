<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { getRecipes, craftCharacter, getInventory } from '$lib/api';
  import { materials, characters, updateViewerState } from '$lib/store';
  import type { MaterialInventoryItem, Recipe } from '@project-puff/shared';

  let recipes: Recipe[] = [];
  let loading = true;
  let error: string | null = null;
  let crafting = false;
  let craftingRecipeId: string | null = null;
  let showCraftSuccess = false;
  let craftedCharacter: { name: string; serialNumber: string; rarity: string } | null = null;
  let isInitialized = false;
  let previousMaterialsSignature: string | null = null;
  let recipesRefreshQueued = false;
  let isFetchingRecipes = false;

  const rarityColors: Record<string, string> = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
  };

  const rarityEmojis: Record<string, string> = {
    common: '⚪',
    rare: '💙',
    epic: '💜',
    legendary: '⭐',
  };

  function getRarityColor(rarity: string): string {
    const rarityKey = rarity.toLowerCase() as keyof typeof rarityColors;
    const color = rarityColors[rarityKey];
    if (color) {
      return color;
    }
    return rarityColors.common || '#9ca3af';
  }

  function getRarityEmoji(rarity: string): string {
    const rarityKey = rarity.toLowerCase() as keyof typeof rarityEmojis;
    const emoji = rarityEmojis[rarityKey];
    if (emoji) {
      return emoji;
    }
    return '⚪';
  }

  function getMaterialsSignature(items: MaterialInventoryItem[]): string {
    return items
      .map(item => `${item.materialId}:${item.quantity}`)
      .sort()
      .join('|');
  }

  async function loadRecipes() {
    if (isFetchingRecipes) {
      recipesRefreshQueued = true;
      return;
    }

    isFetchingRecipes = true;

    try {
      loading = true;
      error = null;
      const response = await getRecipes();
      recipes = response.recipes;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load recipes';
      console.error('Failed to load recipes:', err);
    } finally {
      loading = false;
      isFetchingRecipes = false;

      if (recipesRefreshQueued) {
        recipesRefreshQueued = false;
        await loadRecipes();
      }
    }
  }


  async function handleCraft(recipe: Recipe) {
    if (!recipe.craftable || crafting) return;

    try {
      crafting = true;
      craftingRecipeId = recipe.id;
      error = null;

      const response = await craftCharacter(recipe.id);

      // Update stores
      characters.update(chars => [...chars, response.character]);
      if (response.remainingMaterials) {
        materials.set(response.remainingMaterials);
      }

      // Refresh full inventory from API to ensure consistency
      try {
        const inventory = await getInventory();
        updateViewerState(inventory);
      } catch (err) {
        console.error('Failed to refresh inventory after craft:', err);
      }

      // Show success animation
      craftedCharacter = {
        name: response.character.name,
        serialNumber: response.character.serialNumber,
        rarity: response.character.rarity,
      };
      showCraftSuccess = true;

      // Reload recipes to update craftability
      await loadRecipes();

      // Hide success after 3 seconds
      setTimeout(() => {
        showCraftSuccess = false;
        craftedCharacter = null;
      }, 3000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to craft character';
      console.error('Craft error:', err);
    } finally {
      crafting = false;
      craftingRecipeId = null;
    }
  }

  onMount(async () => {
    await loadRecipes();
    previousMaterialsSignature = getMaterialsSignature(get(materials));
    isInitialized = true;
  });

  // Reactively reload recipes when materials change
  // This triggers whenever the materials store updates (from pulls, crafts, etc.)
  $: if (isInitialized) {
    const signature = getMaterialsSignature($materials as MaterialInventoryItem[]);
    if (signature !== previousMaterialsSignature) {
      previousMaterialsSignature = signature;
      loadRecipes();
    }
  }

  // Sort recipes: craftable first, then by rarity
  $: sortedRecipes = [...recipes].sort((a, b) => {
    if (a.craftable !== b.craftable) {
      return a.craftable ? -1 : 1;
    }
    const rarityOrder: Record<string, number> = {
      legendary: 0,
      epic: 1,
      rare: 2,
      common: 3,
    };
    return (rarityOrder[a.charRarity] || 99) - (rarityOrder[b.charRarity] || 99);
  });
</script>

<div class="crafting-view">
  <header class="panel-header">
    <div>
      <h2 class="panel-title">Character Crafting</h2>
      <p class="panel-subtitle">Fuse materials into Streamlet characters.</p>
    </div>
    <div class="recipe-pill">{recipes.length}</div>
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner">⏳</div>
      <p>Loading recipes...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <p>{error}</p>
      <button class="retry-button" on:click={loadRecipes}>Retry</button>
    </div>
  {:else if recipes.length === 0}
    <div class="empty-state">
      <p class="empty-icon">📋</p>
      <p class="empty-message">No recipes available</p>
    </div>
  {:else}
    <div class="recipes-grid">
      {#each sortedRecipes as recipe}
        <div
          class="recipe-card"
          class:craftable={recipe.craftable}
          style="border-color: {getRarityColor(recipe.charRarity)};"
        >
          <div class="recipe-header">
            <div class="character-info">
              <div class="character-badge" style="background: {getRarityColor(recipe.charRarity)};">
                {getRarityEmoji(recipe.charRarity)}
              </div>
              <div class="character-details">
                <h3 class="character-name">{recipe.charName}</h3>
                <span class="character-rarity">{recipe.charRarity}</span>
              </div>
            </div>
            {#if recipe.craftable}
              <div class="craftable-badge">✓ Ready</div>
            {/if}
          </div>

          <div class="materials-section">
            <h4 class="materials-title">Required Materials:</h4>
            <div class="materials-list">
              {#each recipe.materials as material}
                {@const progress = Math.min(100, (material.owned / material.required) * 100)}
                {@const hasEnough = material.owned >= material.required}
                <div class="material-requirement">
                  <div class="material-header">
                    <span class="material-name">{material.name}</span>
                    <span
                      class="material-count"
                      class:sufficient={hasEnough}
                    >
                      {material.owned}/{material.required}
                    </span>
                  </div>
                  <div class="material-progress">
                    <div class="material-progress-bar" style={`width: ${progress}%`}></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <button
            class="craft-button"
            class:ready={recipe.craftable && !crafting}
            disabled={!recipe.craftable || crafting}
            on:click={() => handleCraft(recipe)}
          >
            {#if crafting && craftingRecipeId === recipe.id}
              Crafting...
            {:else if recipe.craftable}
              Craft Character
            {:else}
              Gather Materials
            {/if}
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if showCraftSuccess && craftedCharacter}
    <div class="craft-success-overlay">
      <div class="success-card">
        <div class="success-icon">✨</div>
        <h2 class="success-title">Character Crafted!</h2>
        <div class="crafted-character">
          <span class="char-emoji">{getRarityEmoji(craftedCharacter.rarity)}</span>
          <div class="char-info">
            <h3>{craftedCharacter.name}</h3>
            <p class="serial-number">{craftedCharacter.serialNumber}</p>
            <p
              class="char-rarity"
              style="color: {getRarityColor(craftedCharacter.rarity)};"
            >
              {craftedCharacter.rarity}
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .crafting-view {
    background: linear-gradient(165deg, rgba(21, 21, 26, 0.96) 0%, rgba(12, 12, 15, 0.92) 100%);
    border-radius: 16px;
    padding: 1rem;
    border: 1px solid rgba(103, 58, 183, 0.2);
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .panel-title {
    font-size: 1rem;
    font-weight: 700;
    color: #ede9fe;
    margin: 0;
  }

  .panel-subtitle {
    margin: 0.2rem 0 0;
    font-size: 0.68rem;
    color: rgba(229, 231, 235, 0.65);
    letter-spacing: 0.03em;
  }

  .recipe-pill {
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    background: rgba(129, 140, 248, 0.15);
    color: #dbeafe;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
  }

  .recipes-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  @media (min-width: 540px) {
    .recipes-grid {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
  }

  .recipe-card {
    background: rgba(17, 17, 23, 0.88);
    border-radius: 14px;
    padding: 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.04);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .recipe-card.craftable {
    box-shadow: 0 10px 24px rgba(129, 140, 248, 0.18);
  }

  .recipe-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .character-info {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .character-badge {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-size: 1.4rem;
    color: #0b0b0e;
  }

  .character-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #f4f4ff;
  }

  .character-rarity {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(226, 232, 240, 0.7);
  }

  .craftable-badge {
    background: rgba(34, 197, 94, 0.18);
    color: #bbf7d0;
    padding: 0.3rem 0.55rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .materials-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .materials-title {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(209, 213, 219, 0.7);
    letter-spacing: 0.04em;
  }

  .materials-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .material-requirement {
    padding: 0.45rem 0.55rem;
    border-radius: 10px;
    background: rgba(24, 24, 32, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.15);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .material-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
  }

  .material-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .material-count {
    font-size: 0.7rem;
    font-weight: 600;
    color: rgba(226, 232, 240, 0.6);
  }

  .material-count.sufficient {
    color: #4ade80;
  }

  .material-progress {
    position: relative;
    width: 100%;
    height: 5px;
    background: rgba(148, 163, 184, 0.18);
    border-radius: 999px;
    overflow: hidden;
  }

  .material-progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(135deg, rgba(147, 197, 253, 0.9), rgba(59, 130, 246, 0.95));
    border-radius: 999px;
  }

  .craft-button {
    margin-top: 0.1rem;
    padding: 0.6rem 0.8rem;
    border-radius: 9px;
    border: none;
    background: rgba(129, 140, 248, 0.2);
    color: #dbeafe;
    font-weight: 600;
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .craft-button.ready {
    background: linear-gradient(135deg, rgba(45, 212, 191, 0.24), rgba(59, 130, 246, 0.38));
    color: #0f172a;
  }

  .craft-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .craft-button:not(:disabled):hover {
    transform: translateY(-1px);
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    gap: 0.6rem;
    text-align: center;
    color: rgba(226, 232, 240, 0.75);
  }

  .spinner {
    font-size: 1.5rem;
    animation: spin 1.1s linear infinite;
  }

  .error-icon {
    font-size: 1.4rem;
  }

  .retry-button {
    padding: 0.55rem 0.9rem;
    border-radius: 999px;
    border: 1px solid rgba(248, 113, 113, 0.35);
    background: rgba(248, 113, 113, 0.18);
    color: #fecaca;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
  }

  .empty-icon {
    font-size: 1.8rem;
  }

  .empty-message {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(226, 232, 240, 0.8);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .craft-success-overlay {
    position: fixed;
    inset: 0;
    background: rgba(5, 6, 10, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.25s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .success-card {
    background: #1f1f23;
    border-radius: 16px;
    padding: 2rem;
    border: 2px solid #10b981;
    box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);
    text-align: center;
    animation: scaleIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.5);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .success-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    animation: pulse 0.6s infinite alternate;
  }

  @keyframes pulse {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.1);
    }
  }

  .success-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #10b981;
    margin: 0 0 1.5rem 0;
  }

  .crafted-character {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    padding: 1rem;
    background: #18181b;
    border-radius: 12px;
  }

  .char-emoji {
    font-size: 3rem;
  }

  .char-info {
    text-align: left;
  }

  .char-info h3 {
    font-size: 1.25rem;
    margin: 0 0 0.25rem 0;
    color: #efeff1;
  }

  .serial-number {
    font-size: 0.875rem;
    color: #adadb8;
    margin: 0 0 0.25rem 0;
    font-family: monospace;
  }

  .char-rarity {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  @media (max-width: 768px) {
    .recipes-grid {
      grid-template-columns: 1fr;
    }

    .crafting-view {
      padding: 1rem;
    }
  }
</style>
