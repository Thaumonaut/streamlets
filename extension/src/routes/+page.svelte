<script lang="ts">
  import { onMount } from 'svelte';
  import { getInventory } from '$lib/api';
  import { updateViewerState, isLoading, errorMessage, setError } from '$lib/store';
  import { waitForAuthToken, setDevAuthToken } from '$lib/auth';
  import CurrencyDisplay from '../components/CurrencyDisplay.svelte';
  import PullPanel from '../components/PullPanel.svelte';
  import PullResults from '../components/PullResults.svelte';
  import InventoryPanel from '../components/InventoryPanel.svelte';
  import CollectionPanel from '../components/CollectionPanel.svelte';
  import CraftingView from '../components/CraftingView.svelte';
  import DevSetup from '../components/DevSetup.svelte';

  let initialized = false;
  let showPullResults = false;
  let pullResultsData: {
    materials: Array<{ materialId: string; name: string; rarity: string; quantity: number }>;
    characters: Array<{ charId: string; name: string; rarity: string }>;
  } | null = null;
  const TABS = ['play', 'characters', 'recipes', 'inventory', 'settings'] as const;
  type TabKey = typeof TABS[number];
  const TAB_LABELS: Record<TabKey, string> = {
    play: 'Play',
    characters: 'Characters',
    recipes: 'Recipes',
    inventory: 'Inventory',
    settings: 'Settings',
  };
  let activeTab: TabKey = 'play';

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

  async function handlePullComplete(event: CustomEvent) {
    pullResultsData = event.detail;
    showPullResults = true;
    // Refresh inventory from API to ensure consistency
    await refreshInventory();
  }

  function closePullResults() {
    showPullResults = false;
    pullResultsData = null;
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
            class:active={activeTab === tab}
            on:click={() => activeTab = tab}
            type="button"
          >
            {TAB_LABELS[tab]}
          </button>
        {/each}
      </nav>

      <div class="app-content">
        {#if activeTab === 'play'}
          <section class="main-section" aria-label="Play actions">
            <PullPanel on:pullComplete={handlePullComplete} />
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

    {#if showPullResults && pullResultsData}
      <PullResults
        materials={pullResultsData.materials}
        characters={pullResultsData.characters}
        onClose={closePullResults}
      />
    {/if}
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

  .tab-bar button {
    padding: 0.45rem 0.3rem;
    border-radius: 9px;
    border: 1px solid rgba(103, 58, 183, 0.22);
    background: rgba(28, 24, 48, 0.6);
    color: rgba(226, 232, 240, 0.75);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    transition: transform 0.18s ease, border 0.18s ease, color 0.18s ease;
  }

  .tab-bar button.active {
    border-color: rgba(147, 112, 255, 0.65);
    background: linear-gradient(135deg, rgba(147, 112, 255, 0.3), rgba(24, 20, 44, 0.95));
    color: #ede9fe;
    transform: translateY(-1px);
  }

  .app-content {
    flex: 1;
    overflow-y: auto;
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
