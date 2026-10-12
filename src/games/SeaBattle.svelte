<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import ShipArt from '../lib/ShipArt.svelte';

  let { mode, onpoint } = $props();

  const N = 10;
  const SIZES = [5, 4, 3, 3, 2];
  const NAMES = ['Porte-avions', 'Cuirassé', 'Sous-marin', 'Croiseur', 'Patrouilleur'];

  const cellsOf = (len, x, y, h) => Array.from({ length: len }, (_, k) => (h ? y : y + k) * N + (h ? x + k : x));
  const mk = (id, x, y, h) => ({ id, len: SIZES[id], x, y, h, cells: cellsOf(SIZES[id], x, y, h) });

  function randomFleet() {
    for (;;) {
      const used = new Set();
      const fleet = [];
      let ok = true;
      for (let id = 0; id < SIZES.length && ok; id++) {
        let placed = false;
        for (let t = 0; t < 200 && !placed; t++) {
          const h = Math.random() < 0.5;
          const x = Math.floor(Math.random() * (h ? N - SIZES[id] + 1 : N));
          const y = Math.floor(Math.random() * (h ? N : N - SIZES[id] + 1));
          const s = mk(id, x, y, h);
          if (s.cells.every((c) => !used.has(c))) { s.cells.forEach((c) => used.add(c)); fleet.push(s); placed = true; }
        }
        if (!placed) ok = false;
      }
      if (ok) return fleet;
    }
  }

  function buildBoard(fleet) {
    const sorted = [...fleet].sort((a, b) => a.id - b.id);
    const grid = Array(N * N).fill(-1);
    const ships = sorted.map((s, idx) => {
      s.cells.forEach((c) => (grid[c] = idx));
      return { id: s.id, len: s.len, x: s.x, y: s.y, h: s.h, cells: s.cells, hits: 0 };
    });
    return { grid, ships };
  }

  let phase = $state('place'); // place | pass | battle | over
  let who = $state(1);
  let boards = $state({ 1: null, 2: null });
  let shots = $state({ 1: Array(N * N).fill(0), 2: Array(N * N).fill(0) });
  let pass = $state(null);
  let msg = $state('');
  let locked = $state(false);

  // placement par glisser-déposer
  let fleet = $state([]);
  let horiz = $state(true);
  let err = $state('');
  let drag = $state(null);
  let boardEl = $state();
  let wrapEl = $state();

  const placeGrid = $derived.by(() => {
    const g = Array(N * N).fill(-1);
    fleet.forEach((s) => s.cells.forEach((c) => (g[c] = s.id)));
    return g;
  });
  const isPlaced = (id) => fleet.some((s) => s.id === id);

  const viewer = $derived(mode === '1p' ? 1 : who);
  const label = (p) => (p === 2 && mode === '1p' ? 'IA' : 'J' + p);
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  let queue = [];

  const tf = (s) => (s.h ? `translate(${s.x * 10} ${s.y * 10})` : `translate(${s.x * 10 + 10} ${s.y * 10}) rotate(90)`);

  function target(d) {
    const r = boardEl.getBoundingClientRect();
    const cs = r.width / N;
    const len = SIZES[d.id];
    const cx = (d.px - r.left) / cs, cy = (d.py - r.top) / cs;
    let x, y;
    if (d.h) { x = Math.round(cx - len / 2); y = Math.floor(cy); }
    else { x = Math.floor(cx); y = Math.round(cy - len / 2); }
    x = Math.max(0, Math.min(d.h ? N - len : N - 1, x));
    y = Math.max(0, Math.min(d.h ? N - 1 : N - len, y));
    return { x, y, inside: cx > -1 && cx < N + 1 && cy > -1 && cy < N + 1 };
  }

  const preview = $derived.by(() => {
    if (!drag || !drag.moved || !boardEl) return null;
    const t = target(drag);
    if (!t.inside) return null;
    const cells = cellsOf(SIZES[drag.id], t.x, t.y, drag.h);
    return { cells, ok: cells.every((c) => placeGrid[c] < 0) };
  });

  function startDrag(e, id, fromPlaced) {
    e.preventDefault();
    err = '';
    let h = horiz, orig = null;
    if (fromPlaced) {
      orig = fleet.find((s) => s.id === id);
      h = orig.h;
      fleet = fleet.filter((s) => s.id !== id);
    }
    drag = { id, h, px: e.clientX, py: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, orig, fromPlaced };
  }
  function onMove(e) {
    if (!drag) return;
    drag.px = e.clientX; drag.py = e.clientY;
    if (!drag.moved && Math.hypot(drag.px - drag.sx, drag.py - drag.sy) > 6) drag.moved = true;
  }
  function onUp() {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.moved) {
      if (d.fromPlaced) {
        const o = d.orig, h = !o.h;
        let x = o.x, y = o.y;
        if (h) x = Math.min(x, N - o.len); else y = Math.min(y, N - o.len);
        const s = mk(o.id, x, y, h);
        if (s.cells.every((c) => placeGrid[c] < 0)) fleet = [...fleet, s];
        else { fleet = [...fleet, o]; err = 'Pas la place pour pivoter'; }
      } else horiz = !horiz;
      return;
    }
    const t = target(d);
    const s = mk(d.id, t.x, t.y, d.h);
    if (t.inside && s.cells.every((c) => placeGrid[c] < 0)) { fleet = [...fleet, s]; sfx('tick'); }
    else if (d.orig && t.inside) { fleet = [...fleet, d.orig]; err = 'Emplacement occupé'; }
  }

  const ghost = $derived.by(() => {
    if (!drag || !drag.moved || !boardEl || !wrapEl) return null;
    const r = boardEl.getBoundingClientRect(), wr = wrapEl.getBoundingClientRect();
    const cs = r.width / N, len = SIZES[drag.id];
    const w = (drag.h ? len : 1) * cs, h = (drag.h ? 1 : len) * cs;
    return { left: drag.px - wr.left - w / 2, top: drag.py - wr.top - h / 2, w, h, id: drag.id, len, hz: drag.h };
  });

  function resetPlacement() { fleet = []; horiz = true; err = ''; drag = null; }
  function randomize() { fleet = randomFleet(); err = ''; }

  function validate() {
    if (fleet.length < SIZES.length) { err = 'Place tous tes bateaux'; return; }
    boards[who] = buildBoard(fleet);
    if (who === 1) {
      if (mode === '1p') {
        boards[2] = buildBoard(randomFleet());
        who = 1; msg = ''; phase = 'battle';
      } else { pass = { to: 2, next: 'place' }; phase = 'pass'; }
    } else { pass = { to: 1, next: 'battle' }; phase = 'pass'; }
  }

  function ready() {
    const { to, next } = pass;
    who = to;
    if (next === 'place') resetPlacement();
    phase = next; pass = null; msg = '';
  }

  const sunkShips = (owner) => boards[owner].ships.filter((s) => s.hits === s.len);

  function fire(i) {
    if (locked || phase !== 'battle' || shots[who][i]) return;
    doShot(who, i);
  }

  function doShot(p, i) {
    const tb = boards[3 - p];
    locked = true;
    const sid = tb.grid[i];
    let text;
    if (sid >= 0) {
      shots[p][i] = 2;
      sfx('boom');
      const s = tb.ships[sid];
      s.hits++;
      text = s.hits === s.len ? 'Coulé !' : 'Touché !';
    } else { shots[p][i] = 1; sfx('splash'); text = "À l'eau"; }
    msg = (p === 2 && mode === '1p' ? 'IA : ' : '') + text;
    if (tb.ships.every((s) => s.hits === s.len)) { phase = 'over'; onpoint(p); return; }
    later(() => next(p), 1100);
  }

  function next(p) {
    msg = '';
    const q = 3 - p;
    who = q;
    if (mode === '1p') {
      if (q === 2) later(aiShot, 400); else locked = false;
    } else { locked = false; pass = { to: q, next: 'battle' }; phase = 'pass'; }
  }

  function aiShot() {
    const sh = shots[2];
    let i;
    while (queue.length) { const c = queue.pop(); if (!sh[c]) { i = c; break; } }
    if (i === undefined) {
      const free = [];
      for (let c = 0; c < N * N; c++) if (!sh[c]) free.push(c);
      const par = free.filter((c) => ((c % N) + Math.floor(c / N)) % 2 === 0);
      const pool = par.length ? par : free;
      i = pool[Math.floor(Math.random() * pool.length)];
    }
    const hit = boards[1].grid[i] >= 0;
    doShot(2, i);
    if (hit) {
      const x = i % N, y = Math.floor(i / N);
      if (x > 0) queue.push(i - 1);
      if (x < N - 1) queue.push(i + 1);
      if (y > 0) queue.push(i - N);
      if (y < N - 1) queue.push(i + N);
    }
  }

  onMount(() => () => timers.forEach(clearTimeout));
