<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';

  let { mode, onpoint } = $props();

  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let board = $state(Array(9).fill(0));
  let turn = $state(1);
  let msg = $state('');
  let locked = false;
  let starter = 1;
  let winLine = $state([]);
  const timers = [];

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function winner(b) {
    for (const l of LINES) {
      const [a, c, d] = l;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], line: l };
    }
    return null;
  }

  function minimax(b, pl) {
    const w = winner(b);
    if (w) return w.p === 2 ? 1 : -1;
    if (b.every(Boolean)) return 0;
    let best = pl === 2 ? -2 : 2;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = pl;
      const v = minimax(b, 3 - pl);
      b[i] = 0;
      best = pl === 2 ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  }

  function aiMove() {
    const free = board.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (!free.length || locked) return;
    let pick;
    if (Math.random() < 0.3) {
      pick = free[Math.floor(Math.random() * free.length)];
    } else {
      const b = [...board];
      let best = -2;
      for (const i of free) {
        b[i] = 2;
        const v = minimax(b, 1);
        b[i] = 0;
        if (v > best) { best = v; pick = i; }
      }
    }
    play(pick, true);
  }

  function play(i, fromAI = false) {
    if (locked || board[i]) return;
    if (mode === '1p' && turn === 2 && !fromAI) return;
    board[i] = turn;
    sfx('tick');
    const w = winner(board);
    if (w) {
      locked = true;
      winLine = w.line;
      msg = w.p === 2 && mode === '1p' ? "L'IA marque !" : `Joueur ${w.p} marque !`;
      onpoint(w.p);
      later(reset, 1200);
      return;
    }
    if (board.every(Boolean)) {
      locked = true;
      msg = 'Égalité';
      later(reset, 1000);
      return;
    }
    turn = 3 - turn;
    if (mode === '1p' && turn === 2) later(aiMove, 450);
  }

  function reset() {
    board = Array(9).fill(0);
    winLine = [];
    msg = '';
    starter = 3 - starter;
    turn = starter;
    locked = false;
    if (mode === '1p' && turn === 2) later(aiMove, 500);
  }

  onMount(() => () => timers.forEach(clearTimeout));
</script>

<div class="ttt">
  <p class="status" style="color: {turn === 1 ? 'var(--p1)' : 'var(--p2)'}">
    {msg || (turn === 1 ? 'Tour de J1 (✕)' : mode === '1p' ? "Tour de l'IA (◯)" : 'Tour de J2 (◯)')}
  </p>
  <div class="grid">
    {#each board as c, i}
      <button
        class:x={c === 1}
        class:o={c === 2}
        class:win={winLine.includes(i)}
        onclick={() => play(i)}
        aria-label={`Case ${i + 1}`}
      >{c === 1 ? '✕' : c === 2 ? '◯' : ''}</button>
    {/each}
  </div>
</div>

<style>
  .ttt { width: min(92cqw, 420px); display: flex; flex-direction: column; align-items: center; gap: 22px; }
  .status { font-size: 22px; font-weight: 700; margin: 0; min-height: 30px; -webkit-text-stroke: 5px var(--ink); paint-order: stroke fill; text-align: center; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; padding: 14px; background: #fff7dd; border: 4px solid var(--ink); border-radius: 26px; box-shadow: 0 8px 0 var(--ink); }
  button {
    aspect-ratio: 1; background: #fff; border: 3px solid var(--ink); border-radius: 18px;
    font-size: clamp(40px, 15cqw, 78px); font-weight: 700; line-height: 1; box-shadow: 0 5px 0 var(--ink);
    -webkit-text-stroke: 4px var(--ink); paint-order: stroke fill; padding: 0 0 6px;
  }
  button:active { transform: translateY(3px); box-shadow: 0 2px 0 var(--ink); }
  .x { color: var(--p1); }
  .o { color: var(--p2); }
  .win { background: #ffe14d; animation: pop .4s ease infinite alternate; }
  @keyframes pop { to { transform: scale(1.06) rotate(-2deg); } }
</style>
