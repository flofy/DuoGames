<script>
  // Partie en cours : tableau de bord (salon, joueurs, manches) + le jeu choisi.
  import Burger from '../Burger.svelte';
  import { sfx } from '../sfx.svelte.js';
  import { getRemoteGame } from './games/registry.js';
  import RemoteDots from './RemoteDots.svelte';
  import RemoteTicTacToe from './RemoteTicTacToe.svelte';
  import { hello, leave, move, ready, rematch, session } from './session.svelte.js';

  let { onexit } = $props();

  const room = $derived(session.room);
  const meta = $derived(getRemoteGame(room?.game));
  const seat = $derived(room?.you?.seat ?? 0);
  const spectator = $derived(seat === 0);
  const me = $derived(seat > 0 ? room?.players?.[seat - 1] ?? null : null);
  const myTurn = $derived(!!room && room.phase === 'playing' && room.turn === seat);
  const absent = $derived((room?.players ?? []).filter((p) => p === null).length);
  const myScore = $derived(seat > 0 ? room?.scores?.[seat - 1] ?? 0 : 0);
  const theirScore = $derived(seat > 0 ? room?.scores?.[seat === 1 ? 1 : 0] ?? 0 : 0);

  let copied = $state('');
  // Suivi non réactif : sert uniquement à déclencher les bruitages.
  let prev = { scores: [0, 0], phase: '', round: 0 };

  $effect(() => {
    const r = room;
    if (!r) return;
    if (r.scores[0] !== prev.scores[0] || r.scores[1] !== prev.scores[1]) {
      const before = seat > 0 ? prev.scores[seat - 1] ?? 0 : 0;
      if (seat > 0 && (r.scores[seat - 1] ?? 0) > before) sfx('point');
      else sfx('hit');
      prev.scores = [...r.scores];
    }
    if (r.phase !== prev.phase || r.round !== prev.round) {
      if (r.phase === 'match') sfx('win');
      prev.phase = r.phase;
      prev.round = r.round;
    }
  });

  async function copyLink() {
    sfx('tap');
    try {
      await navigator.clipboard.writeText(session.link);
      copied = 'Lien copié ✓';
    } catch {
      copied = session.link;
    }
    setTimeout(() => (copied = ''), 2500);
  }

  function quit() {
    sfx('tap');
    leave();
    onexit();
  }

  const label = (p) => (p.seat === seat ? `${p.name} (toi)` : p.name);
</script>

