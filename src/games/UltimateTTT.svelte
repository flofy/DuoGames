<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';

  let { mode, onpoint } = $props();

  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let cells = $state(Array(81).fill(0));
  let bw = $state(Array(9).fill(0)); // 0 ouvert, 1/2 gagné, 3 nul
  let turn = $state(1);
  let forced = $state(-1);
  let msg = $state('');
  let over = $state(false);
  let last = $state(-1);
  const timers = [];
  const later = (f, ms) => timers.push(setTimeout(f, ms));

  function lineWinner(a) {
    for (const [x, y, z] of LINES) if (a[x] && a[x] < 3 && a[x] === a[y] && a[x] === a[z]) return a[x];
    return 0;
  }
  const sub = (b) => cells.slice(b * 9, b * 9 + 9);
  const full = (b) => sub(b).every(Boolean);
  const playable = (b) => bw[b] === 0 && !full(b);
  const legal = (b) => playable(b) && (forced < 0 || b === forced);

  function reset() {
    cells = Array(81).fill(0);
    bw = Array(9).fill(0);
    turn = 1; forced = -1; msg = ''; over = false; last = -1;
  }

  function finish(w) {
    over = true;
    msg = w === 2 && mode === '1p' ? "L'IA gagne !" : `Joueur ${w} gagne !`;
    onpoint(w);
  }

  function apply(b, c) {
    cells[b * 9 + c] = turn;
    sfx('tick');
    last = b * 9 + c;
    const s = sub(b);
    const w = lineWinner(s);
    if (w) bw[b] = w; else if (s.every(Boolean)) bw[b] = 3;
    const big = lineWinner(bw);
    if (big) { finish(big); return; }
    if (bw.every((v) => v)) {
      const n1 = bw.filter((v) => v === 1).length, n2 = bw.filter((v) => v === 2).length;
      if (n1 !== n2) finish(n1 > n2 ? 1 : 2);
      else { over = true; msg = 'Égalité, on rejoue'; later(reset, 1800); }
      return;
    }
    forced = playable(c) ? c : -1;
    turn = 3 - turn;
    if (mode === '1p' && turn === 2) later(aiMove, 550);
  }

  function tap(b, c) {
    if (over || (mode === '1p' && turn === 2)) return;
    if (!legal(b) || cells[b * 9 + c]) return;
    apply(b, c);
  }

  function canWin(arr, p) {
    for (let i = 0; i < 9; i++) {
      if (arr[i]) continue;
      const t = [...arr]; t[i] = p;
      if (lineWinner(t) === p) return true;
    }
    return false;
  }

  function scoreMove(b, c) {
    let s = Math.random() * 2;
    const mine = sub(b); mine[c] = 2;
    const wonSmall = lineWinner(mine) === 2;
    if (wonSmall) {
      s += 50;
      const nb = [...bw]; nb[b] = 2;
      if (lineWinner(nb) === 2) s += 1000;
    } else {
      const theirs = sub(b); theirs[c] = 1;
      if (lineWinner(theirs) === 1) s += 25;
    }
    const tsub = c === b ? mine : sub(c);
    const targetOpen = (c === b ? !wonSmall : bw[c] === 0) && !tsub.every(Boolean);
    if (targetOpen) { if (canWin(tsub, 1)) s -= 35; } else s -= 10;
    if (c === 4) s += 3;
    if (b === 4) s += 2;
    if ([0, 2, 6, 8].includes(c)) s += 1;
    return s;
  }

  function aiMove() {
    if (over) return;
    let best = null, bs = -Infinity;
    for (let b = 0; b < 9; b++) {
      if (!legal(b)) continue;
      for (let c = 0; c < 9; c++) {
        if (cells[b * 9 + c]) continue;
        const sc = scoreMove(b, c);
        if (sc > bs) { bs = sc; best = [b, c]; }
      }
    }
    if (best) apply(best[0], best[1]);
  }

  onMount(() => () => timers.forEach(clearTimeout));
</script>

<div class="u">
  <p class="status" style="color: {turn === 1 ? 'var(--p1)' : 'var(--p2)'}">
    {msg || `${turn === 1 ? 'J1 ✕' : mode === '1p' ? 'IA ◯' : 'J2 ◯'} · ${forced >= 0 ? 'joue dans la case éclairée' : 'joue où tu veux'}`}
  </p>
  <div class="big">
    {#each Array(9) as _, b}
      <div class="sb" class:active={!over && legal(b)} class:w1={bw[b] === 1} class:w2={bw[b] === 2} class:dr={bw[b] === 3}>
        {#each Array(9) as __, c}
          <button
            class="cell"
            class:x={cells[b * 9 + c] === 1}
            class:o={cells[b * 9 + c] === 2}
            class:last={last === b * 9 + c}
            onclick={() => tap(b, c)}
            aria-label={`Plateau ${b + 1}, case ${c + 1}`}
          >{cells[b * 9 + c] === 1 ? '✕' : cells[b * 9 + c] === 2 ? '◯' : ''}</button>
        {/each}
        {#if bw[b]}
          <div class="mark" class:m1={bw[b] === 1} class:m2={bw[b] === 2}>{bw[b] === 1 ? '✕' : bw[b] === 2 ? '◯' : ''}</div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .u { width: min(96cqw, calc(100cqh - 8px), 640px); display: flex; flex-direction: column; gap: 8px; align-items: center; }
  .status { margin: 0; font-weight: 700; font-size: 17px; min-height: 24px; text-align: center; -webkit-text-stroke: 4px var(--ink); paint-order: stroke fill; }
  .big { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; aspect-ratio: 1; background: #fff7dd; padding: 8px; border: 4px solid var(--ink); border-radius: 20px; box-shadow: 0 7px 0 var(--ink); }
  .sb {
    position: relative; display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 1fr; gap: 3px; aspect-ratio: 1;
    padding: 4px; border-radius: 12px; background: #e9dcc0; border: 3px solid var(--ink); opacity: .6; transition: transform .15s;
  }
  .sb.active { opacity: 1; background: #ffe14d; transform: scale(1.03); box-shadow: 0 0 0 3px var(--p2); }
  .cell {
    width: 100%; height: 100%; aspect-ratio: 1; border-radius: 6px; background: #fff; border: 2px solid var(--ink);
    font-size: clamp(12px, 5.4cqw, 26px); font-weight: 700; line-height: 1; padding: 0;
    display: flex; align-items: center; justify-content: center; -webkit-text-stroke: 2.5px var(--ink); paint-order: stroke fill;
  }
  .cell.x { color: var(--p1); }
  .cell.o { color: var(--p2); }
  .cell.last { background: #ffe9a6; }
  .mark {
    position: absolute; inset: -3px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
    font-size: clamp(40px, 18cqw, 90px); font-weight: 700; border: 3px solid var(--ink);
    -webkit-text-stroke: 6px var(--ink); paint-order: stroke fill;
  }
  .mark.m1 { background: var(--p1); color: #fff; }
  .mark.m2 { background: var(--p2); color: #fff; }
</style>
