<script lang="ts">
  import { onMount } from 'svelte';

  export let message: string = '';
  export let type: 'success' | 'error' | 'info' = 'info';
  export let duration: number = 3000;
  export let onClose: () => void = () => {};

  let visible = false;

  onMount(() => {
    // Trigger entrance animation
    setTimeout(() => {
      visible = true;
    }, 10);

    // Auto-close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  });

  function handleClose() {
    visible = false;
    setTimeout(onClose, 300); // Wait for exit animation
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  const colors = {
    success: '#10b981',
    error: '#f44336',
    info: '#3b82f6',
  };
</script>

<div
  class="toast"
  class:visible
  class:success={type === 'success'}
  class:error={type === 'error'}
  class:info={type === 'info'}
  style="--toast-color: {colors[type]};"
  role="alert"
>
  <div class="toast-icon">{icons[type]}</div>
  <div class="toast-message">{message}</div>
  <button class="toast-close" on:click={handleClose}>✕</button>
</div>

<style>
  .toast {
    position: fixed;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: #1f1f23;
    border: 2px solid var(--toast-color);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    z-index: 9999;
    min-width: 250px;
    max-width: 400px;
    opacity: 0;
    transform: translateY(-100%) translateX(50%);
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .toast.visible {
    opacity: 1;
    transform: translateY(0) translateX(0);
  }

  .toast-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--toast-color);
    color: white;
    font-weight: 700;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    color: #efeff1;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .toast-close {
    background: none;
    border: none;
    color: #adadb8;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .toast-close:hover {
    background: #2c2c30;
    color: #efeff1;
  }

  .toast.success {
    border-color: #10b981;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
  }

  .toast.error {
    border-color: #f44336;
    box-shadow: 0 4px 16px rgba(244, 67, 54, 0.3);
  }

  .toast.info {
    border-color: #3b82f6;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  }

  @media (max-width: 768px) {
    .toast {
      top: 0.5rem;
      right: 0.5rem;
      left: 0.5rem;
      max-width: none;
    }
  }
</style>
