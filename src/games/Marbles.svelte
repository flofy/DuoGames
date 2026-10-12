<script>
  import { onMount } from 'svelte';
  import { sfx } from '../lib/sfx.svelte.js';
  import Half from '../lib/Half.svelte';
  import { judge, narrow, aiGuess, aiHide, MAX_MARBLES, MAX_TRIES } from '../lib/party/marbles.js';

  let { mode, onpoint } = $props();

  let hider = $state(1);
  let phase = $state('hide'); // hide | guess | reveal
  let secret = $state(0);
  let pick = $state(null);
  let range = $state([0, MAX_MARBLES]);
  let tries = $state(0);
  let hint = $state('');
  let result = $state('');
  const guesser = $derived(3 - hider);
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const isAI = (p) => mode === '1p' && p === 2;
  const name = (p) => (isAI(p) ? "L'IA" : `J${p}`);

  function startRound() {
    phase = 'hide';
    pick = null;
    range = [0, MAX_MARBLES];
    tries = 0;
    hint = '';
    result = '';
    if (isAI(hider)) later(() => hide(aiHide()), 800);
  }

  function hide(n) {
    if (phase !== 'hide' || n === null) return;
    secret = n;
    phase = 'guess';
    sfx('pop');
    if (isAI(guesser)) later(aiTurn, 900);
  }

  const aiTurn = () => guess(aiGuess(range));

  function guess(n) {
    if (phase !== 'guess') return;
    tries++;
    const j = judge(secret, n);
    if (j === 'ok') return reveal(guesser, `${name(guesser)} trouve : ${secret} !`);
    if (tries >= MAX_TRIES) return reveal(hider, `Raté ! Il y en avait ${secret}`);
    range = narrow(range, n, j);
    hint = j === 'plus' ? 'Plus !' : 'Moins !';
    sfx('bump');
    if (isAI(guesser)) later(aiTurn, 900);
  }

  function reveal(winner, text) {
    phase = 'reveal';
    result = text;
    sfx(winner === guesser ? 'point' : 'hit');
    onpoint(winner);
    later(() => {
      hider = 3 - hider;
      startRound();
    }, 2200);
  }

  function waitText(p) {
    if (p === hider) return phase === 'hide' ? `${name(p)} cache ses billes…` : 'On devine…';
    return phase === 'hide' ? 'Il cache ses billes…' : `${name(p)} réfléchit…`;
  }

  onMount(() => {
    startRound();
    return () => timers.forEach(clearTimeout);
  });
</script>

{#snippet pad(onpick, selected, allowed)}
  <div class="pad">
    {#each Array(MAX_MARBLES + 1) as _, n}
      <button class:sel={selected === n} disabled={!allowed(n)} onclick={() => onpick(n)}>{n}</button>
    {/each}
  </div>
{/snippet}

{#snippet side(p)}
  {#if phase === 'reveal'}
    <div class="big">{secret ? '🔵'.repeat(secret) : '🫳'}</div>
    <p class="msg">{result}</p>
  {:else if p === hider && phase === 'hide' && !isAI(p)}
    <p class="msg">Cache tes billes</p>
    <div class="fist">{pick === null ? '✊' : `✊ ${pick}`}</div>
    {@render pad((n) => { pick = n; sfx('tap'); }, pick, () => true)}
    <button class="ok" disabled={pick === null} onclick={() => hide(pick)}>Cacher</button>
  {:else if p === guesser && phase === 'guess' && !isAI(p)}
    <p class="msg">Combien de billes ?</p>
    <p class="hint">{hint || `Essai ${tries + 1}/${MAX_TRIES}`}</p>
    {@render pad(guess, null, (n) => n >= range[0] && n <= range[1])}
  {:else}
    <div class="big">{p === hider ? '✊' : '🤔'}</div>
    <p class="msg">{waitText(p)}</p>
  {/if}
{/snippet}

<div class="field">
  <Half p={2} {mode}>{@render side(2)}</Half>
  <Half p={1} {mode}>{@render side(1)}</Half>
</div>

<style>
  .field { width: min(100cqw, 520px); height: 100%; display: flex; flex-direction: column; gap: 14px; padding: 0 8px 12px; }
  .big { font-size: clamp(36px, 10cqh, 70px); line-height: 1.1; }
  .fist { font-size: clamp(22px, 5cqh, 34px); font-weight: 700; }
  .msg { margin: 0; font-size: clamp(18px, 4cqh, 26px); font-weight: 700; color: #fff; -webkit-text-stroke: 5px var(--ink); paint-order: stroke fill; }
  .hint { margin: 0; font-weight: 700; color: var(--fg); }
  .pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: min(260px, 100%); }
  .pad button, .ok {
    padding: 8px 0; font-size: clamp(18px, 4.5cqh, 28px); font-weight: 700; background: #fff; border: 3px solid var(--ink);
    border-radius: 14px; box-shadow: 0 4px 0 var(--ink);
  }
  .pad button:active:not(:disabled), .ok:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
  .pad button:disabled, .ok:disabled { opacity: 0.35; box-shadow: none; }
  .pad .sel { background: #ffe14d; }
  .ok { padding: 8px 28px; background: #ffd84d; font-size: 18px; }
</style>
