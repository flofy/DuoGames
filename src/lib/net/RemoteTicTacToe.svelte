<script>
  // Plateau de morpion piloté par l'état serveur : on n'envoie que l'intention.
  import { getRemoteGame } from './games/registry.js';

  let { room, onplay } = $props();

  const over = $derived(room.state ? getRemoteGame(room.game)?.rules.result(room.state) : null);
  const seat = $derived(room.you.seat);
  const playable = $derived(room.phase === 'playing' && room.turn === seat);
  const marks = ['', '✕', '◯'];
</script>

<div class="board" class:waiting={!playable}>
  {#each room.state.board as cell, i (i)}
    <button
      class="cell c{cell}"
      class:win={over?.line?.includes(i)}
      disabled={!playable || cell !== 0}
      aria-label={`Case ${i + 1}`}
      onclick={() => onplay({ cell: i })}
    >
      {marks[cell]}
    </button>
  {/each}
</div>

<style>
  .board {
    width: min(94vw, 420px); aspect-ratio: 1; margin: 0 auto;
    display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);
    gap: 8px; background: #fff; border: 4px solid var(--ink); border-radius: 22px;
    box-shadow: 0 8px 0 var(--ink); padding: 10px;
  }
  .cell {
    display: grid; place-items: center; font-size: clamp(30px, 9vw, 56px); font-weight: 700;
    background: #fff7dd; border: 3px solid var(--ink); border-radius: 14px; transition: transform .08s;
  }
  .cell:disabled { opacity: 1; }
  .c1 { color: var(--p1); }
  .c2 { color: var(--p2); }
  .win { background: #ffe14d; }
  .cell:active:not(:disabled) { transform: translateY(3px); }
  .waiting { opacity: .92; }
</style>
