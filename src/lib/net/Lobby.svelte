<script>
  // Créer ou rejoindre un salon : un appareil par joueur, même partie.
  import { onMount } from 'svelte';
  import Burger from '../Burger.svelte';
  import { sfx } from '../sfx.svelte.js';
  import { remoteGames } from './games/registry.js';
  import { codeFromUrl, createRoom, joinRoom, recentRooms, session, setName } from './session.svelte.js';

  let { onexit } = $props();

  let game = $state(remoteGames[0]?.id ?? '');
  let code = $state('');
  let pseudo = $state(session.name);
  let busy = $state(false);

  const recent = recentRooms();

  function saveName() {
    if (pseudo !== session.name) setName(pseudo);
  }

  async function create() {
    saveName();
    busy = true;
    sfx('tap');
    await createRoom(game);
    busy = false;
  }

  function join() {
    saveName();
    sfx('tap');
    joinRoom(code);
  }

  // Un lien partagé (?room=AB34) rejoint directement le salon.
  onMount(() => {
    const fromUrl = codeFromUrl();
    if (fromUrl) {
      code = fromUrl;
      join();
    }
  });
</script>

<main>
  <div class="topbar">
    <button class="back" onclick={() => { sfx('tap'); onexit(); }} aria-label="Retour au menu">‹ Menu</button>
    <Burger side="right" />
  </div>

  <h1 class="outlined">🌐 Multi</h1>
  <p class="sub">Un appareil par joueur — téléphone, tablette ou ordinateur.</p>

  <label class="field">
    <span>Ton pseudo</span>
    <input bind:value={pseudo} onblur={saveName} maxlength="12" placeholder="Joueur" autocomplete="nickname" />
  </label>

  <h2 class="cat">Choisis un jeu</h2>
  <div class="games">
    {#each remoteGames as g (g.id)}
      <button class="pick" class:on={game === g.id} style="--c:{g.color}" onclick={() => { game = g.id; sfx('tap'); }}>
        <span class="emoji">{g.emoji}</span>
        <strong>{g.name}</strong>
        <small>{g.desc}</small>
      </button>
    {/each}
  </div>

  <button class="primary" onclick={create} disabled={busy}>
    {busy ? 'Création…' : 'Créer un salon'}
  </button>

  <div class="or"><span>ou</span></div>

  <div class="joinrow">
    <input
      class="code"
      bind:value={code}
      maxlength="4"
      placeholder="AB34"
      autocapitalize="characters"
      spellcheck="false"
      aria-label="Code du salon"
      oninput={() => (code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
    />
    <button class="secondary" onclick={join} disabled={code.length < 4}>Rejoindre</button>
  </div>

  {#if session.error}
    <p class="error">{session.error}</p>
  {/if}

  {#if recent.length}
    <h2 class="cat small">Salons récents</h2>
    <div class="recents">
      {#each recent as r (r.code)}
        <button onclick={() => { sfx('tap'); joinRoom(r.code); }}>
          <b>{r.code}</b><span>{remoteGames.find((g) => g.id === r.game)?.emoji ?? '🎮'}</span>
        </button>
      {/each}
    </div>
  {/if}

  <p class="help">
    Le premier appareil crée le salon et partage le lien (ou le code à 4 lettres).
    Chaque joueur voit la même partie depuis son écran.
  </p>
</main>

<style>
  main { max-width: 520px; margin: 0 auto; padding: 12px 16px 30px; height: 100%; overflow-y: auto; }
  .topbar { display: flex; justify-content: space-between; align-items: center; }
  .back {
    background: #fff; border: 3px solid var(--ink); border-radius: 14px; box-shadow: 0 4px 0 var(--ink);
    padding: 8px 14px; font-weight: 700;
  }
  .back:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  h1 { text-align: center; margin: 6px 0 4px; font-size: 40px; color: #fff; -webkit-text-stroke-width: 9px; text-shadow: 0 6px 0 var(--ink); transform: rotate(-2deg); display: inline-block; width: 100%; }
  .sub { text-align: center; margin: 6px 0 18px; font-weight: 600; color: var(--muted); }
  .field { display: block; margin-bottom: 8px; }
  .field span { display: block; font-weight: 700; margin: 0 0 6px 4px; }
  input {
    width: 100%; padding: 12px 14px; font: inherit; font-weight: 700; background: #fff;
    border: 3px solid var(--ink); border-radius: 16px; box-shadow: inset 0 -3px 0 rgba(31, 26, 46, .12);
  }
  .cat { margin: 22px 0 12px; font-size: 22px; text-align: center; color: var(--ink); }
  .cat.small { margin-top: 26px; font-size: 18px; }
  .games { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pick {
    display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center;
    background: #fff; border: 3px solid var(--ink); border-radius: 20px; box-shadow: 0 5px 0 var(--ink);
    padding: 12px 8px; opacity: .62;
  }
  .pick.on { background: var(--c); color: #fff; opacity: 1; }
  .pick .emoji { font-size: 30px; }
  .pick strong { font-size: 16px; }
  .pick small { font-size: 11.5px; color: var(--ink); line-height: 1.2; }
  .pick.on small { color: #fff; }
  .primary, .secondary {
    width: 100%; padding: 15px; font-size: 19px; font-weight: 700; border: 3px solid var(--ink);
    border-radius: 18px; box-shadow: 0 5px 0 var(--ink);
  }
  .primary { background: #ffd84d; margin-top: 18px; }
  .secondary { background: #fff; width: auto; padding: 15px 18px; white-space: nowrap; }
  .primary:disabled, .secondary:disabled { opacity: .5; box-shadow: none; }
  .primary:active:not(:disabled), .secondary:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 2px 0 var(--ink); }
  .or { text-align: center; margin: 16px 0; position: relative; }
  .or::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 3px; background: var(--ink); opacity: .25; }
  .or span { position: relative; background: var(--paper); padding: 0 12px; font-weight: 700; color: var(--muted); }
  .joinrow { display: flex; gap: 10px; }
  .code { text-align: center; letter-spacing: 8px; font-size: 24px; text-indent: 8px; }
  .error { margin: 14px 0 0; padding: 10px 14px; background: #ffe0ec; border: 3px solid var(--ink); border-radius: 14px; font-weight: 700; }
  .recents { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .recents button {
    display: flex; align-items: center; gap: 8px; background: #fff; border: 3px solid var(--ink);
    border-radius: 14px; box-shadow: 0 4px 0 var(--ink); padding: 8px 14px; font-weight: 700; letter-spacing: 2px;
  }
  .recents span { letter-spacing: 0; }
  .help { margin: 26px 0 0; font-size: 13px; font-weight: 600; color: var(--muted); text-align: center; line-height: 1.45; }
</style>
