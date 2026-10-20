<!-- compilé en custom element via dynamicCompileOptions (voir svelte.config.js) -->
<svelte:options
  customElement={{
    tag: 'coffre-fort-3d',
    shadow: 'open',
    props: { mode: { type: 'String' }, seed: { type: 'Number' }, muted: { type: 'Boolean' }, remote: { type: 'Boolean' } }
  }}
/>

<script>
  import { onMount } from 'svelte';
  import { createScene, AXIS_CSS } from './scene.js';
  import { createSensors } from './sensors.js';
  import { createAudio } from './audio.js';
  import {
    AXES, makeChain, mulberry32, axisText, createRun, advance, aiTime, roundWinner, qmul, qnorm, quatFromRotVec
  } from './logic.js';

  // mode : '1p' (contre le temps de l'IA) ou '2p' (chacun son tour, même chaîne)
  // seed : graine optionnelle (0 = aléatoire) ; muted : coupe sons et vibrations
  let { mode = '1p', seed = 0, muted = false, remote = false } = $props();
  const host = $host();

  let phase = $state('calib'); // calib | count | play | done | pass | result
  let turn = $state(0);
  let countN = $state(3);
  let segs = $state.raw([]);
  let run = $state(createRun([]));
  let times = $state.raw([]);
  let elapsed = $state(0);
  let rates = $state.raw([0, 0, 0]);
  let result = $state.raw(null);
  let invert = $state({ x: false, y: false, z: false });
  let fallback = $state(false);
  let sensorDiagnostic = $state.raw(null);
  let glFailed = $state(false);
  let stageEl;

  let O = [1, 0, 0, 0];
  let doorT = 0, doorTarget = 0, t0 = 0, round = 0, aiMs = 0, raf = 0, last = 0;
  let scene = null;
  let remoteV = [0, 0, 0];
  let remoteConnected = $state(false);

  function onRemoteInput(event) {
    const v = event.detail?.v;
    if (!remote || !Array.isArray(v) || v.length !== 3) return;
    remoteV = remoteV.map((value, i) => value + clamp(Number(v[i]) || 0, -60, 60));
  }

  function onRemoteReady() {
    if (remote && phase === 'calib') ready();
  }

  function onRemotePeer(event) {
    if (event.detail?.role === 'controller') remoteConnected = event.detail.connected !== false;
  }
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };
  const sensors = createSensors({ onChange: (s) => { fallback = !s.ok && Boolean(s.timedOut); sensorDiagnostic = s; } });
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  function openInChrome() {
    const current = new URL(window.location.href);
    const target = `intent://${current.host}${current.pathname}${current.search}#Intent;scheme=${current.protocol.slice(0, -1)};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(current.href)};end`;
    window.location.href = target;
  }
  const audio = createAudio(() => muted);

  const active = $derived(phase === 'play' ? run.segs[run.idx] : null);
  const who = (t) => (mode === '2p' ? `J${t + 1}` : 'Toi');
  const fmt = (ms) => (ms / 1000).toFixed(2) + ' s';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function loadInvert() {
    try { Object.assign(invert, JSON.parse(localStorage.getItem('coffre3d-inv') || '{}')); } catch { /* stockage indisponible */ }
  }
  function toggleInvert(a) {
    invert[a] = !invert[a];
    try { localStorage.setItem('coffre3d-inv', JSON.stringify({ ...invert })); } catch { /* ignoré */ }
  }

  function newRound() {
    round++;
    const rng = mulberry32(seed ? seed * 1000 + round : (Math.random() * 1e9) | 0);
    segs = makeChain(rng);
    aiMs = mode === '1p' ? aiTime(segs, rng) : 0;
    times = [];
    turn = 0;
    result = null;
    scene?.setChain(segs);
    beginTurn();
  }

  function beginTurn() {
    phase = 'calib';
    run = createRun(segs);
    O = [1, 0, 0, 0];
    doorT = 0;
    doorTarget = 0;
    elapsed = 0;
  }

  async function ready() {
    audio.unlock();
    if (!remote) await sensors.start(); // geste utilisateur : autorisation iOS
    sensors.reset();
    O = [1, 0, 0, 0];
    phase = 'count';
    countN = 3;
    audio.tick();
    const step = () => {
      countN--;
      if (countN <= 0) {
        phase = 'play';
        t0 = performance.now();
        audio.go();
      } else {
        audio.tick();
        later(step, 700);
      }
    };
    later(step, 700);
  }

  function finish(now) {
    times = [...times, now - t0];
    phase = 'done';
    doorTarget = 1;
    audio.fanfare();
    later(afterTurn, 1700);
  }

  function afterTurn() {
    if (mode === '2p' && turn === 0) { phase = 'pass'; return; }
    const pair = mode === '2p' ? [times[0], times[1]] : [times[0], aiMs];
    const winner = roundWinner(pair[0], pair[1]);
    result = { winner, times: pair };
    phase = 'result';
    host.dispatchEvent(new CustomEvent('roundend', { detail: { winner, times: pair, mode }, bubbles: true, composed: true }));
  }

  function nextPlayer() { turn = 1; beginTurn(); }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let v = remote ? remoteV.map((value) => clamp(value, -60, 60)) : sensors.take(dt);
    if (remote) remoteV = [0, 0, 0];
    v = [invert.x ? -v[0] : v[0], invert.y ? -v[1] : v[1], invert.z ? -v[2] : v[2]];
    if (dt > 0) rates = rates.map((r, i) => r + (v[i] / dt - r) * 0.3);

    if (phase === 'calib' || phase === 'count' || phase === 'play') O = qnorm(qmul(O, quatFromRotVec(v)));
    if (phase === 'play') {
      const out = advance(run, v);
      elapsed = now - t0;
      if (out.clink) audio.clink();
      if (out.finished) finish(now);
      else if (out.segmentDone) audio.clunk();
    }
    if (phase === 'done') { // le coffre se remet de face pour ouvrir la porte
      const k = 1 - Math.exp(-dt * 4), w = O[0] < 0 ? -1 : 1;
      O = qnorm([O[0] + (w - O[0]) * k, O[1] * (1 - k), O[2] * (1 - k), O[3] * (1 - k)]);
    }
    doorT += (doorTarget - doorT) * Math.min(1, dt * 4);
    if (scene) {
      scene.update({ O, door: doorT, run, playing: phase === 'play' });
      scene.render();
    }
  }

  onMount(() => {
    host.addEventListener('remoteinput', onRemoteInput);
    host.addEventListener('remote-ready', onRemoteReady);
    host.addEventListener('remote-peer', onRemotePeer);
    try { scene = createScene(stageEl); } catch { glFailed = true; }
    const fit = () => scene?.resize(stageEl.clientWidth, stageEl.clientHeight);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(stageEl);
    fit();
    loadInvert();
    newRound();
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return () => {
      host.removeEventListener('remoteinput', onRemoteInput);
      host.removeEventListener('remote-ready', onRemoteReady);
      host.removeEventListener('remote-peer', onRemotePeer);
      cancelAnimationFrame(raf);
      ro?.disconnect();
      sensors.stop();
      timers.forEach(clearTimeout);
      timers.clear();
      scene?.dispose();
      scene = null;
    };
  });

  const resetSlider = (e, i) => { e.currentTarget.value = 0; sensors.setSlider(i, 0); };
