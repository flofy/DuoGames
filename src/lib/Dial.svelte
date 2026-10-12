<script>
  import { sfx } from './sfx.svelte.js';
  import { norm, wrapDelta } from './party/safe.js';

  // Molette tournante au doigt (une par joueur, multi-touch géré via pointerId)
  let { angle = $bindable(0), disabled = false, open = false } = $props();

  let el;
  let pid = null;
  let last = 0;
  const ticks = Array.from({ length: 36 }, (_, i) => i);

  function at(e) {
    const r = el.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  }
  function down(e) {
    if (disabled || pid !== null) return;
    pid = e.pointerId;
    el.setPointerCapture(pid);
    last = at(e);
  }
  function move(e) {
    if (e.pointerId !== pid || disabled) return;
    const a = at(e);
    const next = norm(angle + wrapDelta(a - last));
    if (Math.floor(next / 12) !== Math.floor(angle / 12)) sfx('tick');
    angle = next;
    last = a;
  }
  function up(e) {
    if (e.pointerId === pid) pid = null;
  }
</script>

<div
  class="dial"
  bind:this={el}
  role="slider"
  tabindex="0"
  aria-label="Molette du coffre"
  aria-valuemin="0"
  aria-valuemax="360"
  aria-valuenow={Math.round(angle)}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
>
  <span class="notch"></span>
  <div class="face" style="--a:{angle}deg">
    {#each ticks as t}<i class:big={t % 3 === 0} style="--t:{t * 10}deg"></i>{/each}
  </div>
  <b class="cap">{open ? '🔓' : '🔒'}</b>
</div>

<style>
  .dial {
    --s: clamp(110px, min(40cqw, 22cqh), 190px);
    position: relative; width: var(--s); height: var(--s); border-radius: 50%; touch-action: none; margin-top: 12px;
  }
  .face {
    position: absolute; inset: 0; border-radius: 50%; background: #fff; border: 4px solid var(--ink);
    box-shadow: 0 5px 0 var(--ink); transform: rotate(var(--a));
  }
  .face i {
    position: absolute; left: 50%; top: 4px; width: 3px; height: 8px; margin-left: -1.5px; background: var(--ink);
    transform-origin: 50% calc(var(--s) / 2 - 8px); transform: rotate(var(--t));
  }
  .face i.big { height: 14px; width: 4px; margin-left: -2px; }
  .notch {
    position: absolute; top: -14px; left: 50%; margin-left: -9px; z-index: 2; width: 0; height: 0;
    border-left: 9px solid transparent; border-right: 9px solid transparent; border-top: 16px solid var(--ink);
  }
  .cap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: calc(var(--s) * 0.3); pointer-events: none; }
</style>
