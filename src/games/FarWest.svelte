<script>
  import { onMount } from 'svelte';
  import { sfx } from '../lib/sfx.svelte.js';
  import Half from '../lib/Half.svelte';
  import { randomDelay, aiReaction } from '../lib/party/duel.js';

  let { mode, onpoint } = $props();

  let phase = $state('ready'); // ready | wait | go | over
  let msg = $state('Prêts ?');
  let sub = $state('');
  let hit = $state(0); // joueur touché
  let goAt = 0;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const name = (p) => (p === 2 && mode === '1p' ? "L'IA" : `J${p}`);

  function start() {
    phase = 'wait';
    msg = 'Attendez…';
    sub = 'Ne tirez pas avant le signal';
    hit = 0;
    later(go, randomDelay());
  }

  function go() {
    phase = 'go';
    msg = 'FEU !';
    sub = '';
    goAt = performance.now();
    sfx('boom');
    if (mode === '1p') later(() => shoot(2), aiReaction());
  }

  function shoot(p) {
    if (phase === 'wait') end(3 - p, `${name(p)} a tiré trop tôt !`, p);
    else if (phase === 'go') {
      const ms = Math.round(performance.now() - goAt);
      end(p, `${name(p)} tire en ${ms} ms`, 3 - p);
    }
  }

  function end(winner, text, loser) {
    phase = 'over';
    msg = text;
    sub = '';
    hit = loser;
    sfx('crash');
    onpoint(winner);
    later(start, 1800);
  }

  onMount(() => {
    later(start, 900);
    return () => timers.forEach(clearTimeout);
  });
</script>

<div class="field">
  {#each [2, 1] as p}
    <Half {p} {mode}>
      <button class="draw" disabled={mode === '1p' && p === 2} onpointerdown={() => shoot(p)} aria-label={`Tirer (J${p})`}>
        <span class="cow">{hit === p ? '💥' : '🤠'}</span>
        <span class="msg" class:go={phase === 'go'}>{msg}</span>
        <small>{sub}</small>
      </button>
    </Half>
  {/each}
</div>

<style>
  .field { width: min(100cqw, 520px); height: 100%; display: flex; flex-direction: column; gap: 14px; padding: 0 8px 12px; }
  .draw {
    width: 100%; height: 100%; background: transparent; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 6px; touch-action: manipulation; color: var(--ink);
  }
  .draw:disabled { color: var(--ink); cursor: default; }
  .cow { font-size: clamp(48px, 14cqh, 96px); line-height: 1; }
  .msg {
    font-size: clamp(22px, 5cqh, 34px); font-weight: 700; color: #fff; text-align: center;
    -webkit-text-stroke: 5px var(--ink); paint-order: stroke fill;
  }
  .msg.go { color: #ffe14d; animation: pop 0.2s ease-out; }
  small { font-weight: 600; color: var(--muted); min-height: 1.2em; }
  @keyframes pop { from { transform: scale(0.6); } to { transform: scale(1); } }
</style>
