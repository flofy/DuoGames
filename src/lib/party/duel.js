// Duel au far west : délais et réactions (logique pure, testable)
export const GO_MIN = 1500;
export const GO_MAX = 4500;

// délai aléatoire avant le signal « FEU ! » (ms)
export const randomDelay = (rng = Math.random) => Math.round(GO_MIN + rng() * (GO_MAX - GO_MIN));

// temps de réaction de l'IA (ms)
export const aiReaction = (rng = Math.random) => Math.round(320 + rng() * 300);
