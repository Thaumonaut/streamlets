<script lang="ts">
  import { onMount } from 'svelte';

  export let materials: Array<{ materialId: string; name: string; rarity: string; quantity: number }> = [];
  export let characters: Array<{ charId: string; name: string; rarity: string }> = [];
  export let onClose: () => void;

  let revealed = false;
  let skipAnimation = false;

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

  function handleSkip() {
    skipAnimation = true;
    revealed = true;
  }

  onMount(() => {
    // Start reveal animation after a brief delay
    const timer = setTimeout(() => {
      revealed = true;
    }, 300);

    return () => clearTimeout(timer);
  });
</script>

<div class="pull-results-overlay" on:click={onClose} role="button" tabindex="0">
  <div class="pull-results-modal" on:click|stopPropagation role="presentation">
    <div class="modal-header">
      <h3 class="modal-title">Pull Results</h3>
      <div class="header-actions">
        {#if !revealed && !skipAnimation}
          <button class="skip-button" on:click={handleSkip}>Skip Animation ⏩</button>
        {/if}
        <button class="close-button" on:click={onClose}>✕</button>
      </div>
    </div>

    <div class="results-content">
      <!-- Materials Section -->
      {#if materials.length > 0}
        <div class="results-section">
          <h4 class="section-title">Materials</h4>
          <div class="items-grid">
            {#each materials as material, index}
              <div
                class="result-item"
                class:revealed={revealed || skipAnimation}
                class:rare={material.rarity === 'rare'}
                class:legendary={material.rarity === 'legendary'}
                style="border-color: {getRarityColor(material.rarity)}; animation-delay: {skipAnimation ? '0s' : (index * 0.1)}s;"
              >
                <div class="item-header">
                  <span class="item-emoji">{getRarityEmoji(material.rarity)}</span>
                  <span class="item-quantity">×{material.quantity}</span>
                </div>
                <div class="item-name">{material.name}</div>
                <div class="item-rarity" style="color: {getRarityColor(material.rarity)};">
                  {material.rarity}
                </div>
                {#if (material.rarity === 'rare' || material.rarity === 'legendary') && (revealed || skipAnimation)}
                  <div class="particles"></div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Characters Section -->
      {#if characters.length > 0}
        <div class="results-section bonus">
          <h4 class="section-title">
            <span class="bonus-badge">BONUS!</span>
            Characters
          </h4>
          <div class="items-grid">
            {#each characters as character, index}
              <div
                class="result-item character"
                class:revealed={revealed || skipAnimation}
                class:rare={character.rarity === 'rare'}
                class:epic={character.rarity === 'epic'}
                class:legendary={character.rarity === 'legendary'}
                style="border-color: {getRarityColor(character.rarity)}; animation-delay: {skipAnimation ? '0s' : ((materials.length + index) * 0.1)}s;"
              >
                <div class="item-header">
                  <span class="item-emoji">🎭</span>
                  <span class="character-badge">NEW</span>
                </div>
                <div class="item-name">{character.name}</div>
                <div class="item-rarity" style="color: {getRarityColor(character.rarity)};">
                  {character.rarity}
                </div>
                <div class="particles character-particles"></div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="no-bonus">
          <p>No bonus characters this time. Try again!</p>
        </div>
      {/if}
    </div>

    <div class="modal-footer">
      <button class="continue-button" on:click={onClose}>Continue</button>
    </div>
  </div>
</div>

<style>
  .pull-results-overlay {
    position: fixed;
    min-width: 80vw;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .pull-results-modal {
    background: #18181b;
    border: 2px solid #9147ff;
    border-radius: 12px;
    max-width: 90%;
    max-height: 90vh;
    min-width: 70vw;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(145, 71, 255, 0.4);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #2c2c30;
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    color: #efeff1;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .skip-button {
    padding: 0.375rem 0.75rem;
    background: #2c2c30;
    border: none;
    border-radius: 6px;
    color: #adadb8;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .skip-button:hover {
    background: #3a3a3f;
    color: #efeff1;
  }

  .close-button {
    background: none;
    border: none;
    color: #adadb8;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-button:hover {
    background: #2c2c30;
    color: #efeff1;
  }

  .results-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .results-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .results-section.bonus {
    padding: 1rem;
    background: linear-gradient(135deg, rgba(145, 71, 255, 0.1) 0%, rgba(191, 148, 255, 0.1) 100%);
    border-radius: 8px;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
    color: #efeff1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .bonus-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: linear-gradient(135deg, #9147ff 0%, #bf94ff 100%);
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
  }

  .result-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #1f1f23;
    border: 2px solid;
    border-radius: 8px;
    transition: transform 0.2s;
    opacity: 0;
    transform: scale(0.8) translateY(10px);
    position: relative;
    overflow: hidden;
  }

  .result-item.revealed {
    animation: revealItem 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  @keyframes revealItem {
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .result-item:hover {
    transform: translateY(-2px);
  }

  .result-item.rare,
  .result-item.legendary {
    animation: revealItem 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
               shimmer 2s ease-in-out infinite 0.4s;
  }

  @keyframes shimmer {
    0%, 100% {
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
    }
  }

  .result-item.legendary {
    animation: revealItem 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
               goldenShimmer 2s ease-in-out infinite 0.4s;
  }

  @keyframes goldenShimmer {
    0%, 100% {
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
    }
    50% {
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.8);
    }
  }

  .result-item.character {
    background: linear-gradient(135deg, #1f1f23 0%, #2a2a2f 100%);
    box-shadow: 0 0 12px rgba(145, 71, 255, 0.3);
  }

  .result-item.character.revealed {
    animation: revealItem 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
               characterPulse 1.5s ease-in-out infinite 0.4s;
  }

  @keyframes characterPulse {
    0%, 100% {
      box-shadow: 0 0 12px rgba(145, 71, 255, 0.3);
    }
    50% {
      box-shadow: 0 0 24px rgba(145, 71, 255, 0.6);
    }
  }

  .item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .item-emoji {
    font-size: 1.5rem;
  }

  .item-quantity {
    font-size: 0.75rem;
    font-weight: 700;
    color: #adadb8;
  }

  .character-badge {
    padding: 0.125rem 0.375rem;
    background: #9147ff;
    border-radius: 4px;
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .item-name {
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
    color: #efeff1;
  }

  .item-rarity {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .no-bonus {
    padding: 1rem;
    text-align: center;
    color: #adadb8;
    font-size: 0.875rem;
    font-style: italic;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #2c2c30;
  }

  .continue-button {
    width: 100%;
    padding: 0.75rem;
    background: linear-gradient(135deg, #9147ff 0%, #bf94ff 100%);
    border: none;
    border-radius: 6px;
    color: #fff;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .continue-button:hover {
    background: linear-gradient(135deg, #7d3cd9 0%, #9147ff 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(145, 71, 255, 0.4);
  }

  /* Particle Effects */
  .particles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
  }

  .particles::before,
  .particles::after {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    background: rgba(59, 130, 246, 0.6);
    border-radius: 50%;
    animation: particleFloat 3s ease-in-out infinite;
  }

  .particles::before {
    top: 20%;
    left: 20%;
    animation-delay: 0s;
  }

  .particles::after {
    bottom: 20%;
    right: 20%;
    animation-delay: 1.5s;
  }

  .result-item.legendary .particles::before,
  .result-item.legendary .particles::after {
    background: rgba(245, 158, 11, 0.8);
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
  }

  .character-particles::before,
  .character-particles::after {
    background: rgba(145, 71, 255, 0.8);
    box-shadow: 0 0 8px rgba(145, 71, 255, 0.6);
  }

  @keyframes particleFloat {
    0%, 100% {
      transform: translateY(0) translateX(0);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    50% {
      transform: translateY(-30px) translateX(10px);
      opacity: 0.8;
    }
    90% {
      opacity: 1;
    }
  }
</style>
