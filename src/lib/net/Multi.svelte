<script>
  // Écran « multi-appareils » : salon (choix du jeu, code) puis partie en cours.
  import Lobby from './Lobby.svelte';
  import RemoteGame from './RemoteGame.svelte';
  import { session } from './session.svelte.js';

  let { onexit } = $props();
</script>

{#if session.status === 'idle' || session.status === 'error'}
  <Lobby {onexit} />
{:else}
  <RemoteGame {onexit} />
{/if}
