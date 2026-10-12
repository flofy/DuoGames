// Combien de billes : règles pures (testables)
export const MAX_MARBLES = 5; // on cache de 0 à 5 billes
export const MAX_TRIES = 2; // 2 essais, avec indice « plus / moins » après le premier

// 'ok' si trouvé, sinon 'plus' (il y en a plus) ou 'moins'
export function judge(secret, guess) {
  if (guess === secret) return 'ok';
  return guess < secret ? 'plus' : 'moins';
}

// réduit l'intervalle possible après un indice
export function narrow([lo, hi], guess, hint) {
  return hint === 'plus' ? [Math.max(lo, guess + 1), hi] : [lo, Math.min(hi, guess - 1)];
}

export function aiGuess([lo, hi], rng = Math.random) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function aiHide(rng = Math.random) {
  return Math.floor(rng() * (MAX_MARBLES + 1));
}
