// Morpion en réseau : règles pures, autoritaires côté serveur.
// `create()` produit un état JSON-sérialisable ; `apply()` le fait évoluer.

export const SIZE = 3;
export const CELLS = SIZE * SIZE;

export const meta = {
  id: 'ttt',
  name: 'Morpion',
  emoji: '❌',
  color: '#ff7a59',
  desc: 'Alignez 3 symboles, chacun sur son appareil',
  target: 3 // premier à 3 manches
};

// 0 = case vide, 1 = J1, 2 = J2
export const create = () => ({ board: Array(CELLS).fill(0), turn: 1, moves: 0 });

export const turn = (state) => state.turn;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const isInt = (v) => Number.isInteger(v);

function alignment(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

// null tant que la manche continue, sinon { winner, line } (winner 0 = égalité)
export function result(state) {
  const line = alignment(state.board);
  if (line) return { winner: state.board[line[0]], line };
  if (state.board.every((c) => c !== 0)) return { winner: 0, line: null };
  return null;
}

// Valide et applique un coup. Renvoie { ok:true, state, last } ou { ok:false, error }.
export function apply(state, move, player) {
  if (!move || typeof move !== 'object' || !isInt(move.cell)) return { ok: false, error: 'ILLEGAL_MOVE' };
  const { cell } = move;
  if (cell < 0 || cell >= CELLS) return { ok: false, error: 'ILLEGAL_MOVE' };
  if (state.board[cell] !== 0) return { ok: false, error: 'ILLEGAL_MOVE' };
  if (state.turn !== player) return { ok: false, error: 'NOT_YOUR_TURN' };

  const board = state.board.slice();
  board[cell] = player;
  return {
    ok: true,
    state: { board, turn: 3 - player, moves: state.moves + 1 },
    last: { player, cell }
  };
}

// Aucune information cachée : la vue est l'état.
export const view = (state) => state;
