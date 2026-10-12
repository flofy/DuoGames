<script>
  import { onMount } from 'svelte';
  import { sfx } from '../lib/sfx.svelte.js';
  import { startLoop } from '../lib/canvas.js';
  import Half from '../lib/Half.svelte';
  import { MAX, makeThreshold, shake, danger, openCan, roundWinner, aiCap } from '../lib/party/soda.js';

  let { mode, onpoint } = $props();

  const fresh = () => ({ pressure: 0, threshold: makeThreshold(), state: 'shaking', spray: 0 }); // shaking | opened | boom
  const mkAI = () => ({ cap: aiCap(), t: 0.5 });

  let c = $state({ 1: fresh(), 2: fresh() });
  let over = $state(false);
  let verdict = $state(0); // 0 = égalité
  let ai = mkAI();
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const isAI = (p) => mode === '1p' && p === 2;

  function tap(p) {
    const q = c[p];
    if (over || q.state !== 'shaking') return;
    q.pressure = shake(q.pressure);
    sfx('tick');
    if (q.pressure > q.threshold) {
      q.state = 'boom';
      q.spray = -1;
      sfx('boom');
      check();
    }
  }

  function openIt(p) {
    const q = c[p];
    if (over || q.state !== 'shaking') return;
    const r = openCan(q.pressure, q.threshold);
    q.state = r.exploded ? 'boom' : 'opened';
    q.spray = r.spray;
    sfx(r.exploded ? 'boom' : 'splash');
    check();
  }

  function check() {
    if (c[1].state === 'shaking' || c[2].state === 'shaking') return;
    over = true;
    verdict = roundWinner(c[1].spray, c[2].spray);
    if (verdict) onpoint(verdict);
    later(next, 2400);
  }

  function next() {
    c = { 1: fresh(), 2: fresh() };
    over = false;
    verdict = 0;
    ai = mkAI();
  }

  function text(p) {
    const q = c[p];
    if (over) {
      if (q.state === 'boom') return '💥 BOOM !';
      return verdict === 0 ? `Jet ${q.spray} · égalité` : `Jet ${q.spray}${verdict === p ? ' 🏆' : ''}`;
    }
    if (q.state === 'boom') return '💥 BOOM !';
    if (q.state === 'opened') return '✅ Ouvert… suspense';
    const d = danger(q.pressure, q.threshold);
    return d === 'danger' ? '⚠️ Attention !' : d === 'fizz' ? '🫧 Ça bouillonne…' : 'Secoue !';
  }

  // IA : n'utilise que l'indice visible par tous (jamais le seuil caché)
  onMount(() => {
    const stop = startLoop((dt) => {
      if (mode !== '1p' || over) return;
      const q = c[2];
      if (q.state !== 'shaking') return;
      ai.t -= dt;
      if (ai.t > 0) return;
      ai.t = 0.13 + Math.random() * 0.1;
      const d = danger(q.pressure, q.threshold);
      if (q.pressure >= ai.cap || (d === 'danger' && Math.random() < 0.5)) openIt(2);
      else tap(2);
    });
    return () => {
      stop();
      timers.forEach(clearTimeout);
    };
  });
</script>

{#snippet side(p)}
  {@const q = c[p]}
  <p class="msg">{text(p)}</p>
  <div class="can" class:shaking={q.state === 'shaking'} style="--r:{Math.min(1, q.pressure / MAX)}">
    {q.state === 'boom' ? '💥' : q.state === 'opened' ? '💦' : '🥤'}
  </div>
  <div class="btns">
    <button class="shake" disabled={over || q.state !== 'shaking' || isAI(p)} onpointerdown={() => tap(p)}>Secouer</button>
    <button class="open" disabled={over || q.state !== 'shaking' || isAI(p)} onclick={() => openIt(p)}>Ouvrir</button>
  </div>
{/snippet}

<div class="field">
  <Half p={2} {mode}>{@render side(2)}</Half>
  <Half p={1} {mode}>{@render side(1)}</Half>
</div>

<style>
  .field { width: min(100cqw, 520px); height: 100%; display: flex; flex-direction: column; gap: 14px; padding: 0 8px 12px; }
  .msg { margin: 0; font-size: clamp(18px, 4cqh, 26px); font-weight: 700; color: #fff; -webkit-text-stroke: 5px var(--ink); paint-order: stroke fill; min-height: 1.3em; }
  .can { font-size: clamp(48px, 13cqh, 90px); line-height: 1; }
  .can.shaking { animation: wobble calc(0.5s - var(--r) * 0.35s) ease-in-out infinite alternate; }
  .btns { display: flex; gap: 10px; }
  button {
    padding: 10px 20px; font-size: 18px; font-weight: 700; background: #fff; border: 3px solid var(--ink);
    border-radius: 14px; box-shadow: 0 4px 0 var(--ink); touch-action: manipulation;
  }
  button.shake { background: #ffd84d; padding: 14px 30px; font-size: 20px; }
  button:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  button:disabled { opacity: 0.4; box-shadow: none; }
  @keyframes wobble {
    from { transform: rotate(calc(var(--r) * -14deg)); }
    to { transform: rotate(calc(var(--r) * 14deg)); }
  }
</style>
