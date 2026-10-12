<script>
  import { sound, toggleSound, sfx } from './sfx.svelte.js';
  import { fsSupported, isFs, toggleFs } from './fullscreen.js';
  import { loopState } from './canvas.js';

  let { ingame = false, side = 'left', onmenu, onrestart } = $props();

  let open = $state(false);
  let fs = $state(isFs());
  let note = $state('');
  const fsOk = fsSupported();

  function toggle() {
    open = !open;
    note = '';
    loopState.paused = open && ingame;
    sfx('tap');
  }
  async function doFs() {
    if (!fsOk) { note = "Plein écran indisponible ici. Ouvre la page directement dans ton navigateur."; return; }
    const ok = await toggleFs();
    if (!ok) note = 'Le plein écran a été refusé par le navigateur.';
  }
  function menu() { loopState.paused = false; open = false; onmenu?.(); }
  function restart() { loopState.paused = false; open = false; onrestart?.(); }

  $effect(() => () => { loopState.paused = false; });

  // Téléporte le panneau dans <body> afin d'échapper à tout "containing block"
  // d'ancêtre (transform, container-type, contain…). Sans ça, un ancêtre du jeu
  // peut cantonner le position: fixed au stage au lieu du viewport → pas plein écran.
  function portal(node) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }
</script>

<svelte:document onfullscreenchange={() => (fs = isFs())} />

<div class="bwrap">
  <button class="burger" onclick={toggle} aria-label="Menu" aria-expanded={open}><i></i><i></i><i></i></button>
  {#if open}
    <div class="panel" use:portal class:right={side === 'right'} onclick={toggle} role="presentation">
      <div class="inner" onclick={(e) => e.stopPropagation()} role="menu" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && toggle()}>
        <button onclick={toggleSound}><span class="ic">{sound.on ? '🔊' : '🔇'}</span>Son : {sound.on ? 'activé' : 'coupé'}</button>
        <button onclick={doFs}><span class="ic">⛶</span>{fs ? 'Quitter le plein écran' : fsOk ? 'Plein écran' : 'Plein écran (indisponible)'}</button>
        {#if ingame}
          <button onclick={restart}><span class="ic">↺</span>Recommencer</button>
          <button onclick={menu}><span class="ic">🏠</span>Retour au menu</button>
        {/if}
        <button class="go" onclick={toggle}>{ingame ? 'Reprendre' : 'Fermer'}</button>
        {#if note}<p class="note">{note}</p>{/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .bwrap { position: relative; }
  .burger {
    width: 46px; height: 46px; background: #fff; border: 3px solid var(--ink); border-radius: 15px;
    box-shadow: 0 4px 0 var(--ink); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 5px; padding: 0;
  }
  .burger i { display: block; width: 22px; height: 3.5px; background: var(--ink); border-radius: 3px; }
  .burger:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  .panel {
    position: fixed; inset: 0; z-index: 40;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    background: rgba(31, 26, 46, .55);
    animation: fade .18s ease-out;
  }
  .inner {
    width: min(100%, 340px); display: flex; flex-direction: column; gap: 10px;
    background: #fff7dd; border: 4px solid var(--ink); border-radius: 22px; box-shadow: 0 8px 0 var(--ink); padding: 16px;
    animation: pop .18s ease-out;
  }
  .panel button {
    display: flex; align-items: center; gap: 10px; text-align: left; padding: 10px 12px; background: #fff;
    border: 3px solid var(--ink); border-radius: 14px; box-shadow: 0 4px 0 var(--ink); font-weight: 700; font-size: 16px;
  }
  .panel button:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  .ic { width: 26px; text-align: center; font-size: 20px; }
  .go { background: #ffd84d !important; justify-content: center; }
  .note { margin: 0; font-size: 12.5px; font-weight: 600; color: var(--muted); }
  @keyframes pop { from { transform: scale(.85); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
</style>
