<script>
  import { onMount } from 'svelte';
  import { createSensors } from '@duogames/coffre-fort/sensors';
  import { connectRoom, isRoomCode } from './second-screen/room.js';

  const params = new URLSearchParams(window.location.search);
  let code = $state((params.get('room') || '').toUpperCase());
  let status = $state('disconnected');
  let sensorEnabled = $state(false);
  let sensorState = $state(null);
  let errorMessage = $state('');
  let angleHelp = $state(false);
  let room;
  let raf = 0;
  let last = 0;

  const sensors = createSensors({ onChange: (state) => { sensorState = state; } });

  function join() {
    room?.close();
    errorMessage = '';
    if (!isRoomCode(code)) {
      status = 'invalid';
      errorMessage = 'Saisis le code de salle affiché sur la TV (8 caractères).';
      return;
    }
    status = 'connecting';
    try {
      room = connectRoom({
        code,
        role: 'controller',
        onStatus: (next) => { status = next; },
        onMessage: (message) => {
          if (message?.type === 'room:peer' && message.role === 'display') angleHelp = message.connected !== false;
        }
      });
    } catch {
      status = 'error';
      errorMessage = 'Impossible de se connecter à cette salle.';
    }
  }

  async function enableSensors() {
    try {
      await sensors.start();
      sensors.reset();
      sensorEnabled = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } catch {
      errorMessage = 'Les capteurs n’ont pas pu démarrer. Tu peux utiliser les curseurs.';
    }
  }

  function frame(now) {
    if (!sensorEnabled) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const v = sensors.take(dt);
    if (status === 'connected' && v.some((value) => Math.abs(value) > 0.001)) {
      room?.send({ type: 'controller:motion', v });
    }
  }

  function startRound() {
    if (status === 'connected' && sensorEnabled) room?.send({ type: 'controller:ready' });
  }

  function resetSlider(event, axis) {
    event.currentTarget.value = '0';
    sensors.setSlider(axis, 0);
  }

  onMount(() => {
    if (isRoomCode(code)) join();
    return () => {
      cancelAnimationFrame(raf);
      sensors.stop();
      room?.close();
    };
  });
</script>

<main>
  <header>
    <span class="eyebrow">DUOGAMES · MANETTE</span>
    <h1>🔐 Coffre-fort 3D</h1>
    <p>Les mouvements de ton téléphone pilotent le coffre sur le grand écran.</p>
  </header>

  <form class="join" onsubmit={(event) => { event.preventDefault(); join(); }}>
    <label for="room-code">Code de salle</label>
    <div class="join-row">
      <input id="room-code" bind:value={code} maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="ABCD2345" />
      <button type="submit">Rejoindre</button>
    </div>
    {#if errorMessage}<p class="error">{errorMessage}</p>{/if}
  </form>

  <p class="notice" class:connected={status === 'connected'}>
    <i></i>
    {status === 'connected' ? (angleHelp ? 'Écran TV connecté' : 'Canal connecté · recherche de la TV') : status === 'connecting' ? 'Connexion à la salle…' : 'En attente de connexion'}
  </p>

  <section>
    <h2>1. Activer les capteurs</h2>
    <p>Appuie ici pour autoriser le mouvement et l’orientation du téléphone.</p>
    <button class="primary" disabled={status !== 'connected' || sensorEnabled} onclick={enableSensors}>
      {sensorEnabled ? 'Capteurs activés ✓' : 'Activer les capteurs'}
    </button>
    {#if sensorState}
      <p class="sensor-state">{sensorState.ok ? 'Capteur détecté' : sensorState.timedOut ? 'Aucun mouvement reçu : utilise les curseurs ci-dessous.' : 'Recherche des capteurs…'}</p>
    {/if}
  </section>

  <section>
    <h2>2. Démarrer la manche</h2>
    <p>Quand le coffre est affiché sur la TV, lance la manche depuis ton téléphone.</p>
    <button class="primary" disabled={status !== 'connected' || !sensorEnabled || !angleHelp} onclick={startRound}>Prêt, démarrer !</button>
  </section>

  {#if !sensorState?.ok}
    <section class="manual">
      <h2>Contrôle manuel</h2>
      <p>Si les capteurs sont bloqués, ces curseurs permettent de tester le pilotage à distance.</p>
      {#each [['X · bascule', 0], ['Y · tonneau', 1], ['Z · volant', 2]] as [label, axis]}
        <label class="slider">
          <span>{label}</span>
          <input type="range" min="-1" max="1" step="0.01" value="0"
            oninput={(event) => sensors.setSlider(axis, event.currentTarget.value)}
            onpointerup={(event) => resetSlider(event, axis)}
            onpointercancel={(event) => resetSlider(event, axis)} />
        </label>
      {/each}
    </section>
  {/if}
</main>

<style>
  main { min-height: 100dvh; max-width: 560px; margin: auto; padding: max(20px, env(safe-area-inset-top)) 18px max(20px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 14px; }
  header { text-align: center; }
  .eyebrow { font-size: 12px; letter-spacing: 2px; font-weight: 700; }
  h1 { margin: 8px 0; font-size: 31px; color: #fff; -webkit-text-stroke: 6px var(--ink); paint-order: stroke fill; }
  header p { margin: 0 auto; max-width: 340px; }
  .join { display: flex; flex-direction: column; gap: 7px; }
  .join label { font-weight: 700; }
  .join-row { display: flex; gap: 8px; }
  .join input { min-width: 0; flex: 1; padding: 10px; border: 3px solid var(--ink); border-radius: 12px; font: inherit; font-weight: 700; text-transform: uppercase; }
  button { border: 3px solid var(--ink); border-radius: 12px; padding: 10px 13px; font: inherit; font-weight: 700; box-shadow: 0 3px 0 var(--ink); }
  button:disabled { opacity: .5; }
  .join button { background: #fff; }
  .primary { background: #ffd84d; }
  .notice { display: flex; align-items: center; gap: 8px; align-self: center; margin: 0; padding: 8px 12px; background: #fff; border: 3px solid var(--ink); border-radius: 12px; font-weight: 700; }
  .notice i { width: 10px; height: 10px; border-radius: 50%; background: #e5a000; }
  .notice.connected i { background: #16a36a; }
  section { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px; background: rgba(255,255,255,.5); border: 3px solid var(--ink); border-radius: 18px; box-shadow: 0 4px 0 var(--ink); text-align: center; }
  h2 { margin: 0; font-size: 20px; }
  section p { margin: 0; font-size: 14px; }
  .sensor-state { font-weight: 700; }
  .error { color: #b42318; font-weight: 700; font-size: 13px; margin: 0; }
  .manual { align-items: stretch; }
  .slider { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 700; }
  .slider span { width: 105px; text-align: left; }
  .slider input { flex: 1; min-width: 0; }
</style>
