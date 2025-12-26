<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { dustBalance } from '$lib/store';
  import { sendWatchTimeHeartbeat } from '$lib/api';

  // TODO: Get actual channel ID from Twitch context
  const CHANNEL_ID = 'test-channel';
  const HEARTBEAT_INTERVAL = 60000; // 60 seconds

  let heartbeatTimer: number | null = null;
  let lastHeartbeat: Date | null = null;
  let heartbeatError: string | null = null;

  async function sendHeartbeat() {
    try {
      const response = await sendWatchTimeHeartbeat(CHANNEL_ID);
      dustBalance.set(response.newBalance);
      lastHeartbeat = new Date();
      heartbeatError = null;

      if (import.meta.env.DEV) {
        console.log('[Heartbeat] Awarded:', response.awarded, 'New balance:', response.newBalance);
      }
    } catch (error) {
      heartbeatError = error instanceof Error ? error.message : 'Heartbeat failed';
      console.error('[Heartbeat] Error:', error);
    }
  }

  onMount(() => {
    // Start heartbeat timer
    heartbeatTimer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Send initial heartbeat after 5 seconds (give time for UI to load)
    setTimeout(sendHeartbeat, 5000);
  });

  onDestroy(() => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
  });
</script>

<div class="currency-display">
  <div class="currency-summary">
    <div class="currency-icon" aria-hidden="true">💎</div>
    <div class="currency-info">
      <span class="currency-label">Dust</span>
      <span class="currency-amount">{$dustBalance.toLocaleString()}</span>
    </div>
  </div>

  <div class="status-cluster">
    {#if import.meta.env.DEV && lastHeartbeat}
      <span class="heartbeat-status" title={`Last heartbeat ${new Date(lastHeartbeat).toLocaleTimeString()}`}>
        <span class="heartbeat-indicator" aria-hidden="true">●</span>
        <span class="heartbeat-time">{new Date(lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </span>
    {/if}

    {#if heartbeatError}
      <span class="heartbeat-error" title={heartbeatError}>⚠️</span>
    {/if}
  </div>
</div>

<style>
  .currency-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.65rem 0.85rem;
    background: linear-gradient(135deg, rgba(145, 71, 255, 0.18), rgba(191, 148, 255, 0.05));
    border-radius: 12px;
    border: 1px solid rgba(145, 71, 255, 0.35);
    box-shadow: 0 8px 20px rgba(17, 17, 26, 0.3);
  }

  .currency-summary {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .currency-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.12);
    font-size: 1.3rem;
    line-height: 1;
  }

  .currency-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .currency-label {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.85;
  }

  .currency-amount {
    font-size: 1.15rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .status-cluster {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.65rem;
  }

  .heartbeat-status {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.45rem;
    border-radius: 999px;
    background: rgba(76, 175, 80, 0.16);
    color: #b0ffcb;
  }

  .heartbeat-indicator {
    color: #4ade80;
    animation: pulse 2s ease-in-out infinite;
  }

  .heartbeat-time {
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }

  .heartbeat-error {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
    font-size: 0.9rem;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
