<script>
  import { onMount } from 'svelte';
  import { sound } from '../lib/sfx.svelte.js';

  // Coffre-fort 3D : web component <coffre-fort-3d> du paquet @duogames/coffre-fort.
  // three.js est lourd : le module n'est chargé que lorsqu'on lance ce jeu.
  let { mode, onpoint } = $props();
  let status = $state('loading'); // loading | ready | error
  let el = $state(null);

  onMount(() => {
    import('@duogames/coffre-fort').then(
      () => (status = 'ready'),
      () => (status = 'error')
    );
  });

  // un point par manche gagnée (winner : 1, 2 ou 0 pour une égalité)
  $effect(() => {
    if (!el) return;
    const end = (e) => {
      const w = e.detail?.winner;
      if (w) onpoint(w);
    };
    el.addEventListener('roundend', end);
    return () => el.removeEventListener('roundend', end);
  });
</script>

{#if status === 'ready'}
  <coffre-fort-3d bind:this={el} {mode} muted={!sound.on}></coffre-fort-3d>
{:else}
  <p class="msg outlined">{status === 'error' ? 'Impossible de charger le coffre 😕' : 'Chargement du coffre…'}</p>
{/if}

<style>
  coffre-fort-3d { width: 100%; height: 100%; }
  .msg { margin: 0; font-size: 22px; font-weight: 700; color: #fff; text-align: center; }
</style>
