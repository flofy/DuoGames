<script>
  import { onMount } from 'svelte';
  import { sfx } from '../lib/sfx.svelte.js';
  import { startLoop } from '../lib/canvas.js';
  import Half from '../lib/Half.svelte';
  import Dial from '../lib/Dial.svelte';
  import { HOLD, SEGMENTS, diff, level, inZone, wrapDelta, norm, randomTarget } from '../lib/party/safe.js';

  let { mode, onpoint } = $props();

  const mk = (angle = 0) => ({ angle, target: randomTarget(angle), hold: 0, open: false });
  const mkAI = () => ({ wander: 3.5 + Math.random() * 3.5, speed: 90 + Math.random() * 50 });

  let s = $state({ 1: mk(), 2: mk() });
  let over = $state(false);
  let winner = $state(0);
  let ai = mkAI();
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const lvl = (p) => level(diff(s[p].angle, s[p].target));

  function win(p) {
    over = true;
    winner = p;
    s[p].open = true;
    sfx('hole');
    onpoint(p);
    later(next, 1800);
  }

  function next() {
    s = { 1: mk(s[1].angle), 2: mk(s[2].angle) };
    over = false;
    winner = 0;
    ai = mkAI();
  }

  // IA : cherche à l'aveugle un moment, puis se cale sur le code
  function aiStep(dt) {
    const q = s[2];
    if (ai.wander > 0) {
      ai.wander -= dt;
      q.angle = norm(q.angle + 80 * dt);
      return;
    }
    const d = wrapDelta(q.target - q.angle);
    q.angle = norm(q.angle + Math.sign(d) * Math.min(Math.abs(d), ai.speed * dt));
  }

  onMount(() => {
    const stop = startLoop((dt) => {
      if (over) return;
      if (mode === '1p') aiStep(dt);
      for (const p of [1, 2]) {
        const q = s[p];
        if (inZone(q.angle, q.target)) {
          q.hold += dt;
          if (q.hold >= HOLD) return win(p);
        } else q.hold = Math.max(0, q.hold - dt * 2);
      }
    });
    return () => {
      stop();
      timers.forEach(clearTimeout);
    };
  });
</script>

{#snippet side(p)}
  <p class="msg">{#if over}{winner === p ? '🔓 Ouvert !' : 'Trop lent…'}{:else}Trouve le code !{/if}</p>
  <Dial bind:angle={s[p].angle} disabled={over || (mode === '1p' && p === 2)} open={s[p].open} />
  <div class="heat" role="img" aria-label="Chaleur">
    {#each Array(SEGMENTS) as _, k}<i class:on={k < lvl(p)} style="--k:{k}"></i>{/each}
  </div>
  <div class="hold"><b style="width:{Math.min(100, (s[p].hold / HOLD) * 100)}%"></b></div>
{/snippet}

<div class="field">
  <Half p={2} {mode}>{@render side(2)}</Half>
  <Half p={1} {mode}>{@render side(1)}</Half>
</div>

<style>
  .field { width: min(100cqw, 520px); height: 100%; display: flex; flex-direction: column; gap: 14px; padding: 0 8px 12px; }
  .msg { margin: 0; font-size: clamp(18px, 4cqh, 26px); font-weight: 700; color: #fff; -webkit-text-stroke: 5px var(--ink); paint-order: stroke fill; }
  .heat { display: flex; gap: 5px; margin-top: 8px; }
  .heat i { width: 26px; height: 14px; border: 3px solid var(--ink); border-radius: 6px; background: #fff; }
  .heat i.on { background: hsl(calc(210 - var(--k) * 40) 90% 55%); }
  .hold { width: min(180px, 70%); height: 10px; border: 3px solid var(--ink); border-radius: 8px; background: #fff; overflow: hidden; }
  .hold b { display: block; height: 100%; background: #19c3a3; }
</style>
