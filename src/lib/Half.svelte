<script>
  // Moitié d'écran d'un joueur : J2 est en haut, retourné à 180° en mode 2 joueurs
  let { p, mode = '2p', children } = $props();
</script>

<section class="half p{p}" class:flip={p === 2 && mode === '2p'}>
  {@render children?.()}
</section>

<style>
  .half {
    flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; padding: 10px; position: relative; overflow: hidden; text-align: center;
    background: var(--bg); border: 4px solid var(--ink); border-radius: 26px; box-shadow: 0 7px 0 var(--ink);
  }
  .p1 { --bg: #d9f2ff; --fg: var(--p1); }
  .p2 { --bg: #ffe0ec; --fg: var(--p2); }
  .flip { transform: rotate(180deg); }
</style>
