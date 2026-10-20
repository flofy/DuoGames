<script>
  import { onMount } from 'svelte';
  import { games } from './games/index.js';
  import GameShell from './lib/GameShell.svelte';
  import Burger from './lib/Burger.svelte';
  import UpdateBanner from './lib/UpdateBanner.svelte';
  import { stats, recentGames } from './lib/store.svelte.js';
  import { sfx } from './lib/sfx.svelte.js';
  import SecondScreenController from './lib/SecondScreenController.svelte';

  const params = new URLSearchParams(window.location.search);
  const requestedRole = params.get('screen');
  const screenRole = requestedRole === 'controller' || (requestedRole === 'display' && params.get('room')) ? requestedRole : null;
  const screenGame = params.get('game') || 'coffre';

  let current = $state(screenRole === 'display' ? (games.find((g) => g.id === screenGame) ?? null) : null);
  let mode = $state(screenRole ? '2p' : '1p');
  let splash = $state(!screenRole);
  let leaving = $state(false);
  let tab = $state('classic');
  const title = 'Jeux à deux'.split('');
  const classic = games.filter((g) => !g.party);
  const party = games.filter((g) => g.party);

  // Reordonne les jeux : dernier joué en premier, les jamais joués gardent leur ordre relatif
  function ordered(list) {
    const rec = recentGames.list;
    return [...list].sort((a, b) => {
      const ia = rec.indexOf(a.id);
      const ib = rec.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  function skip() {
    if (leaving) return;
    leaving = true;
    sfx('pop');
    setTimeout(() => (splash = false), 600);
  }
  onMount(() => {
    if (screenRole) return;
    const t = setTimeout(skip, 2800);
    return () => clearTimeout(t);
  });

  function open(g) { sfx('tap'); recentGames.touch(g.id); current = g; }
  function setMode(m) { sfx('tap'); mode = m; }
</script>

{#snippet card(g)}
  <button class="card" style="--c:{g.color};--i:{games.indexOf(g)}" onclick={() => open(g)}>
    <span class="emoji">{g.emoji}</span>
    <strong class="outlined">{g.name}</strong>
    <small>{g.desc}</small>
  </button>
{/snippet}

{#if screenRole === 'controller'}
  <SecondScreenController />
{:else if current}
  <GameShell game={current} {mode} onexit={() => (current = null)} />
{:else}
  <main>
    <div class="topbar">
      <h1 class="outlined">Jeux à deux</h1>
      <Burger side="right" />
    </div>
    <div class="hero">
      <p class="sub">Un écran, deux joueurs. Ou toi contre l'IA.</p>
    </div>

    <div class="mode">
      <button class:on={mode === '1p'} onclick={() => setMode('1p')}>1 joueur</button>
      <button class:on={mode === '2p'} onclick={() => setMode('2p')}>2 joueurs</button>
    </div>

    <div class="cup">
      <span class="side p1">J1 <b>{stats.p1}</b></span>
      <span class="mid">🏆 Coupe</span>
      <span class="side p2"><b>{stats.p2}</b> J2</span>
      <button class="reset" onclick={() => stats.reset()} aria-label="Réinitialiser le score">↺</button>
    </div>

    <div class="tabs">
      <button class:active={tab === 'classic'} onclick={() => (tab = 'classic')}>Classique</button>
      <button class:active={tab === 'party'} onclick={() => (tab = 'party')}>🎉 Party</button>
    </div>

    {#if tab === 'classic'}
      <div class="grid">
        {#each ordered(classic) as g (g.id)}
          {@render card(g)}
        {/each}
      </div>
    {:else}
      <div class="grid">
        {#each ordered(party) as g (g.id)}
          {@render card(g)}
        {/each}
      </div>
    {/if}
  </main>
{/if}

<UpdateBanner />

{#if splash}
  <div class="splash" class:out={leaving} onclick={skip} role="presentation">
    <i class="ball b1"></i>
    <i class="ball b2"></i>
    <svg class="burst" viewBox="0 0 100 100">
      <polygon points="50,2 61,32 94,26 72,50 94,74 61,68 50,98 39,68 6,74 28,50 6,26 39,32" fill="#ffe14d" stroke="#1f1a2e" stroke-width="4" stroke-linejoin="round" />
    </svg>
    <h1 class="logo outlined">
      {#each title as ch, i}<span style="--d:{i * 70}ms">{ch === ' ' ? '\u00a0' : ch}</span>{/each}
    </h1>
  </div>
{/if}

<style>
  main { max-width: 520px; margin: 0 auto; padding: 12px 16px 30px; min-height: 100dvh; }
  .topbar {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
  }
  .hero { text-align: left; margin: 0 0 18px; }
  h1 {
    margin: 0; font-size: 44px; font-weight: 700; color: #fff; letter-spacing: 1px;
    -webkit-text-stroke-width: 9px; text-shadow: 0 6px 0 var(--ink); transform: rotate(-2deg); display: inline-block;
  }
  .sub { color: var(--ink); margin: 10px 0 0; font-size: 16px; font-weight: 600; }
  .mode { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 6px; background: #fff; border: 3px solid var(--ink); border-radius: 18px; box-shadow: 0 5px 0 var(--ink); margin-bottom: 16px; }
  .mode button { padding: 10px; border-radius: 12px; background: transparent; font-weight: 700; font-size: 17px; color: var(--muted); }
  .mode .on { background: var(--p2); color: #fff; border: 3px solid var(--ink); padding: 7px; box-shadow: 0 3px 0 var(--ink); }
  .cup {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: #fff; border: 3px solid var(--ink); border-radius: 18px; box-shadow: 0 5px 0 var(--ink);
    padding: 10px 16px; margin-bottom: 20px; font-weight: 700; font-size: 17px;
  }
  .cup b { font-size: 24px; }
  .p1 { color: #0a8fd1; } .p2 { color: #e0185f; }
  .mid { color: #e08a00; }
  .reset { background: transparent; font-size: 20px; color: var(--muted); }
  .tabs {
    display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 6px;
    background: #fff; border: 3px solid var(--ink); border-radius: 18px;
    box-shadow: 0 5px 0 var(--ink); margin-bottom: 16px;
  }
  .tabs button { padding: 10px; border-radius: 12px; background: transparent; font-weight: 700; font-size: 17px; color: var(--muted); }
  .tabs button.active { background: var(--p2); color: #fff; border: 3px solid var(--ink); padding: 7px; box-shadow: 0 3px 0 var(--ink); }
  .cat { margin: 26px 0 14px; font-size: 28px; color: #fff; -webkit-text-stroke-width: 7px; text-shadow: 0 4px 0 var(--ink); transform: rotate(-1.5deg); text-align: center; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 14px; }
  .card {
    background: var(--c); border: 4px solid var(--ink); border-radius: 22px; padding: 14px 10px 12px; text-align: center;
    display: flex; flex-direction: column; gap: 4px; align-items: center; color: #fff;
    box-shadow: 0 7px 0 var(--ink); transition: transform .08s;
    animation: cardIn .5s cubic-bezier(.3, 1.4, .5, 1) both; animation-delay: calc(var(--i) * 55ms + 350ms);
  }
  .card:nth-child(odd) { --r: -1.3deg; }
  .card:nth-child(even) { --r: 1.3deg; }
  .card:active { transform: translateY(5px) rotate(0); box-shadow: 0 2px 0 var(--ink); }
  .emoji {
    font-size: 34px; width: 62px; height: 62px; display: flex; align-items: center; justify-content: center;
    background: #fff; border: 3px solid var(--ink); border-radius: 50%; margin-bottom: 4px; box-shadow: 0 3px 0 var(--ink);
  }
  strong { font-size: 18px; font-weight: 700; -webkit-text-stroke-width: 5px; line-height: 1.1; }
  small { color: var(--ink); font-size: 12.5px; line-height: 1.25; font-weight: 600; }
  @keyframes cardIn {
    from { transform: translateY(40px) scale(.7) rotate(8deg); opacity: 0; }
    to { transform: rotate(var(--r)); opacity: 1; }
  }

  .splash {
    position: fixed; inset: 0; z-index: 100; overflow: hidden;
    background-color: #ff3d7f; background-image: radial-gradient(rgba(255, 255, 255, .35) 3px, transparent 3.5px); background-size: 28px 28px;
    display: flex; align-items: center; justify-content: center;
  }
  .splash.out { animation: wipe .6s cubic-bezier(.6, 0, .9, .4) forwards; }
  @keyframes wipe { to { transform: translateY(-105%); } }
  .ball { position: absolute; top: calc(50% - 150px); width: 72px; height: 72px; border-radius: 50%; border: 4px solid var(--ink); box-shadow: 0 5px 0 var(--ink); }
  .b1 { left: -90px; background: var(--p1); animation: roll1 1.9s ease-in forwards; }
  .b2 { right: -90px; background: #ffd84d; animation: roll2 1.9s ease-in forwards; }
  @keyframes roll1 {
    0% { transform: translateX(0) rotate(0); }
    42% { transform: translateX(calc(50vw + 9px)) rotate(540deg); opacity: 1; }
    62% { transform: translateX(calc(50vw - 30px)) translateY(-70px) rotate(700deg); opacity: 1; }
    100% { transform: translateX(calc(50vw - 120px)) translateY(-420px) rotate(1000deg); opacity: 0; }
  }
  @keyframes roll2 {
    0% { transform: translateX(0) rotate(0); }
    42% { transform: translateX(calc(-50vw - 9px)) rotate(-540deg); opacity: 1; }
    62% { transform: translateX(calc(-50vw + 30px)) translateY(-70px) rotate(-700deg); opacity: 1; }
    100% { transform: translateX(calc(-50vw + 120px)) translateY(-420px) rotate(-1000deg); opacity: 0; }
  }
  .burst { position: absolute; width: 180px; top: calc(50% - 240px); left: calc(50% - 90px); opacity: 0; animation: burst .8s ease-out 0.75s both; }
  @keyframes burst {
    0% { transform: scale(.2) rotate(-20deg); opacity: 0; }
    35% { transform: scale(1.15) rotate(6deg); opacity: 1; }
    100% { transform: scale(1.35) rotate(10deg); opacity: 0; }
  }
  .logo { margin: 40px 0 0; font-size: 56px; white-space: nowrap; transform: rotate(-3deg); text-shadow: 0 7px 0 var(--ink); -webkit-text-stroke-width: 11px; }
  .logo span { display: inline-block; animation: drop .7s cubic-bezier(.3, 1.5, .5, 1) both; animation-delay: calc(.9s + var(--d)); }
  @keyframes drop {
    0% { transform: translateY(-110vh) rotate(-25deg); opacity: 0; }
    100% { transform: translateY(0) rotate(0); opacity: 1; }
  }

  /* Responsive : grille et largeur container sur grand écran */
  @media (min-width: 768px) {
    main { max-width: 960px; }
    .topbar {
      width: auto;
      margin-left: 0;
      margin-right: 0;
      max-width: 960px;
      margin: 0 auto;
    }
    .grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (min-width: 1024px) {
    .grid { grid-template-columns: repeat(4, 1fr); }
  }
</style>
