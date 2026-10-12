<script>
  import { sound, toggleSound, sfx } from './sfx.svelte.js';
  import { fsSupported, isFs, toggleFs } from './fullscreen.js';
  import { loopState } from './canvas.js';

  let { ingame = false, side = 'left', onmenu, onrestart } = $props();

  let open = $state(false);
  let fs = $state(isFs());
  let note = $state('');
  let burgerEl;
  let panelEl;
  let wasOpen = false;
  const fsOk = fsSupported();
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

  function toggle() {
    open = !open;
    note = '';
    loopState.paused = open && ingame;
    sfx('tap');
  }

  $effect(() => {
    if (open) panelEl?.focus({ preventScroll: true });
    else if (wasOpen) burgerEl?.focus({ preventScroll: true });
    wasOpen = open;
  });

  function onDocumentKeydown(event) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      toggle();
    }
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

<svelte:document onfullscreenchange={() => (fs = isFs())} onkeydown={onDocumentKeydown} />

<div class="bwrap">
  <button bind:this={burgerEl} class="burger" class:right={side === 'right'} class:open={open} use:portal onclick={toggle} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} aria-controls="duogames-menu"><i></i><i></i><i></i></button>
  {#if open}
    <div id="duogames-menu" class="panel" onclick={(e) => e.target === e.currentTarget && toggle()} role="presentation">
      <div bind:this={panelEl} class="inner" role="dialog" aria-modal="true" aria-label="Menu" tabindex="-1">
        <button onclick={toggleSound}><span class="ic">{sound.on ? '🔊' : '🔇'}</span>Son : {sound.on ? 'activé' : 'coupé'}</button>
        <button onclick={doFs}><span class="ic">⛶</span>{fs ? 'Quitter le plein écran' : fsOk ? 'Plein écran' : 'Plein écran (indisponible)'}</button>
        {#if ingame}
          <button onclick={restart}><span class="ic">↺</span>Recommencer</button>
          <button onclick={menu}><span class="ic">🏠</span>Retour au menu</button>
        {/if}
        <button class="go" onclick={toggle}>{ingame ? 'Reprendre' : 'Fermer'}</button>
        {#if note}<p class="note">{note}</p>{/if}
        <p class="note ver">Version {version}</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .bwrap { position: relative; }
  .burger {
    position: fixed; top: max(12px, env(safe-area-inset-top)); left: max(12px, env(safe-area-inset-left)); z-index: 3003;
    width: 46px; height: 46px; touch-action: manipulation; background: #fff; border: 3px solid var(--ink); border-radius: 15px;
    box-shadow: 0 4px 0 var(--ink); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 5px; padding: 0;
  }
  .burger.right { left: auto; right: max(12px, env(safe-area-inset-right)); }
  .burger i { display: block; width: 22px; height: 3.5px; background: var(--ink); border-radius: 3px; transition: transform .2s ease, opacity .2s ease; }
  .burger.open i:nth-child(1) { transform: translateY(8.5px) rotate(45deg); }
  .burger.open i:nth-child(2) { opacity: 0; }
  .burger.open i:nth-child(3) { transform: translateY(-8.5px) rotate(-45deg); }
  .burger:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  .panel {
    position: fixed; inset: 0; z-index: 3002; width: 100vw; height: 100dvh;
    background: rgba(31, 26, 46, .55);
    animation: fade .18s ease-out;
  }
  .inner {
    width: 100%; height: 100dvh; max-width: 520px; margin: 0 auto;
    display: flex; flex-direction: column; justify-content: flex-start; gap: 12px; overflow-y: auto; overscroll-behavior: contain;
    background: #fff7dd;
    padding: 24px 20px;
    padding-top: calc(68px + env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
    animation: rise .2s ease-out;
  }
  .panel button {
    display: flex; align-items: center; gap: 12px; text-align: left; padding: 15px 16px; background: #fff;
    border: 3px solid var(--ink); border-radius: 16px; box-shadow: 0 4px 0 var(--ink); font-weight: 700; font-size: 18px;
  }
  .panel button:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  .ic { width: 28px; text-align: center; font-size: 22px; }
  .go { background: #ffd84d !important; justify-content: center; font-size: 19px; }
  .ver { opacity: .7; }
  .note { margin: 4px 0 0; font-size: 13px; font-weight: 600; color: var(--muted); text-align: center; }
  @keyframes rise { from { transform: translateY(18px); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
</style>
