<script>
  import { stats } from './store.svelte.js';
  import { sfx } from './sfx.svelte.js';
  import Burger from './Burger.svelte';

  let { game, mode, onexit } = $props();

  let s1 = $state(0);
  let s2 = $state(0);
  let round = $state(0);
  let winner = $state(0);

  function point(p) {
    if (winner) return;
    if (p === 1) s1++; else s2++;
    if (s1 >= game.target || s2 >= game.target) {
      winner = s1 > s2 ? 1 : 2;
      stats.add(winner);
      sfx('win');
    } else sfx('point');
  }

  function again() {
    s1 = 0; s2 = 0; winner = 0; round++;
  }

  const name = (p) => (p === 2 && mode === '1p' ? 'IA' : `J${p}`);
</script>

<div class="shell" style="--c:{game.color}">
  <div class="stage" class:dom={game.dom}>
    <div class="gamewrap">
      {#key round}
        <game.component {mode} onpoint={point} />
      {/key}
    </div>

    <div class="hud">
      <Burger ingame onmenu={onexit} onrestart={again} />
      <div class="score">
        <span class="pill p1">{s1}</span>
        <span class="pill p2">{s2}</span>
      </div>
    </div>

    {#key round}
      <div class="intro outlined">{game.name}</div>
    {/key}

    {#if winner}
      <div class="overlay">
        <div class="card">
          <div class="trophy">🏆</div>
          <h2 class="outlined" style="color: var(--p{winner})">{name(winner)} gagne !</h2>
          <p>{s1} – {s2}{game.target > 1 ? ` · premier à ${game.target}` : ''}</p>
          <div class="actions">
            <button class="primary" onclick={again}>Rejouer</button>
            <button onclick={onexit}>Menu</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .shell { height: 100%; }
  .stage {
    height: 100%; position: relative;
    display: flex; align-items: center; justify-content: center;
  }
  .gamewrap {
    width: 100%; height: 100%; container-type: size;
    display: flex; align-items: center; justify-content: center;
  }
  .stage.dom { padding-top: 60px; }
  .hud {
    position: absolute; top: 8px; left: 8px; right: 8px; z-index: 10;
    display: flex; justify-content: space-between; align-items: flex-start; pointer-events: none;
  }
  .hud > :global(*) { pointer-events: auto; }
  .score { display: flex; gap: 6px; }
  .pill {
    min-width: 36px; text-align: center; font-size: 20px; font-weight: 700; padding: 1px 10px;
    border-radius: 12px; background: #fff; border: 3px solid var(--ink); box-shadow: 0 3px 0 var(--ink);
  }
  .pill.p1 { color: #0a8fd1; }
  .pill.p2 { color: #e0185f; }
  .intro {
    position: absolute; top: 22%; left: 50%; z-index: 8; pointer-events: none; white-space: nowrap;
    font-size: 40px; font-weight: 700; color: #fff; -webkit-text-stroke-width: 9px; text-shadow: 0 5px 0 var(--ink);
    animation: intro 1.8s ease-out both;
  }
  @keyframes intro {
    0% { transform: translateX(-50%) scale(.3) rotate(-8deg); opacity: 0; }
    18% { transform: translateX(-50%) scale(1.12) rotate(-3deg); opacity: 1; }
    30% { transform: translateX(-50%) scale(1) rotate(-3deg); }
    75% { transform: translateX(-50%) scale(1) rotate(-3deg); opacity: 1; }
    100% { transform: translateX(-50%) translateY(-24px) scale(1) rotate(-3deg); opacity: 0; }
  }
  .overlay {
    position: absolute; inset: 0; background: rgba(31, 26, 46, 0.65);
    display: flex; align-items: center; justify-content: center; z-index: 20;
  }
  .card {
    background: #fff; border: 4px solid var(--ink); border-radius: 26px; padding: 22px 34px;
    text-align: center; box-shadow: 0 9px 0 var(--ink); transform: rotate(-1.5deg); animation: pop .3s ease-out;
  }
  .trophy { font-size: 56px; }
  h2 { margin: 6px 0 2px; font-size: 32px; -webkit-text-stroke-width: 7px; }
  p { margin: 0 0 16px; color: var(--muted); font-weight: 600; }
  .actions { display: flex; gap: 10px; justify-content: center; }
  .actions button {
    padding: 10px 20px; border-radius: 14px; background: #fff; border: 3px solid var(--ink);
    box-shadow: 0 4px 0 var(--ink); font-weight: 700; font-size: 17px;
  }
  .actions button:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  .actions .primary { background: #ffd84d; }
  @keyframes pop { from { transform: scale(.7) rotate(-6deg); opacity: 0; } to { transform: rotate(-1.5deg); opacity: 1; } }
</style>
