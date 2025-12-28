<script lang="ts">
  import { onMount } from 'svelte';
  import { getInventory } from '$lib/api';
  import { updateViewerState, isLoading, errorMessage, setError } from '$lib/store';
  import { waitForAuthToken, setDevAuthToken } from '$lib/auth';
  import CurrencyDisplay from '../components/CurrencyDisplay.svelte';
  import PullPanel from '../components/PullPanel.svelte';
  import InventoryPanel from '../components/InventoryPanel.svelte';
  import CollectionPanel from '../components/CollectionPanel.svelte';
  import CraftingView from '../components/CraftingView.svelte';
  import DevSetup from '../components/DevSetup.svelte';
  import SupernovaAnimation from '../components/SupernovaAnimation.svelte';
  import type { AnimationCard, Rarity, SupernovaSettings } from '$lib/animations/supernova-controller';

  let initialized = false;
  const TABS = ['play', 'characters', 'recipes', 'inventory', 'settings'] as const;
  type TabKey = typeof TABS[number];
  const TAB_LABELS: Record<TabKey, string> = {
    play: 'Play',
    characters: 'Characters',
    recipes: 'Recipes',
    inventory: 'Inventory',
    settings: 'Settings',
  };

  const TAB_ICONS: Record<TabKey, string> = {
    play: '▶️',
    characters: '👥',
    recipes: '⚗️',
    inventory: '🎒',
    settings: '⚙️',
  };
  let activeTab: TabKey = 'play';
  const animationSettings: Partial<SupernovaSettings> = {
    bloomStrength: 1.35,
    particleDensity: 1,
  };
  const rarityRank: Record<Rarity, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
  };
  let isAnimatingPull = false;
  let supernova: { play: (cards?: AnimationCard[], rarity?: Rarity) => Promise<void> | void; skip: () => void } | null = null;

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  async function attemptDevTokenFallback(): Promise<boolean> {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return false;
    }

    // Avoid infinite reload loops if a dev token is already set
    if (window.localStorage.getItem('dev_auth_token')) {
      return false;
    }

    try {
      let viewerToken: string | undefined;

      const response = await fetch(`${API_BASE_URL}/api/dev/tokens`);

      if (response.ok) {
        const tokens = await response.json() as Record<string, string | undefined>;
        viewerToken = tokens.viewer;
      } else if (response.status === 404) {
        const regen = await fetch(`${API_BASE_URL}/api/dev/regenerate-tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (regen.ok) {
          const regenerated = await regen.json() as Record<string, string | undefined>;
          viewerToken = regenerated.viewer;
        }
      }

      if (!viewerToken) {
        return false;
      }

      setDevAuthToken(viewerToken);
      return true;
    } catch (error) {
      console.error('Failed to load dev tokens for fallback:', error);
      return false;
    }
  }

  async function refreshInventory() {
    try {
      const inventory = await getInventory();
      updateViewerState(inventory);
    } catch (error) {
      console.error('Failed to refresh inventory:', error);
    }
  }

  function normalizeRarity(value: string): Rarity {
    const lowered = value.toLowerCase();
    if (['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(lowered)) {
      return lowered as Rarity;
    }
    return 'common';
  }

  function buildAnimationCards(detail: {
    materials: Array<{ materialId: string; name: string; rarity: string; quantity: number }>;
    characters: Array<{ charId: string; name: string; rarity: string }>;
  }): AnimationCard[] {
    const cards: AnimationCard[] = [];

    for (const material of detail.materials ?? []) {
      cards.push({
        id: material.materialId ?? material.name,
        title: material.name,
        rarity: normalizeRarity(material.rarity),
        quantity: material.quantity,
      });
    }

    for (const character of detail.characters ?? []) {
      cards.push({
        id: character.charId ?? character.name,
        title: character.name,
        rarity: normalizeRarity(character.rarity),
        quantity: 1,
      });
    }

    return cards;
  }

  function dominantRarity(cards: AnimationCard[]): Rarity {
    let best: Rarity = 'common';
    let bestRank = -1;
    for (const card of cards) {
      const rank = rarityRank[card.rarity] ?? 0;
      if (rank > bestRank) {
        bestRank = rank;
        best = card.rarity;
      }
    }
    return best;
  }

  async function handlePullComplete(event: CustomEvent<{
    materials: Array<{ materialId: string; name: string; rarity: string; quantity: number }>;
    characters: Array<{ charId: string; name: string; rarity: string }>;
  }>) {
    const detail = event.detail;
    const animationCards = buildAnimationCards(detail);
    const forced = dominantRarity(animationCards);

    if (animationCards.length === 0 || !supernova) {
      return;
    }

    isAnimatingPull = true;
    const inventoryPromise = refreshInventory();
    try {
      await supernova.play(animationCards, forced);
    } catch (error) {
      console.error('Supernova animation failed:', error);
    } finally {
      await inventoryPromise.catch(err => console.error('Inventory refresh failed after pull:', err));
      isAnimatingPull = false;
    }
  }

  onMount(async () => {
    try {
      isLoading.set(true);

      // Wait for Twitch helper to provide JWT token
      const auth = await waitForAuthToken({ timeoutMs: 15000 });

      console.log('Viewer authenticated:', auth.userId);

      // Load viewer inventory
      const inventory = await getInventory();
      updateViewerState(inventory);

      initialized = true;
    } catch (error) {
      console.error('Failed to initialize extension:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');

      if (error instanceof Error && error.message === 'Invalid or expired JWT token') {
        const didFallback = await attemptDevTokenFallback();
        if (didFallback) {
          setError('Switching to local dev token…');
          setTimeout(() => window.location.reload(), 250);
        }
      }
    } finally {
      isLoading.set(false);
    }
  });
</script>

<main class="extension-panel">
  {#if $isLoading}
    <div class="loading">
      <div class="spinner">⏳</div>
      <p>Loading Streamlets...</p>
    </div>
  {:else if $errorMessage}
    <div class="error">
      <div class="error-icon">⚠️</div>
      <p>Error: {$errorMessage}</p>
    </div>
  {:else if initialized}
    <div class="app-shell">
      <div class="app-header">
        <h1 class="app-title">Streamlets</h1>
        <CurrencyDisplay />
      </div>

      <nav class="tab-bar" aria-label="Streamlets sections">
        {#each TABS as tab}
          <button
            class="tab-button"
            class:active={activeTab === tab}
            on:click={() => activeTab = tab}
            type="button"
            aria-label={TAB_LABELS[tab]}
            data-tooltip={TAB_LABELS[tab]}
          >
            <span class="tab-icon">{TAB_ICONS[tab]}</span>
          </button>
        {/each}
      </nav>

      <div class="app-content">
        {#if activeTab === 'play'}
          <section class="main-section" aria-label="Play actions">
            <div class="play-stage" class:animating={isAnimatingPull}>
              <div class="supernova-viewport" class:active={isAnimatingPull} aria-hidden={!isAnimatingPull}>
                <SupernovaAnimation bind:this={supernova} settings={animationSettings} forceRarity={undefined} />
              </div>

              <div class="pull-panel-wrapper" class:dimmed={isAnimatingPull} aria-busy={isAnimatingPull}>
                <PullPanel on:pullComplete={handlePullComplete} />
              </div>
            </div>
          </section>
        {:else if activeTab === 'recipes'}
          <section class="crafting-section" aria-label="Recipes">
            <CraftingView />
          </section>
        {:else if activeTab === 'inventory'}
          <section class="inventory-section" aria-label="Inventory">
            <InventoryPanel />
          </section>
        {:else if activeTab === 'characters'}
          <section class="collection-section" aria-label="Characters">
            <CollectionPanel />
          </section>
        {:else}
          <section class="settings-section" aria-label="Settings">
            <h2>Settings</h2>
            <p>Configuration options coming soon.</p>
          </section>
        {/if}
      </div>
    </div>

  {/if}

  <DevSetup />
</main>

<style>
  .extension-panel {
    width: 100%;
    min-height: 100%;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: radial-gradient(circle at top, #1f1f26 0%, #121214 85%);
    color: #efeff1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .app-shell {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    overflow: hidden;
  }

  .loading,
  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    gap: 0.75rem;
    padding: 1.5rem;
  }

  .spinner {
    font-size: 2rem;
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .error {
    color: #f44336;
  }

  .error-icon {
    font-size: 2rem;
  }

  .app-header {
    display: flex;
    align-items: stretch;
    gap: 0.75rem;
  }

  .app-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    padding: 0.75rem 0.9rem;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(145, 71, 255, 0.18), rgba(191, 148, 255, 0.08));
    color: #c9c4ff;
    display: flex;
    align-items: center;
    letter-spacing: 0.02em;
  }

  .tab-bar {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .tab-button {
    position: relative;
    padding: 0.6rem 0.4rem;
    border-radius: 9px;
    border: 1px solid rgba(103, 58, 183, 0.22);
    background: rgba(28, 24, 48, 0.6);
    cursor: pointer;
    transition: transform 0.18s ease, border 0.18s ease, background 0.18s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tab-icon {
    font-size: 1.25rem;
    line-height: 1;
    filter: grayscale(0.3) opacity(0.75);
    transition: filter 0.18s ease;
  }

  .tab-button.active {
    border-color: rgba(147, 112, 255, 0.65);
    background: linear-gradient(135deg, rgba(147, 112, 255, 0.3), rgba(24, 20, 44, 0.95));
    transform: translateY(-1px);
  }

  .tab-button.active .tab-icon {
    filter: grayscale(0) opacity(1);
  }

  .tab-button:hover .tab-icon {
    filter: grayscale(0) opacity(1);
  }

  /* Tooltip */
  .tab-button::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%) scale(0.9);
    background: rgba(15, 12, 28, 0.95);
    color: #e2e8f0;
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    border: 1px solid rgba(147, 112, 255, 0.4);
    z-index: 10;
    letter-spacing: 0.02em;
  }

  .tab-button::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 0.15rem);
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(147, 112, 255, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 10;
  }

  .tab-button:hover::after {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }

  .tab-button:hover::before {
    opacity: 1;
  }

  .app-content {
    flex: 1;
    overflow: auto;
  }

  .play-stage {
    display: grid;
    gap: 0.75rem;
    position: relative;
    /* min-height: 80vh; */
  }

  .play-stage.animating .pull-panel-wrapper {
    transition: opacity 0.3s ease;
  }

  .supernova-viewport {
    position: relative;
    width: 100%;
    height: 0; /* Completely collapsed when not animating */
    border-radius: 12px;
    border: 1px solid rgba(96, 165, 250, 0.15);
    background: radial-gradient(circle at top, rgba(12, 18, 38, 0.85), rgba(3, 6, 14, 0.92));
    opacity: 0;
    pointer-events: none;
    transform: scale(0.96);
    transition: opacity 0.35s ease, transform 0.35s ease, height 0.4s ease;
    overflow: hidden;
  }

  .supernova-viewport.active {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
    height: 85vh; /* Take over most of the extension when playing */
    position: fixed; /* Fixed positioning to overlay */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 95vw;
    max-width: 100%;
    z-index: 1000;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  }

  .pull-panel-wrapper.dimmed {
    opacity: 0.35;
  }

  .app-content section {
    min-width: 0;
  }

  @media (min-width: 640px) {
    .app-content {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .main-section {
      grid-column: 1 / -1;
    }
  }
</style>
