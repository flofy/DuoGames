// Logique pure du Coffre-fort 3D : aucune dépendance au DOM ni à three.js (testable seule).

export const DEG = Math.PI / 180;
export const AXES = ['x', 'y', 'z'];
export const AXIS_INDEX = { x: 0, y: 1, z: 2 };
export const AXIS_NAME = { x: 'Bascule', y: 'Tonneau', z: 'Volant' };
export const GAIN = 2; // 1° de rotation du téléphone = 2° de chaîne défaite
export const REW = 0.7; // facteur de recul quand on tourne dans le mauvais sens
export const CLINK_EVERY = 40; // un « clic » sonore tous les 40° de chaîne

// ---------- Quaternions [w, x, y, z] ----------
export const qmul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]
];
export const qconj = (q) => [q[0], -q[1], -q[2], -q[3]];
export const qnorm = (q) => {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return q.map((c) => c / n);
};
const qx = (d) => [Math.cos((d * DEG) / 2), Math.sin((d * DEG) / 2), 0, 0];
const qy = (d) => [Math.cos((d * DEG) / 2), 0, Math.sin((d * DEG) / 2), 0];
const qz = (d) => [Math.cos((d * DEG) / 2), 0, 0, Math.sin((d * DEG) / 2)];

// deviceorientation (alpha, beta, gamma) -> quaternion appareil -> monde (ordre Z-X'-Y'' du W3C)
export const quatFromEuler = (alpha, beta, gamma) => qmul(qmul(qz(alpha), qx(beta)), qy(gamma));

// quaternion -> rotation en degrés autour des axes X, Y, Z de l'appareil
export function rotVec(q) {
  if (q[0] < 0) q = q.map((c) => -c); // q et -q = même rotation
  const s = Math.hypot(q[1], q[2], q[3]);
  if (s < 1e-9) return [0, 0, 0];
  const k = (2 * Math.atan2(s, q[0])) / s / DEG;
  return [q[1] * k, q[2] * k, q[3] * k];
}

export function quatFromRotVec(v) {
  const n = Math.hypot(v[0], v[1], v[2]);
  if (n < 1e-9) return [1, 0, 0, 0];
  const h = (n * DEG) / 2;
  const s = Math.sin(h) / n;
  return [Math.cos(h), v[0] * s, v[1] * s, v[2] * s];
}

// rotation du corps entre deux orientations successives (repère de l'appareil)
export const deltaRotation = (qPrev, qNow) => rotVec(qmul(qconj(qPrev), qNow));

// ---------- Aléatoire & chaîne ----------
export function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 3 ou 4 tronçons : les 3 axes servent toujours, jamais deux fois de suite le même
export function makeChain(rng) {
  const order = AXES.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (rng() < 0.5) {
    const c = order.filter((a) => a !== order[order.length - 1]);
    order.push(c[Math.floor(rng() * c.length)]);
  }
  return order.map((axis) => ({ axis, dir: rng() < 0.5 ? 1 : -1, len: 240 + Math.floor(rng() * 241) }));
}

// consigne lisible (règle de la main droite, repère de l'écran : X droite, Y haut, Z vers soi)
export function axisText(axis, dir) {
  if (axis === 'x') return dir > 0 ? 'Bascule : le haut vient vers toi' : 'Bascule : le haut s’éloigne de toi';
  if (axis === 'y') return dir > 0 ? 'Tonneau : l’écran tourne vers la droite' : 'Tonneau : l’écran tourne vers la gauche';
  return dir > 0 ? 'Volant : tourne vers la gauche ↺' : 'Volant : tourne vers la droite ↻';
}

// ---------- Progression d'un tour de jeu ----------
export const createRun = (segs) => ({ segs, idx: 0, prog: 0, done: false });

export const remainingLen = (run) => (run.done ? 0 : run.segs[run.idx].len - run.prog);

// applique une rotation v = [°X, °Y, °Z] ; seul l'axe du tronçon actif compte
export function advance(run, v) {
  const out = { clink: false, segmentDone: false, finished: false };
  if (run.done) return out;
  const seg = run.segs[run.idx];
  const inc = GAIN * seg.dir * v[AXIS_INDEX[seg.axis]];
  if (Math.abs(inc) > 0.001) {
    if (inc > 0) {
      const before = run.prog;
      run.prog += inc;
      out.clink = Math.floor(run.prog / CLINK_EVERY) !== Math.floor(before / CLINK_EVERY);
    } else run.prog = Math.max(0, run.prog + inc * REW);
  }
  if (run.prog >= seg.len) {
    run.idx++;
    run.prog = 0;
    out.segmentDone = true;
    if (run.idx >= run.segs.length) {
      run.done = true;
      out.finished = true;
    }
  }
  return out;
}

// ---------- IA & manche ----------
// temps (ms) de l'IA : ~60°/s de rotation efficace, ±25 %
export function aiTime(segs, rng = Math.random) {
  const total = segs.reduce((a, s) => a + s.len, 0);
  return Math.round((total / (GAIN * 60)) * 1000 * (0.75 + rng() * 0.5));
}

// 1 ou 2 = temps le plus court, 0 = égalité
export const roundWinner = (a, b) => (a === b ? 0 : a < b ? 1 : 2);
