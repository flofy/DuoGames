// Dots and Boxes en réseau : grille de 3 × 3 carrés (4 × 4 points).
// Règles pures, autoritaires côté serveur. Un joueur qui ferme un carré rejoue.

export const ROWS = 3;
export const COLS = 3;
export const BOXES = ROWS * COLS;
export const H_COUNT = (ROWS + 1) * COLS; // arêtes horizontales
export const V_COUNT = ROWS * (COLS + 1); // arêtes verticales

export const meta = {
  id: 'dots',
  name: 'Dots and Boxes',
  emoji: '🔲',
  color: '#c77dff',
  desc: 'Reliez les points, fermez un maximum de carrés',
  target: 1 // premier à 1 manche pleine
};

export const create = () => ({
  h: Array(H_COUNT).fill(0),
  v: Array(V_COUNT).fill(0),
  boxes: Array(BOXES).fill(0),
  scores: [0, 0],
  turn: 1,
  moves: 0
});

export const turn = (state) => state.turn;

export const hIndex = (r, c) => r * COLS + c;
export const vIndex = (r, c) => r * (COLS + 1) + c;

const isInt = (v) => Number.isInteger(v);

// Les 4 arêtes qui bordent le carré (r, c).
const boxEdges = (r, c) => [
  ['h', hIndex(r, c)],
  ['h', hIndex(r + 1, c)],
  ['v', vIndex(r, c)],
  ['v', vIndex(r, c + 1)]
];

const edgeAt = (state, t, i) => (t === 'h' ? state.h[i] : state.v[i]);

export function result(state) {
  if (state.boxes.some((b) => b === 0)) return null;
  const [a, b] = state.scores;
  return { winner: a === b ? 0 : a > b ? 1 : 2, line: null };
}

export function apply(state, move, player) {
  if (!move || typeof move !== 'object') return { ok: false, error: 'ILLEGAL_MOVE' };
  const { t, r, c } = move;
  if (t !== 'h' && t !== 'v') return { ok: false, error: 'ILLEGAL_MOVE' };
  if (!isInt(r) || !isInt(c)) return { ok: false, error: 'ILLEGAL_MOVE' };

  // Arêtes horizontales : r ∈ [0, ROWS] et c ∈ [0, COLS[ ; verticales : r ∈ [0, ROWS[ et c ∈ [0, COLS].
  const maxR = t === 'h' ? ROWS : ROWS - 1;
  const maxC = t === 'h' ? COLS - 1 : COLS;
  if (r < 0 || r > maxR || c < 0 || c > maxC) return { ok: false, error: 'ILLEGAL_MOVE' };
  if (state.turn !== player) return { ok: false, error: 'NOT_YOUR_TURN' };

  const index = t === 'h' ? hIndex(r, c) : vIndex(r, c);
  if (edgeAt(state, t, index) !== 0) return { ok: false, error: 'ILLEGAL_MOVE' };

  const h = state.h.slice();
  const v = state.v.slice();
  if (t === 'h') h[index] = player;
  else v[index] = player;

  // Carrés dont la dernière arête vient d'être posée.
  const boxes = state.boxes.slice();
  const scores = state.scores.slice();
  const closed = [];
  for (let br = 0; br < ROWS; br++) {
    for (let bc = 0; bc < COLS; bc++) {
      if (boxes[br * COLS + bc] !== 0) continue;
      const edges = boxEdges(br, bc);
      const complete = edges.every(([type, i]) => (type === 'h' ? h[i] : v[i]) !== 0);
      if (complete) {
        boxes[br * COLS + bc] = player;
        closed.push(br * COLS + bc);
        scores[player - 1]++;
      }
    }
  }

  // Fermer un carré donne un coup supplémentaire.
  const nextTurn = closed.length ? player : 3 - player;
  return {
    ok: true,
    state: { h, v, boxes, scores, turn: nextTurn, moves: state.moves + 1 },
    last: { player, t, r, c, closed }
  };
}

export const view = (state) => state;
