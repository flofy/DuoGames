import { describe, it, expect } from 'vitest';
import { apply, create, result, turn, view, CELLS } from './tictactoe.js';

const play = (state, cell, player) => apply(state, { cell }, player);

describe('morpion en réseau', () => {
  it('démarre avec un plateau vide et J1 qui commence', () => {
    const s = create();
    expect(s.board).toHaveLength(CELLS);
    expect(s.board.every((c) => c === 0)).toBe(true);
    expect(turn(s)).toBe(1);
  });

  it('alterne les tours', () => {
    let s = create();
    s = play(s, 0, 1).state;
    expect(s.board[0]).toBe(1);
    expect(turn(s)).toBe(2);
    s = play(s, 4, 2).state;
    expect(s.board[4]).toBe(2);
    expect(turn(s)).toBe(1);
  });

  it('refuse un coup hors tour, hors plateau ou sur une case prise', () => {
    const s = create();
    expect(play(s, 0, 2)).toEqual({ ok: false, error: 'NOT_YOUR_TURN' });
    expect(play(s, 9, 1).error).toBe('ILLEGAL_MOVE');
    expect(play(s, -1, 1).error).toBe('ILLEGAL_MOVE');
    expect(play(s, 'x', 1).error).toBe('ILLEGAL_MOVE');
    expect(apply(s, null, 1).error).toBe('ILLEGAL_MOVE');

    const taken = play(s, 0, 1).state;
    expect(play(taken, 0, 2).error).toBe('ILLEGAL_MOVE');
  });

  it('détecte une victoire et l’égalité', () => {
    let s = create();
    for (const [cell, player] of [[0, 1], [3, 2], [1, 1], [4, 2], [2, 1]]) s = play(s, cell, player).state;
    const over = result(s);
    expect(over.winner).toBe(1);
    expect(over.line).toEqual([0, 1, 2]);

    // Plateau plein sans alignement
    let d = create();
    for (const [cell, player] of [[0, 1], [1, 2], [2, 1], [4, 2], [3, 1], [5, 2], [7, 1], [6, 2], [8, 1]]) {
      d = play(d, cell, player).state;
    }
    expect(result(d)).toEqual({ winner: 0, line: null });
  });

  it('ne renvoie rien tant que la manche continue', () => {
    expect(result(create())).toBeNull();
  });

  it('expose une vue publique identique à l’état', () => {
    const s = create();
    expect(view(s, 1)).toBe(s);
  });

  it('renvoie l’auteur et la case du dernier coup', () => {
    const res = play(create(), 4, 1);
    expect(res.last).toEqual({ player: 1, cell: 4 });
  });
});
