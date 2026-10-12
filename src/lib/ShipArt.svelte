<svelte:options namespace="svg" />
<script>
  let { id, len } = $props();
  const w = $derived(len * 10);
  const hull = $derived(`M1.2 4.6 H${w - 1} Q${w - 2} 9.4 ${w - 5.5} 9.4 H3.6 Q1.8 8.8 1.2 4.6 Z`);
</script>

<g stroke="#1f1a2e" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round">
  {#if id === 0}
    <path d={hull} fill="#ff595e" />
    <rect x="2" y="3.1" width={w - 5} height="2" rx="0.8" fill="#dfe3ee" />
    {#each Array(5) as _, i}
      <rect x={6 + i * 8} y="3.9" width="4" height="0.5" fill="#fff" stroke="none" />
    {/each}
    <rect x={w * 0.66} y="0.7" width="5" height="2.6" rx="0.8" fill="#fff" />
    <circle cx={w * 0.66 + 2.5} cy="0.7" r="0.9" fill="#ffca3a" stroke-width="0.6" />
    {#each Array(len - 1) as _, i}
      <circle cx={7 + i * 9} cy="7" r="0.9" fill="#fff6c9" stroke-width="0.5" />
    {/each}
  {:else if id === 1}
    <path d={hull} fill="#ffca3a" />
    <rect x="7" y="2.3" width="6" height="2.4" rx="1.2" fill="#9aa4b8" />
    <line x1="13" y1="3.5" x2="18" y2="3.5" stroke-width="1.2" />
    <rect x={w - 14} y="2.3" width="6" height="2.4" rx="1.2" fill="#9aa4b8" />
    <line x1={w - 8} y1="3.5" x2={w - 3} y2="3.5" stroke-width="1.2" />
    <rect x={w / 2 - 4} y="0.9" width="8" height="3.7" rx="1" fill="#fff" />
    <rect x={w / 2 - 2.5} y="1.8" width="5" height="1" fill="#26b5e8" stroke-width="0.4" />
    {#each Array(len - 1) as _, i}
      <circle cx={6 + i * 9} cy="7" r="0.9" fill="#fff6c9" stroke-width="0.5" />
    {/each}
  {:else if id === 2}
    <path d="M2 6 Q2 3.5 5 3.5 H25 Q28 3.5 28 6 Q28 8.7 25 8.7 H5 Q2 8.7 2 6 Z" fill="#8ac926" />
    <rect x="11" y="1.5" width="7" height="2.6" rx="1" fill="#6aa31a" />
    <path d="M16 1.5 V0.4 H18.7" fill="none" />
    {#each [8, 14.5, 21] as cx}
      <circle {cx} cy="6.1" r="1" fill="#fff6c9" stroke-width="0.5" />
    {/each}
    <rect x="0.4" y="4.8" width="1.6" height="2.5" rx="0.6" fill="#ffca3a" />
  {:else if id === 3}
    <path d={hull} fill="#1982c4" />
    <rect x="9" y="1.6" width="8" height="3" rx="1" fill="#fff" />
    <rect x="11" y="2.4" width="4" height="0.9" fill="#26b5e8" stroke-width="0.4" />
    <rect x="19" y="2" width="3.2" height="2.6" rx="0.6" fill="#ff595e" />
    <line x1="13" y1="1.6" x2="13" y2="0.2" />
    <circle cx="5.2" cy="4" r="1.2" fill="#9aa4b8" />
    {#each [8, 14, 20] as cx}
      <circle {cx} cy="7" r="0.9" fill="#fff6c9" stroke-width="0.5" />
    {/each}
  {:else}
    <path d={hull} fill="#ff924c" />
    <rect x="7" y="2" width="6" height="2.8" rx="0.8" fill="#fff" />
    <circle cx="10" cy="3.3" r="0.8" fill="#26b5e8" stroke-width="0.4" />
    <line x1="10" y1="2" x2="10" y2="0.2" />
    <path d="M10 0.2 L13.2 1 L10 1.8 Z" fill="#ff3d7f" />
    <circle cx="15" cy="7" r="0.9" fill="#fff6c9" stroke-width="0.5" />
  {/if}
</g>
