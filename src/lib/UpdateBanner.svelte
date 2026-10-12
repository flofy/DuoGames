<script>
  import { pwa, applyUpdate, dismiss } from './pwa.svelte.js';
  import { sfx } from './sfx.svelte.js';

  // « Prêt hors-ligne » disparaît tout seul
  $effect(() => {
    if (!pwa.offlineReady) return;
    const t = setTimeout(dismiss, 4000);
    return () => clearTimeout(t);
  });
</script>

{#if pwa.needRefresh}
  <div class="banner" role="alert">
    <span>🎉 Nouvelle version disponible</span>
    <div class="row">
      <button class="go" onclick={() => { sfx('pop'); applyUpdate(); }}>Mettre à jour</button>
      <button onclick={dismiss}>Plus tard</button>
    </div>
  </div>
{:else if pwa.offlineReady}
  <div class="banner" role="status"><span>✅ Prêt pour jouer hors-ligne</span></div>
{/if}

<style>
  .banner {
    position: fixed; z-index: 200; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom));
    max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; align-items: center;
    background: #fff; border: 4px solid var(--ink); border-radius: 22px; box-shadow: 0 7px 0 var(--ink);
    padding: 12px 16px; font-weight: 700; text-align: center; animation: up 0.3s ease-out;
  }
  .row { display: flex; gap: 10px; }
  button { padding: 8px 16px; font-weight: 700; font-size: 16px; background: #fff; border: 3px solid var(--ink); border-radius: 14px; box-shadow: 0 4px 0 var(--ink); }
  button:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  .go { background: #ffd84d; }
  @keyframes up { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
</style>
