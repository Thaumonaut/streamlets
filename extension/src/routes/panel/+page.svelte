<script lang="ts">
  import type { ComponentType } from 'svelte';
  import RootPanel from '../+page.svelte';

  export const ssr = false;
  export const prerender = false;

  const PanelComponent: ComponentType = RootPanel;
</script>

<svelte:component this={PanelComponent} />
