// Soda : pression, danger et manche (logique pure, testable)
export const MAX = 100;

// seuil d'explosion caché, propre à chaque canette (50..100)
export const makeThreshold = (rng = Math.random) => 50 + Math.floor(rng() * 51);

// un secouage ajoute 4 à 8 de pression
export const shake = (p, rng = Math.random) => p + 4 + rng() * 4;

// indice visible par les deux joueurs (sans révéler le seuil)
export function danger(p, t) {
  const r = p / t;
  if (r > 1) return 'boom';
  if (r >= 0.8) return 'danger';
  if (r >= 0.5) return 'fizz';
  return 'calm';
}

// ouverture : jet = pression, ou explosion (-1, pire que 0)
export function openCan(p, t) {
  return p > t ? { exploded: true, spray: -1 } : { exploded: false, spray: Math.round(p) };
}

// 0 = égalité, sinon 1 ou 2
export const roundWinner = (a, b) => (a === b ? 0 : a > b ? 1 : 2);

// pression à laquelle l'IA s'arrête, sans connaître le seuil
export const aiCap = (rng = Math.random) => 45 + rng() * 50;
