// Flobopuyo : grille, pièces, chaînes, déchets et IA (logique pure, testable)
export const COLS = 6;
export const ROWS = 12;
export const COLORS = 4; // couleurs 1..4
export const GARBAGE = 5; // bloc « déchet » gris
export const SPAWN_X = 2;
export const SCORE_PER_GARBAGE = 70;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const makeGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
export const cloneGrid = (g) => g.map((r) => r.slice());

export const randomPair = (rng = Math.random) => [
  1 + Math.floor(rng() * COLORS),
  1 + Math.floor(rng() * COLORS)
];

// pièce : pivot (x, y), satellite autour du pivot selon rot (0 haut, 1 droite, 2 bas, 3 gauche)
export const spawn = (pair) => ({ x: SPAWN_X, y: 1, rot: 0, a: pair[0], b: pair[1] });

const OFFSET = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const satellite = (p) => [p.x + OFFSET[p.rot][0], p.y + OFFSET[p.rot][1]];

// au-dessus de la grille (y < 0) c'est libre : la pièce y apparaît
const isFree = (g, x, y) => x >= 0 && x < COLS && y < ROWS && (y < 0 || g[y][x] === 0);

export function canPlace(g, p) {
  const [sx, sy] = satellite(p);
  return isFree(g, p.x, p.y) && isFree(g, sx, sy);
}

export function shift(g, p, dx) {
  const q = { ...p, x: p.x + dx };
  return canPlace(g, q) ? q : p;
}

// rotation avec décalage (wall kick) contre un mur, une pile ou le sol
export function rotate(g, p, dir = 1) {
  const rot = (p.rot + dir + 4) % 4;
  const [ox, oy] = OFFSET[rot];
  const tries = [{ x: p.x, y: p.y }];
  if (ox) tries.push({ x: p.x - ox, y: p.y });
  if (oy === 1) tries.push({ x: p.x, y: p.y - 1 });
  for (const t of tries) {
    const q = { ...p, ...t, rot };
    if (canPlace(g, q)) return q;
  }
  return p;
}

// descend d'une ligne, ou null si la pièce est posée
export function fall(g, p) {
  const q = { ...p, y: p.y + 1 };
  return canPlace(g, q) ? q : null;
}

// pose la pièce ; false si une partie dépasse au-dessus de la grille
export function lock(g, p) {
  const [sx, sy] = satellite(p);
  let ok = true;
  for (const [x, y, c] of [[p.x, p.y, p.a], [sx, sy, p.b]]) {
    if (y < 0) ok = false;
    else g[y][x] = c;
  }
  return ok;
}

// chaque blob tombe tant qu'il le peut ; true si quelque chose a bougé
export function gravity(g) {
  let moved = false;
  for (let x = 0; x < COLS; x++) {
    let w = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (!g[y][x]) continue;
      if (y !== w) {
        g[w][x] = g[y][x];
        g[y][x] = 0;
        moved = true;
      }
      w--;
    }
  }
  return moved;
}

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// groupes de 4 blobs ou plus de même couleur (les déchets ne font jamais de groupe)
export function findGroups(g) {
  const seen = new Set();
  const groups = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = g[y][x];
      if (!c || c === GARBAGE || seen.has(y * COLS + x)) continue;
      const cells = [];
      const stack = [[x, y]];
      seen.add(y * COLS + x);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        cells.push([cx, cy]);
        for (const [dx, dy] of NEIGHBORS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          if (g[ny][nx] !== c || seen.has(ny * COLS + nx)) continue;
          seen.add(ny * COLS + nx);
          stack.push([nx, ny]);
        }
      }
      if (cells.length >= 4) groups.push({ color: c, cells });
    }
  }
  return groups;
}

// efface les groupes et les déchets collés à l'un d'eux ; renvoie le nombre de déchets effacés
export function clearGroups(g, groups) {
  let garbage = 0;
  for (const { cells } of groups) {
    for (const [x, y] of cells) g[y][x] = 0;
  }
  for (const { cells } of groups) {
    for (const [x, y] of cells) {
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        if (g[ny][nx] === GARBAGE) {
          g[ny][nx] = 0;
          garbage++;
        }
      }
    }
  }
  return garbage;
}

