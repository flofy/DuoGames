<script>
  import { onMount, tick } from 'svelte';
  import { sound } from '../lib/sfx.svelte.js';
  import { connectRoom, isRoomCode } from '../lib/second-screen/room.js';

  // Coffre-fort 3D : web component <coffre-fort-3d> du paquet @duogames/coffre-fort.
  // three.js est lourd : le module n'est chargé que lorsqu'on lance ce jeu.
  let { mode, onpoint } = $props();
  let status = $state('loading'); // loading | ready | error
  let el = $state(null);
  let room;
  const params = new URLSearchParams(window.location.search);
  const remoteDisplay = params.get('screen') === 'display' && isRoomCode(params.get('room') || '');

  onMount(() => {
    let alive = true;
    import('@duogames/coffre-fort').then(
      async () => {
        if (!alive) return;
        status = 'ready';
        await tick();
        if (remoteDisplay) {
          room = connectRoom({
            code: params.get('room'),
            role: 'display',
            onMessage: (message) => {
              if (message?.type === 'controller:motion') {
                el?.dispatchEvent(new CustomEvent('remoteinput', { detail: { v: message.v } }));
              } else if (message?.type === 'controller:ready') {
                el?.dispatchEvent(new Event('remote-ready'));
              } else if (message?.type === 'room:peer') {
                el?.dispatchEvent(new CustomEvent('remote-peer', { detail: { role: message.role, connected: message.connected !== false } }));
              }
            }
          });
        }
      },
      () => { if (alive) status = 'error'; }
    );
    return () => {
      alive = false;
      room?.close();
    };
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
  <coffre-fort-3d bind:this={el} {mode} muted={!sound.on} remote={remoteDisplay}></coffre-fort-3d>
{:else}
  <p class="msg outlined">{status === 'error' ? 'Impossible de charger le coffre 😕' : 'Chargement du coffre…'}</p>
{/if}

<style>
  coffre-fort-3d { width: 100%; height: 100%; }
  .msg { margin: 0; font-size: 22px; font-weight: 700; color: #fff; text-align: center; }
</style>
