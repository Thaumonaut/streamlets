<script lang="ts">
  import { onMount } from 'svelte';
  import { getInventory } from '$lib/api';
  import { updateViewerState, isLoading, errorMessage, setError } from '$lib/store';
  import { parseJWTPayload, getAuthToken } from '$lib/auth';
  import DevSetup from '../components/DevSetup.svelte';

  let initialized = false;

  onMount(async () => {
    try {
      isLoading.set(true);

      // Check for JWT token
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please reload the extension.');
        return;
      }

      // Parse JWT to get viewer info
      const jwtData = parseJWTPayload(token);
      if (!jwtData) {
        setError('Invalid authentication token');
        return;
      }

      console.log('Viewer authenticated:', jwtData.userId);

      // Load viewer inventory
      const inventory = await getInventory();
      updateViewerState(inventory);

      initialized = true;
    } catch (error) {
      console.error('Failed to initialize extension:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      isLoading.set(false);
    }
  });
</script>

<main class="extension-panel">
  {#if $isLoading}
    <div class="loading">
      <p>Loading Streamlets...</p>
    </div>
  {:else if $errorMessage}
    <div class="error">
      <p>Error: {$errorMessage}</p>
    </div>
  {:else if initialized}
    <div class="content">
      <h1>Streamlets</h1>
      <p>Extension loaded successfully!</p>
      <p class="dev-note">🚧 Under construction - Phase 1 MVP</p>
    </div>
  {/if}
  
  <DevSetup />
</main>

<style>
  .extension-panel {
    width: 100%;
    min-height: 300px;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #18181b;
    color: #efeff1;
  }

  .loading,
  .error,
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .error {
    color: #f44336;
  }

  h1 {
    font-size: 1.5rem;
    margin: 0 0 1rem 0;
    color: #bf94ff;
  }

  p {
    margin: 0.5rem 0;
  }

  .dev-note {
    font-size: 0.875rem;
    color: #adadb8;
    font-style: italic;
  }
</style>