</script>

<div class="root">
  <div class="stagewrap" bind:this={stageEl}>
    <div class="time">{fmt(elapsed)}</div>

    {#if phase === 'calib' || phase === 'count'}
      <div class="overlay">
        <div class="panel">
          {#if phase === 'calib'}
            <h2>{who(turn)}</h2>
            <p>{remote ? 'Active les capteurs sur ton téléphone, puis démarre la manche depuis la manette.' : 'Tiens le téléphone droit devant toi, puis touche Prêt. Ta position devient le point de départ.'}</p>
            {#if remote}
              <p class="remote-wait">{remoteConnected ? "📱 Manette connectée — démarre depuis le téléphone." : "⌛ En attente de la manette…"}</p>
            {:else}
              <button class="go" onclick={ready}>Prêt</button>
            {/if}
          {:else}
            <p class="big">{countN}</p>
          {/if}
        </div>
      </div>
    {:else if phase === 'pass' || phase === 'result'}
      <div class="overlay bottom">
        <div class="panel compact">
          {#if phase === 'pass'}
            <h2>J1 : {fmt(times[0])}</h2>
            <p>Passe le téléphone à J2 (même chaîne).</p>
            <button class="go" onclick={nextPlayer}>J2 joue</button>
          {:else}
            <h2>
              {#if result.winner === 0}Égalité !
              {:else if mode === '1p'}{result.winner === 1 ? '🏆 Tu gagnes' : 'L’IA gagne'}
              {:else}🏆 J{result.winner} gagne{/if}
            </h2>
            <p>
              <span class="c1">{mode === '1p' ? 'Toi' : 'J1'} {fmt(result.times[0])}</span> ·
              <span class="c2">{mode === '1p' ? 'IA' : 'J2'} {fmt(result.times[1])}</span>
            </p>
            <button class="go" onclick={newRound}>Manche suivante</button>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <div class="hud">
    <div class="hint" style:color={active ? AXIS_CSS[active.axis] : ''}>
      {#if active}{axisText(active.axis, active.dir)}{:else if phase === 'done' || phase === 'result' || phase === 'pass'}🔓 Ouvert !{:else}&nbsp;{/if}
    </div>
    <div class="pips" aria-label="Étapes">
      {#each segs as s, i}
        <i class:done={i < run.idx} class:cur={phase === 'play' && i === run.idx} style:background={AXIS_CSS[s.axis]}></i>
      {/each}
    </div>
    <div class="bars" aria-hidden="true">
      {#each AXES as a, i}
        {@const r = rates[i]}
        {@const mine = active?.axis === a}
        {@const good = mine && Math.sign(r) === active.dir}
        <div class="bar" class:act={mine} style:--c={AXIS_CSS[a]}>
          <b>{a.toUpperCase()}</b>
          <div class="meter">
            <i></i>
            <u class="l" class:good class:bad={mine && !good && Math.abs(r) > 1} style:width="{r < 0 ? clamp(-r / 180, 0, 1) * 50 : 0}%"></u>
            <u class="r" class:good class:bad={mine && !good && Math.abs(r) > 1} style:width="{r > 0 ? clamp(r / 180, 0, 1) * 50 : 0}%"></u>
          </div>
        </div>
      {/each}
    </div>
    {#if fallback}
      <div class="sliders">
        {#each [['X bascule', 0], ['Y tonneau', 1], ['Z volant', 2]] as [label, i]}
          <label>
            {label}
            <input type="range" min="-1" max="1" step="0.01" value="0"
              oninput={(e) => sensors.setSlider(i, e.currentTarget.value)}
              onpointerup={(e) => resetSlider(e, i)} onpointercancel={(e) => resetSlider(e, i)} />
          </label>
        {/each}
      </div>
    {/if}
    <div class="status">
      {#if glFailed}⚠️ Rendu 3D indisponible (WebGL).
      {:else if fallback}🖐️ Capteurs indisponibles : curseurs (ou W/S, A/D, Q/E).
      {:else}&nbsp;{/if}
    </div>
    {#if fallback}
      <div class="sensor-help">
        <p>Le navigateur n'envoie pas les mouvements du téléphone. Vérifie les autorisations de capteurs, ou essaie Chrome.</p>
        {#if isAndroid}
          <button class="go chrome" type="button" onclick={openInChrome}>Ouvrir dans Chrome</button>
        {/if}
      </div>
    {/if}
    <details>
      <summary>Diagnostic et réglages capteurs</summary>
      <div class="diagnostic">
        <div>Contexte sécurisé (HTTPS) : <b>{sensorDiagnostic?.secureContext ? 'oui' : 'non'}</b></div>
        <div>API orientation : <b>{sensorDiagnostic?.orientationApi ? 'disponible' : 'absente'}</b></div>
        <div>API mouvement : <b>{sensorDiagnostic?.motionApi ? 'disponible' : 'absente'}</b></div>
        <div>Événement orientation reçu : <b>{sensorDiagnostic?.orientationEvents ? 'oui' : 'non'}</b></div>
        <div>Événement mouvement reçu : <b>{sensorDiagnostic?.motionEvents ? 'oui' : 'non'}</b></div>
        <div>Autorisation orientation : <b>{sensorDiagnostic?.orientationPermission ?? 'pas encore testée'}</b></div>
        <div>Navigateur : <b class="ua">{typeof navigator !== 'undefined' ? navigator.userAgent : 'inconnu'}</b></div>
      </div>
      <div class="inv">
        {#each AXES as a}
          <button type="button" aria-pressed={invert[a]} onclick={() => toggleInvert(a)}>Inverser {a.toUpperCase()}</button>
        {/each}
      </div>
    </details>
  </div>
</div>

<style>
  :host { display: block; width: 100%; height: 100%; min-height: 0; user-select: none; -webkit-user-select: none; }
  .remote-wait { margin: 8px 0 0; font-weight: 700; color: var(--muted, #6b5a3c); }
  .root {
    height: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 0 8px 8px;
    font-family: var(--font, 'Trebuchet MS', system-ui, sans-serif); font-weight: 700; color: var(--ink, #1f1a2e);
  }
  .stagewrap { position: relative; flex: 1 1 0; min-height: 160px; width: min(100%, 520px); }
  .stagewrap :global(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
  .time {
    position: absolute; top: 0; right: 0; z-index: 2; background: #fff; border: 3px solid var(--ink, #1f1a2e);
    border-radius: 12px; box-shadow: 0 3px 0 var(--ink, #1f1a2e); padding: 2px 10px; font-size: 16px; font-variant-numeric: tabular-nums;
  }
  .overlay { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; padding: 6px; }
  .overlay.bottom { align-items: flex-end; }
  .panel {
    background: #fff; border: 4px solid var(--ink, #1f1a2e); border-radius: 22px; box-shadow: 0 7px 0 var(--ink, #1f1a2e);
    padding: 14px 16px; text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; max-width: 100%;
  }
  .panel h2 { margin: 0; font-size: 21px; }
  .panel p { margin: 0; color: var(--muted, #6b5a3c); font-size: 14px; line-height: 1.35; max-width: 32ch; }
  .panel .big { font-size: 64px; line-height: 1; color: var(--ink, #1f1a2e); }
  .panel.compact { padding: 8px 12px; gap: 6px; border-width: 3px; border-radius: 18px; box-shadow: 0 5px 0 var(--ink, #1f1a2e); }
  .panel.compact h2 { font-size: 18px; }
  .c1 { color: var(--p1, #19b5fe); } .c2 { color: var(--p2, #ff3d7f); }
  .go {
    font: inherit; font-size: 18px; color: var(--ink, #1f1a2e); background: #ffd84d; border: 3px solid var(--ink, #1f1a2e);
    border-radius: 16px; box-shadow: 0 5px 0 var(--ink, #1f1a2e); padding: 10px 20px; cursor: pointer;
  }
  .go:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--ink, #1f1a2e); }
  .compact .go { font-size: 15px; padding: 7px 13px; box-shadow: 0 4px 0 var(--ink, #1f1a2e); }

  .hud { width: min(100%, 440px); display: flex; flex-direction: column; gap: 6px; align-items: center; }
  .hint { font-size: 19px; min-height: 1.4em; text-align: center; line-height: 1.2; }
  .pips { display: flex; gap: 6px; min-height: 18px; }
  .pips i { width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--ink, #1f1a2e); }
  .pips i.done { opacity: 0.35; } .pips i.cur { transform: scale(1.25); }
  .bars { width: 100%; display: flex; flex-direction: column; gap: 4px; }
  .bar { display: flex; align-items: center; gap: 8px; }
  .bar b { width: 18px; text-align: center; color: var(--c); font-size: 14px; }
  .meter { position: relative; flex: 1; height: 14px; background: #fff; border: 3px solid var(--ink, #1f1a2e); border-radius: 9px; overflow: hidden; }
  .bar.act .meter { box-shadow: 0 0 0 3px var(--c); }
  .meter u { position: absolute; top: 0; bottom: 0; text-decoration: none; background: var(--c); }
  .meter u.l { right: 50%; } .meter u.r { left: 50%; }
  .meter u.good { background: #19c3a3; } .meter u.bad { background: #ef476f; }
  .meter i { position: absolute; left: 50%; top: 0; bottom: 0; width: 3px; margin-left: -1.5px; background: var(--ink, #1f1a2e); }
  .sliders { width: 100%; display: flex; flex-direction: column; gap: 0; }
  .sliders label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted, #6b5a3c); }
  .sliders input { flex: 1; height: 26px; accent-color: #ffd84d; }
  .status { font-size: 12px; color: var(--muted, #6b5a3c); text-align: center; min-height: 1.2em; }
  .sensor-help { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
  .sensor-help p { margin: 0; font-size: 12px; line-height: 1.35; color: var(--muted, #6b5a3c); font-weight: 500; }
  .go.chrome { font-size: 14px; padding: 7px 12px; box-shadow: 0 3px 0 var(--ink, #1f1a2e); }
  .diagnostic { display: flex; flex-direction: column; gap: 4px; padding: 8px 2px; overflow-wrap: anywhere; font-weight: 500; }
  .diagnostic b { font-weight: 700; color: var(--ink, #1f1a2e); }
  .diagnostic .ua { font-size: 10px; font-weight: 500; }
  details { width: 100%; font-size: 12px; color: var(--muted, #6b5a3c); }
  summary { cursor: pointer; text-align: center; }
  .inv { display: flex; gap: 8px; justify-content: center; margin-top: 6px; flex-wrap: wrap; }
  .inv button {
    font: inherit; font-size: 12px; color: var(--ink, #1f1a2e); background: #fff; border: 3px solid var(--ink, #1f1a2e);
    border-radius: 12px; padding: 4px 9px; cursor: pointer;
  }
  .inv button[aria-pressed='true'] { background: #ffd84d; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
</style>
