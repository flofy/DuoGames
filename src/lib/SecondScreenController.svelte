<script>
  import { onMount } from 'svelte';
  import Dial from './Dial.svelte';
  import { connectRoom, isRoomCode } from './second-screen/room.js';

  const params = new URLSearchParams(window.location.search);
  const code = (params.get('room') || '').toUpperCase();
  let angle = $state(0);
  let status = $state('connecting');
  let room;

  onMount(() => {
    if (!isRoomCode(code)) {
      status = 'invalid';
      return;
    }
    room = connectRoom({
      code,
      role: 'controller',
      onStatus: (next) => { status = next; }
    });
    return () => room?.close();
  });

  $effect(() => {
    if (status === 'connected') room?.send({ type: 'controller:angle', angle });
  });
</script>

<main>
  <header>
    <span class="eyebrow">DUOGAMES · MANETTE</span>
    <h1>🔐 Coffre-fort</h1>
    <p>Salle <strong>{code || '—'}</strong></p>
  </header>
  {#if status === 'invalid'}
    <p class="notice error">Ce code de salle est invalide. Rejoins la salle depuis l’écran du jeu.</p>
  {:else}
    <p class="notice" class:connected={status === 'connected'}>
      <i></i>
      {status === 'connected' ? 'Connecté à l’écran' : status === 'connecting' ? 'Connexion à l’écran…' : 'Connexion perdue. Réessaie depuis la salle.'}
    </p>
    <section>
      <h2>Tourne la molette</h2>
      <p>Ton téléphone contrôle la molette du joueur 1 sur le grand écran.</p>
      <div class="dial"><Dial bind:angle disabled={status !== 'connected'} /></div>
      <output>{Math.round(angle)}°</output>
    </section>
  {/if}
</main>

<style>
  main { min-height: 100dvh; max-width: 520px; margin: auto; padding: max(24px, env(safe-area-inset-top)) 22px max(24px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; align-items: center; gap: 18px; }
  header { text-align: center; }
  .eyebrow { font-size: 12px; letter-spacing: 2px; font-weight: 700; }
  h1 { margin: 8px 0; font-size: 34px; color: #fff; -webkit-text-stroke: 6px var(--ink); paint-order: stroke fill; }
  header p { margin: 0; font-size: 18px; }
  .notice { display: flex; align-items: center; gap: 8px; background: #fff; border: 3px solid var(--ink); border-radius: 14px; padding: 10px 14px; font-weight: 700; box-shadow: 0 4px 0 var(--ink); }
  .notice i { width: 10px; height: 10px; border-radius: 50%; background: #e5a000; }
  .notice.connected i { background: #16a36a; }
  .notice.error { color: #b42318; }
  section { width: 100%; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: rgba(255,255,255,.45); border: 3px solid var(--ink); border-radius: 26px; padding: 22px 12px; box-shadow: 0 6px 0 var(--ink); }
  h2 { margin: 0; font-size: 25px; }
  section p { text-align: center; margin: 0; max-width: 290px; }
  .dial { width: min(78vw, 300px); aspect-ratio: 1; display: grid; place-items: center; }
  .dial :global(.dial) { --s: min(72vw, 280px); }
  output { font-size: 28px; font-weight: 700; }
</style>