<main>
  <div class="topbar">
    <button class="quit" onclick={quit} aria-label="Quitter le salon">‹ Quitter</button>
    <Burger side="right" />
  </div>

  <div class="head">
    <span class="badge">{meta?.emoji} {meta?.name ?? 'Salon'}</span>
    <button class="code" onclick={copyLink} title="Copier le lien d'invitation">{session.code}</button>
  </div>

  {#if copied}<p class="toast">{copied}</p>{/if}

  {#if session.status === 'connecting'}
    <p class="notice">Connexion au salon…</p>
  {:else if session.status === 'offline'}
    <p class="notice off">Connexion perdue — reconnexion…</p>
  {/if}

  <div class="roster">
    {#each [1, 2] as s}
      {@const p = room?.players?.[s - 1] ?? null}
      <div class="pl p{s}" class:turn={room?.phase === 'playing' && room.turn === s}>
        <span class="dot" class:off={p && !p.connected}></span>
        <span class="who">{p ? label({ ...p, seat: s }) : 'En attente…'}</span>
        {#if p?.ready}<span class="ok">prêt</span>{/if}
      </div>
    {/each}
  </div>

  {#if room}
    <div class="score">
      <span class="pill p1">{seat === 1 ? myScore : theirScore}</span>
      <span class="mid">Manche {room.round} · premier à {room.target}</span>
      <span class="pill p2">{seat === 2 ? myScore : theirScore}</span>
    </div>

    {#if spectator}
      <p class="notice">Tu regardes la partie.{#if absent} Une place s’est libérée.{/if}</p>
      {#if absent}
        <button class="cta" onclick={() => { sfx('tap'); hello(); }}>Prendre la place libre</button>
      {/if}
    {:else if room.phase === 'lobby'}
      <p class="notice">
        {absent ? `Partage le code ${session.code} avec l’autre joueur.` : 'Tout le monde est là !'}
      </p>
      <button class="cta" class:on={me?.ready} onclick={() => { sfx('tap'); ready(!me?.ready); }}>
        {me?.ready ? 'Prêt ✓ (annuler)' : 'Je suis prêt'}
      </button>
    {:else if room.phase === 'playing'}
      <p class="notice" class:mine={myTurn}>
        {myTurn ? 'À toi de jouer !' : `Au tour de ${room.players[room.turn - 1]?.name ?? `J${room.turn}`}`}
      </p>
    {:else}
      <div class="overlay">
        <div class="card">
          <div class="trophy">{room.phase === 'match' ? '🏆' : '🎉'}</div>
          <h2 class="outlined">
            {#if room.roundWinner === 0}
              Égalité !
            {:else if room.roundWinner === seat}
              Tu gagnes la manche !
            {:else}
              {room.players[room.roundWinner - 1]?.name ?? `J${room.roundWinner}`} gagne la manche
            {/if}
          </h2>
          <p>{myScore} – {theirScore}{room.phase === 'match' ? ' · match terminé' : ''}</p>
          <button class="cta" class:on={me?.ready} onclick={() => { sfx('tap'); room.phase === 'match' ? rematch() : ready(true); }}>
            {me?.ready ? 'En attente de l’autre joueur…' : room.phase === 'match' ? 'Revanche' : 'Manche suivante'}
          </button>
        </div>
      </div>
    {/if}

    {#if room.state && room.game === 'ttt'}
      <RemoteTicTacToe {room} onplay={move} />
    {:else if room.state && room.game === 'dots'}
      <RemoteDots {room} onplay={move} />
    {/if}
  {/if}
</main>

<style>
  main { max-width: 520px; margin: 0 auto; padding: 12px 16px 30px; height: 100%; overflow-y: auto; display: flex; flex-direction: column; }
  .topbar { display: flex; justify-content: space-between; align-items: center; }
  .quit {
    background: #fff; border: 3px solid var(--ink); border-radius: 14px; box-shadow: 0 4px 0 var(--ink);
    padding: 8px 14px; font-weight: 700;
  }
  .quit:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 14px 0 10px; }
  .badge { font-weight: 700; font-size: 17px; }
  .code {
    font: inherit; font-weight: 700; font-size: 22px; letter-spacing: 6px; text-indent: 6px;
    background: #ffd84d; border: 3px solid var(--ink); border-radius: 14px; box-shadow: 0 4px 0 var(--ink); padding: 6px 12px;
  }
  .code:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  .toast { margin: 0 0 10px; text-align: center; font-weight: 700; color: var(--muted); font-size: 13px; word-break: break-all; }
  .roster { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .pl {
    display: flex; align-items: center; gap: 10px; background: #fff; border: 3px solid var(--ink);
    border-radius: 16px; padding: 9px 14px; font-weight: 700;
  }
  .pl.turn { box-shadow: 0 0 0 3px #ffd84d, 0 4px 0 var(--ink); }
  .pl.p1 { color: var(--p1); }
  .pl.p2 { color: var(--p2); }
  .dot { width: 12px; height: 12px; border-radius: 50%; background: #2fbf71; border: 2px solid var(--ink); flex: none; }
  .dot.off { background: #bbb; }
  .who { flex: 1; }
  .ok { font-size: 12px; background: #2fbf71; color: #fff; border: 2px solid var(--ink); border-radius: 10px; padding: 1px 8px; }
  .score { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .pill {
    min-width: 44px; text-align: center; font-size: 24px; font-weight: 700; background: #fff;
    border: 3px solid var(--ink); border-radius: 14px; box-shadow: 0 4px 0 var(--ink);
  }
  .pill.p1 { color: var(--p1); }
  .pill.p2 { color: var(--p2); }
  .mid { font-size: 12.5px; font-weight: 700; color: var(--muted); text-align: center; }
  .notice { text-align: center; font-weight: 700; margin: 6px 0 12px; }
  .notice.mine { color: #b06a00; }
  .notice.off { color: #b3261e; }
  .cta {
    width: 100%; padding: 14px; font-size: 18px; font-weight: 700; background: #ffd84d;
    border: 3px solid var(--ink); border-radius: 18px; box-shadow: 0 5px 0 var(--ink); margin-bottom: 14px;
  }
  .cta.on { background: #2fbf71; color: #fff; }
  .cta:active { transform: translateY(3px); box-shadow: 0 2px 0 var(--ink); }
  /* Encart de fin de manche : posé dans le flux pour garder le plateau visible. */
  .overlay { display: flex; justify-content: center; padding: 0 0 12px; }
  .card {
    background: #fff; border: 4px solid var(--ink); border-radius: 26px; padding: 18px 22px; text-align: center;
    box-shadow: 0 8px 0 var(--ink); transform: rotate(-1.5deg); animation: pop .3s ease-out; max-width: 380px; width: 100%;
  }
  .trophy { font-size: 52px; }
  h2 { margin: 6px 0 2px; font-size: 26px; -webkit-text-stroke-width: 6px; color: #fff; }
  p { margin: 0 0 16px; color: var(--muted); font-weight: 600; }
  @keyframes pop { from { transform: scale(.75) rotate(-6deg); opacity: 0; } to { transform: rotate(-1.5deg); opacity: 1; } }
</style>
