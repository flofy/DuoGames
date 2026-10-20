<script>
  import { onMount } from 'svelte';
  import Dial from './Dial.svelte';
  import { connectRoom, isRoomCode } from './second-screen/room.js';

  const params = new URLSearchParams(window.location.search);
  let code = $state((params.get('room') || '').toUpperCase());
  let angle = $state(0);
  let status = $state('disconnected');
  let errorMessage = $state('');
  let room;

  function join() {
    room?.close();
    errorMessage = '';
    if (!isRoomCode(code)) {
      status = 'invalid';
      errorMessage = 'Saisis le code affiché sur la TV (8 caractères).';
      return;
    }
    status = 'connecting';
    try {
      room = connectRoom({
        code,
        role: 'controller',
        onStatus: (next) => { status = next; }
      });
    } catch {
      status = 'error';
      errorMessage = 'Impossible de se connecter à cette salle.';
    }
  }

  onMount(() => {
    if (isRoomCode(code)) join();
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
  <form class="join" onsubmit={(event) => { event.preventDefault(); join(); }}>
    <label for="room-code">Code de la salle</label>
    <div class="join-row">
      <input id="room-code" bind:value={code} maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="ABCD2345" />
      <button type="submit">Rejoindre</button>
    </div>
    {#if errorMessage}<p class="error">{errorMessage}</p>{/if}
  </form>
  <p class="notice" class:connected={status === 'connected'}>
    <i></i>
    {status === 'connected' ? 'Connecté à l’écran' : status === 'connecting' ? 'Connexion à l’écran…' : 'En attente de connexion'}
  </p>
  {#if status === 'connected'}
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
  .join { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 8px; }
  .join label { font-weight: 700; }
  .join-row { display: flex; gap: 8px; }
  .join input { min-width: 0; flex: 1; padding: 10px; border: 3px solid var(--ink); border-radius: 12px; font: inherit; font-weight: 700; text-transform: uppercase; }
  .join button { padding: 10px 12px; border: 3px solid var(--ink); border-radius: 12px; background: #ffd84d; font-weight: 700; }
  .error { color: #b42318; font-size: 14px; font-weight: 700; margin: 0; }
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