const CHAIN_POWER = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512];
const COLOR_BONUS = [0, 3, 6, 12, 24]; // selon le nombre de couleurs effacées en même temps
const groupBonus = (n) => (n >= 11 ? 10 : [0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7][n]);

// score d'un pas de chaîne (chain = 1 pour le premier)
export function chainScore(chain, groups) {
  const n = groups.reduce((s, gr) => s + gr.cells.length, 0);
  const colors = new Set(groups.map((gr) => gr.color)).size;
  const gb = groups.reduce((s, gr) => s + groupBonus(gr.cells.length), 0);
  const power = CHAIN_POWER[Math.min(chain - 1, CHAIN_POWER.length - 1)];
  const mult = clamp(power + COLOR_BONUS[Math.min(colors, COLOR_BONUS.length) - 1] + gb, 1, 999);
  return 10 * n * mult;
}

// fait tomber n déchets : des lignes entières puis le reste sur des colonnes au hasard
export function dropGarbage(g, n, rng = Math.random) {
  const per = Array(COLS).fill(Math.floor(n / COLS));
  const cols = [...Array(COLS).keys()];
  for (let i = cols.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cols[i], cols[j]] = [cols[j], cols[i]];
  }
  for (let i = 0; i < n % COLS; i++) per[cols[i]]++;
  for (let x = 0; x < COLS; x++) {
    let top = 0;
    while (top < ROWS && !g[top][x]) top++;
    for (let k = 0; k < per[x]; k++) {
      const y = top - 1 - k;
      if (y >= 0) g[y][x] = GARBAGE;
    }
  }
}

// la colonne d'apparition est bouchée : c'est perdu
export const spawnBlocked = (g) => g[0][SPAWN_X] !== 0 || g[1][SPAWN_X] !== 0;

// résout toutes les chaînes d'un coup (sans animation) : sert à l'IA et aux tests
export function settle(g) {
  let chain = 0;
  let cleared = 0;
  let score = 0;
  gravity(g);
  for (;;) {
    const groups = findGroups(g);
    if (!groups.length) break;
    chain++;
    cleared += groups.reduce((s, gr) => s + gr.cells.length, 0);
    score += chainScore(chain, groups);
    clearGroups(g, groups);
    gravity(g);
  }
  return { chain, cleared, score };
}

const heightOf = (g, x) => {
  let y = 0;
  while (y < ROWS && !g[y][x]) y++;
  return ROWS - y;
};

// toutes les positions d'atterrissage possibles, de la meilleure à la pire
export function bestPlacements(g, pair, rng = Math.random) {
  const out = [];
  for (let rot = 0; rot < 4; rot++) {
    for (let x = 0; x < COLS; x++) {
      let p = { x, y: 1, rot, a: pair[0], b: pair[1] };
      if (!canPlace(g, p)) continue;
      for (let n = fall(g, p); n; n = fall(g, p)) p = n;
      const sim = cloneGrid(g);
      if (!lock(sim, p)) continue;
      const r = settle(sim);
      let adj = 0;
      for (let y = 0; y < ROWS; y++) {
        for (let cx = 0; cx < COLS; cx++) {
          const c = sim[y][cx];
          if (!c || c === GARBAGE) continue;
          if (cx + 1 < COLS && sim[y][cx + 1] === c) adj++;
          if (y + 1 < ROWS && sim[y + 1][cx] === c) adj++;
        }
      }
      let maxH = 0;
      for (let cx = 0; cx < COLS; cx++) maxH = Math.max(maxH, heightOf(sim, cx));
      const score =
        r.chain * 150 + r.cleared * 6 + adj * 4 - maxH * 5 - (spawnBlocked(sim) ? 100000 : 0) + rng() * 3;
      out.push({ x, rot, score });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}
