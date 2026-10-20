<script>
  import { stats } from './store.svelte.js';
  import { sfx } from './sfx.svelte.js';
  import Burger from './Burger.svelte';
  import { createRoom } from './second-screen/room.js';

  let { game, mode, onexit } = $props();

  let s1 = $state(0);
  let s2 = $state(0);
  let round = $state(0);
  let winner = $state(0);
  let roomError = $state('');
  let copied = $state(false);
  const params = new URLSearchParams(window.location.search);
  const displayRoom = params.get('screen') === 'display' && params.get('room') ? params.get('room').toUpperCase() : '';
  const controllerUrl = new URL(window.location.href);
  controllerUrl.searchParams.set('screen', 'controller');
  controllerUrl.searchParams.set('game', 'coffre');

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

  async function startSecondScreen() {
    roomError = '';
    try {
      const code = await createRoom();
      const url = new URL(window.location.href);
      url.searchParams.set('screen', 'display');
      url.searchParams.set('game', game.id);
      url.searchParams.set('room', code);
      window.location.assign(url.toString());
    } catch (error) {
      roomError = error instanceof Error ? error.message : 'Impossible de créer la salle';
    }
  }

  async function copyControllerLink() {
    try {
      await navigator.clipboard.writeText(controllerUrl.toString());
      copied = true;
    } catch {
      copied = false;
    }
  }

  const name = (p) => (p === 2 && mode === '1p' ? 'IA' : `J${p}`);
</script>

<div class="shell" style="--c:{game.color}">
  <div class="stage" class:dom={game.dom}>
    {#key round}
      <game.component {mode} onpoint={point} />
    {/key}

    <div class="hud">
      <Burger ingame side="right" onmenu={onexit} onrestart={again} />
      {#if game.id === 'coffre' && !displayRoom}
        <button class="tv-button" onclick={startSecondScreen}>📺 Écran TV</button>
      {/if}
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
    {#if displayRoom}
      <aside class="room-panel">
        <strong>📱 Connecte ton téléphone</strong>
        <span>Code de salle : <b>{displayRoom}</b></span>
        <span class="room-url">Ouvre DuoGames sur le téléphone, puis saisis ce code.</span>
        <button onclick={copyControllerLink}>{copied ? 'Lien copié ✓' : 'Copier le lien de la manette'}</button>
      </aside>
    {/if}
    {#if roomError}<p class="room-error">{roomError}</p>{/if}
  </div>
</div>

<style>
  .shell { height: 100%; }
  .stage {
    height: 100%; position: relative; container-type: size;
    display: flex; align-items: center; justify-content: center;
  }
  .stage.dom { padding-top: 60px; }
  .hud {
    position: absolute; top: 8px; left: 8px; right: 8px; z-index: 10;
    display: flex; justify-content: space-between; align-items: flex-start; pointer-events: none;
  }
  .hud > :global(*) { pointer-events: auto; }
  .score { display: flex; gap: 6px; margin-right: 70px; }
  .tv-button { pointer-events: auto; background: #fff; border: 3px solid var(--ink); border-radius: 12px; padding: 7px 10px; font-size: 13px; font-weight: 700; box-shadow: 0 3px 0 var(--ink); }
  .room-panel { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 12; width: min(92%, 340px); display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 12px; border: 3px solid var(--ink); border-radius: 18px; background: #fff; box-shadow: 0 5px 0 var(--ink); text-align: center; font-size: 14px; }
  .room-panel strong { font-size: 16px; -webkit-text-stroke-width: 0; }
  .room-panel b { font-size: 22px; letter-spacing: 3px; }
  .room-url { font-size: 12px; }
  .room-panel button { border: 2px solid var(--ink); border-radius: 10px; padding: 7px 10px; background: #ffd84d; font-weight: 700; }
  .room-error { position: absolute; top: 54px; left: 50%; transform: translateX(-50%); z-index: 20; background: #fff; border: 2px solid #b42318; border-radius: 10px; padding: 8px 12px; max-width: 90%; }
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