</script>

<svelte:window onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp} />

{#snippet boardView(ships, marks, tap, pv, onship, bindIt)}
  <div class="board" bind:this={boardEl}>
    <div class="cells">{#each Array(N * N) as _}<i></i>{/each}</div>
    <svg class="layer" viewBox="0 0 100 100">
      {#each ships as s (s.id)}
        <g class="ship" role="button" tabindex="-1" class:sunk={s.hits !== undefined && s.hits === s.len} transform={tf(s)} onpointerdown={onship ? (e) => onship(e, s.id) : undefined}>
          <ShipArt id={s.id} len={s.len} />
        </g>
      {/each}
    </svg>
    <div class="cells top">
      {#each Array(N * N) as _, i}
        <button class="t" class:ok={pv && pv.ok && pv.cells.includes(i)} class:bad={pv && !pv.ok && pv.cells.includes(i)} disabled={!tap} onclick={() => tap && tap(i)} aria-label={`Case ${i + 1}`}>
          {#if marks && marks[i] === 2}
            <svg viewBox="0 0 24 24"><polygon points="12,1 15,8 23,6 18,12 23,19 15,17 12,23 9,17 1,19 6,12 1,6 9,8" fill="#ff5a1f" stroke="#1f1a2e" stroke-width="1.8" stroke-linejoin="round" /><circle cx="12" cy="12" r="4" fill="#ffe14d" /></svg>
          {:else if marks && marks[i] === 1}
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="none" stroke="#1f1a2e" stroke-width="5.5" /><circle cx="12" cy="12" r="6" fill="none" stroke="#fff" stroke-width="3" /></svg>
          {/if}
        </button>
      {/each}
    </div>
  </div>
{/snippet}

<div class="bn" class:placing={phase === 'place'} bind:this={wrapEl}>
  {#if phase === 'pass'}
    <div class="pass">
      <div class="big">📱</div>
      <h3 class="outlined">Passe le téléphone à {label(pass.to)}</h3>
      <p>L'autre joueur ne doit pas regarder l'écran.</p>
      <button class="primary" onclick={ready}>Je suis prêt</button>
    </div>
  {:else if phase === 'place'}
    <p class="status" style="color: {who === 1 ? 'var(--p1)' : 'var(--p2)'}">{label(who)} : place ta flotte</p>
    <div class="tray">
      {#each SIZES as len, id}
        {#if !isPlaced(id) && !(drag && drag.id === id)}
          <div class="slot" style="width: calc(var(--bw) * {len} / 11)" onpointerdown={(e) => startDrag(e, id, false)} role="button" tabindex="0" aria-label={NAMES[id]}>
            <svg viewBox={`0 0 ${len * 10} 10`}><ShipArt {id} {len} /></svg>
          </div>
        {/if}
      {/each}
      {#if fleet.length === SIZES.length}<span class="done">Flotte prête !</span>{/if}
    </div>
    {@render boardView(fleet, null, null, preview, (e, id) => startDrag(e, id, true), true)}
    <p class="hint">{err || 'Glisse les bateaux · touche-en un pour le pivoter'}</p>
    <div class="row">
      <button onclick={randomize}>Aléatoire</button>
      <button onclick={resetPlacement}>Effacer</button>
      <button class="primary" onclick={validate}>Valider</button>
    </div>
  {:else}
    <p class="status" style="color: {who === 1 || mode === '1p' ? 'var(--p1)' : 'var(--p2)'}">
      {msg || (mode === '1p' ? (who === 1 ? 'À toi de tirer' : "L'IA tire…") : `${label(who)} : tire !`)}
    </p>
    {@render boardView(sunkShips(3 - viewer), shots[viewer], fire, null, null)}
    <p class="sub">Ma flotte</p>
    <div class="mini">
      {@render boardView(boards[viewer].ships, shots[3 - viewer], null, null, null)}
    </div>
  {/if}

  {#if ghost}
    <svg class="ghost" style="left:{ghost.left}px;top:{ghost.top}px;width:{ghost.w}px;height:{ghost.h}px" viewBox={ghost.hz ? `0 0 ${ghost.len * 10} 10` : `0 0 10 ${ghost.len * 10}`}>
      <g transform={ghost.hz ? '' : 'translate(10 0) rotate(90)'}><ShipArt id={ghost.id} len={ghost.len} /></g>
    </svg>
  {/if}
</div>

<style>
  .bn {
    --bw: min(94cqw, calc(100cqh - 250px), 360px);
    position: relative; width: min(96cqw, 400px); max-height: 100cqh; overflow-y: auto;
    display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 6px 0;
  }
  .bn.placing { touch-action: none; overflow: hidden; }
  .status { margin: 0; font-weight: 700; font-size: 20px; min-height: 28px; text-align: center; -webkit-text-stroke: 5px var(--ink); paint-order: stroke fill; }
  .sub, .hint { margin: 0; font-size: 13px; font-weight: 600; color: var(--ink); text-align: center; min-height: 18px; }
  .board {
    position: relative; width: var(--bw); aspect-ratio: 1; border: 4px solid var(--ink); border-radius: 14px;
    overflow: hidden; background: #4cc9f0; box-shadow: 0 6px 0 var(--ink); touch-action: none;
  }
  .mini { --bw: calc(min(94cqw, calc(100cqh - 270px), 360px) * .46); width: var(--bw); }
  .mini :global(.board) { border-width: 3px; box-shadow: 0 4px 0 var(--ink); }
  .cells { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(10, 1fr); grid-template-rows: repeat(10, 1fr); }
  .cells i { border: 1px solid rgba(255, 255, 255, .45); }
  .cells.top { z-index: 3; pointer-events: none; }
  .t:not(:disabled) { pointer-events: auto; }
  .t { background: transparent; padding: 0; border: 0; display: flex; align-items: center; justify-content: center; }
  .t svg { width: 86%; height: 86%; }
  .t:not(:disabled):active { background: rgba(255, 255, 255, .4); }
  .t.ok { background: rgba(120, 255, 120, .55); }
  .t.bad { background: rgba(255, 70, 70, .5); }
  .layer { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }
  .ship { pointer-events: all; cursor: grab; }
  .ship.sunk { filter: saturate(.3) brightness(.65); }
  .tray { display: flex; flex-wrap: wrap; gap: 8px 12px; justify-content: center; align-items: center; min-height: 36px; width: var(--bw); }
  .slot { touch-action: none; cursor: grab; }
  .slot svg { width: 100%; display: block; }
  .done { font-weight: 700; color: var(--ink); }
  .ghost { position: absolute; z-index: 20; pointer-events: none; filter: drop-shadow(0 5px 0 rgba(31, 26, 46, .35)); }
  .row { display: flex; gap: 10px; }
  button:not(.t) {
    padding: 9px 16px; border-radius: 14px; background: #fff; border: 3px solid var(--ink);
    box-shadow: 0 4px 0 var(--ink); font-weight: 700; font-size: 16px;
  }
  button:not(.t):active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  button.primary { background: #ffd84d; }
  .pass { text-align: center; padding: 22px; background: #fff; border: 4px solid var(--ink); border-radius: 26px; box-shadow: 0 8px 0 var(--ink); margin-top: 20px; }
  .pass .big { font-size: 56px; }
  .pass h3 { margin: 8px 0 4px; font-size: 24px; color: var(--p2); -webkit-text-stroke-width: 6px; }
  .pass p { margin: 0 0 16px; color: var(--muted); font-weight: 600; }
</style>
