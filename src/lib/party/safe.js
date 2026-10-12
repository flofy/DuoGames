// Coffre-fort : maths de la molette (angles en degrés, testables)
export const TOLERANCE = 7; // ± degrés pour être « dans la zone »
export const HOLD = 0.7; // secondes à tenir dans la zone pour ouvrir
export const SEGMENTS = 6; // segments de la jauge de chaleur

export const norm = (a) => ((a % 360) + 360) % 360;

// écart angulaire le plus court (0 à 180)
export function diff(a, b) {
  const d = Math.abs(norm(a) - norm(b));
  return d > 180 ? 360 - d : d;
}

// ramène une variation d'angle dans ]-180, 180]
export const wrapDelta = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

// 1 = pile sur le code, 0 = loin (≥ 110°)
export const heat = (d) => Math.max(0, 1 - d / 110);

export const level = (d, steps = SEGMENTS) => Math.round(heat(d) * steps);

export const inZone = (angle, target) => diff(angle, target) <= TOLERANCE;

// code secret à au moins 60° de la position de départ
export const randomTarget = (from = 0, rng = Math.random) => norm(from + 60 + rng() * 240);
