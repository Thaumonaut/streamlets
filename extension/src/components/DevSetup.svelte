<script lang="ts">
  import { onMount } from 'svelte';
  import { setDevAuthToken } from '$lib/auth';
  
  let tokens: Record<string, string> = {};
  let selectedToken = 'viewer';
  let showSetupPanel = false;
  let statusMessage = '';
  let isRegenerating = false;

  // Get the API base URL from the same environment variable as api.ts
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  onMount(async () => {
    // Check if we're in development mode
    if (import.meta.env.DEV) {
      loadDevTokens();
    }
  });

  async function loadDevTokens() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dev/tokens`);
      if (response.ok) {
        const data = await response.json();
        tokens = data;
        statusMessage = '✓ Dev tokens loaded';
      } else {
        // Try to load from localStorage if backend not available
        const stored = localStorage.getItem('dev_tokens');
        if (stored) {
          tokens = JSON.parse(stored);
          statusMessage = '✓ Dev tokens loaded from cache';
        }
      }
    } catch (error) {
      const stored = localStorage.getItem('dev_tokens');
      if (stored) {
        tokens = JSON.parse(stored);
        statusMessage = '✓ Dev tokens loaded from cache';
      }
    }
  }

  async function regenerateTokens() {
    isRegenerating = true;
    statusMessage = '⏳ Regenerating tokens...';

    try {
      const response = await fetch(`${API_BASE_URL}/api/dev/regenerate-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        tokens = {
          viewer: data.viewer,
          broadcaster: data.broadcaster,
          moderator: data.moderator,
        };
        statusMessage = '✓ Tokens regenerated!';
        // Clear current token so user needs to reselect
        localStorage.removeItem('dev_auth_token');
      } else {
        statusMessage = '❌ Failed to regenerate tokens';
      }
    } catch (error) {
      statusMessage = '❌ Error regenerating tokens';
      console.error('Regenerate error:', error);
    } finally {
      isRegenerating = false;
    }
  }

  function useToken(role: string) {
    const token = tokens[role];
    if (!token) {
      statusMessage = '❌ Token not found for role: ' + role;
      return;
    }

    setDevAuthToken(token);
    selectedToken = role;
    statusMessage = `✓ Using ${role} token`;

    // Reload the page to apply the token
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  function clearToken() {
    localStorage.removeItem('dev_auth_token');
    setDevAuthToken('');
    statusMessage = '✓ Cleared auth token';
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
</script>

<div class="dev-setup">
  {#if import.meta.env.DEV}
    <button class="setup-toggle" on:click={() => (showSetupPanel = !showSetupPanel)}>
      ⚙️ Dev Setup
    </button>

    {#if showSetupPanel}
      <div class="setup-panel">
        <h2>Development Token Setup</h2>

        {#if statusMessage}
          <div class="status-message">
            {statusMessage}
          </div>
        {/if}

        <div class="token-buttons">
          {#each Object.entries(tokens) as [role, _]}
            <button
              class="token-button"
              class:active={selectedToken === role}
              on:click={() => useToken(role)}
            >
              {role.toUpperCase()}
            </button>
          {/each}
        </div>

        <button class="regenerate-button" on:click={regenerateTokens} disabled={isRegenerating}>
          {isRegenerating ? '⏳ Regenerating...' : '🔄 Regenerate Tokens'}
        </button>

        <button class="clear-button" on:click={clearToken}>
          Clear Token
        </button>

        <div class="info">
          <p>📌 Development mode detected</p>
          <p>💡 Click a role to select a test token</p>
          <p>🔄 Regenerate tokens without leaving the app</p>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .dev-setup {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
  }

  .setup-toggle {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
  }

  .setup-toggle:hover {
    background: #0056b3;
  }

  .setup-panel {
    position: fixed;
    bottom: 70px;
    right: 20px;
    background: white;
    border: 2px solid #007bff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 320px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  h2 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #333;
  }

  .status-message {
    padding: 10px;
    background: #e8f5e9;
    border-left: 3px solid #4caf50;
    margin-bottom: 15px;
    font-size: 13px;
    color: #2e7d32;
    border-radius: 2px;
  }

  .token-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }

  .token-button {
    flex: 1;
    min-width: 80px;
    padding: 8px 12px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #333;
    transition: all 0.2s;
  }

  .token-button:hover {
    background: #e8e8e8;
    border-color: #999;
  }

  .token-button.active {
    background: #007bff;
    color: white;
    border-color: #0056b3;
  }

  .clear-button {
    width: 100%;
    padding: 8px 12px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 15px;
    transition: background 0.2s;
  }

  .clear-button:hover {
    background: #d32f2f;
  }

  .regenerate-button {
    width: 100%;
    padding: 8px 12px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 10px;
    transition: background 0.2s;
  }

  .regenerate-button:hover:not(:disabled) {
    background: #45a049;
  }

  .regenerate-button:disabled {
    background: #cccccc;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .info {
    background: #f9f9f9;
    padding: 10px;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
    line-height: 1.6;
  }

  .info p {
    margin: 5px 0;
  }
</style>
