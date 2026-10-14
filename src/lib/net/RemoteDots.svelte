<script>
  // Plateau Dots and Boxes : une grille (2n+1)² où chaque case alterne point,
  // arête cliquable et carré. Seules les arêtes libres sont jouables.
  import { COLS, ROWS, hIndex, vIndex } from './games/dots.js';

  let { room, onplay } = $props();

  const size = 2 * ROWS + 1;
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r % 2 === 0 && c % 2 === 0) cells.push({ key: `d${r}${c}`, kind: 'dot' });
      else if (r % 2 === 0) cells.push({ key: `h${r}${c}`, kind: 'h', r: r / 2, c: (c - 1) / 2, index: hIndex(r / 2, (c - 1) / 2) });
      else if (c % 2 === 0) cells.push({ key: `v${r}${c}`, kind: 'v', r: (r - 1) / 2, c: c / 2, index: vIndex((r - 1) / 2, c / 2) });
      else cells.push({ key: `b${r}${c}`, kind: 'box', index: ((r - 1) / 2) * COLS + (c - 1) / 2 });
    }
  }

  const edge = (cell) => (cell.kind === 'h' ? room.state.h[cell.index] : room.state.v[cell.index]);
  const seat = $derived(room.you.seat);
  const playable = $derived(room.phase === 'playing' && room.turn === seat);
</script>

<div class="board" style="--n:{size}">
  {#each cells as cell (cell.key)}
    {#if cell.kind === 'dot'}
      <i class="dot"></i>
    {:else if cell.kind === 'box'}
      <span class="box p{room.state.boxes[cell.index]}">{room.state.boxes[cell.index] ? (room.state.boxes[cell.index] === 1 ? '🔵' : '🔴') : ''}</span>
    {:else}
      {@const taken = edge(cell)}
      <button
        class="edge {cell.kind} p{taken}"
        disabled={!playable || taken !== 0}
        aria-label={`Arête ${cell.kind}${cell.r},${cell.c}`}
        onclick={() => onplay({ t: cell.kind, r: cell.r, c: cell.c })}
      ></button>
    {/if}
  {/each}
</div>

<style>
  .board {
    width: min(94vw, 440px); aspect-ratio: 1; margin: 0 auto;
    display: grid; grid-template-columns: repeat(var(--n), 1fr); grid-template-rows: repeat(var(--n), 1fr);
    background: #fff; border: 4px solid var(--ink); border-radius: 22px; box-shadow: 0 8px 0 var(--ink);
    padding: 10px; gap: 2px;
  }
  .dot { place-self: center; width: 11px; height: 11px; border-radius: 50%; background: var(--ink); }
  .box { display: grid; place-items: center; border-radius: 8px; font-size: clamp(12px, 3.4vw, 20px); }
  .box.p1 { background: rgba(25, 181, 254, .26); }
  .box.p2 { background: rgba(255, 61, 127, .26); }
  .edge { background: transparent; display: grid; place-items: center; padding: 0; }
  .edge.h::before { content: ''; width: 100%; height: 9px; border-radius: 6px; background: rgba(31, 26, 46, .14); }
  .edge.v::before { content: ''; width: 9px; height: 100%; border-radius: 6px; background: rgba(31, 26, 46, .14); }
  .edge.p1::before { background: var(--p1); }
  .edge.p2::before { background: var(--p2); }
  .edge:disabled::before { opacity: 1; }
  .edge:active:not(:disabled)::before { transform: scale(.86); }
</style>
