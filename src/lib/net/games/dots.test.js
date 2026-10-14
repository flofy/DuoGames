import { describe, it, expect } from 'vitest';
import { apply, create, hIndex, result, turn, vIndex, BOXES, H_COUNT, V_COUNT } from './dots.js';

const edge = (state, t, r, c, player) => apply(state, { t, r, c }, player);

describe('dots and boxes en réseau', () => {
  it('démarre sur une grille vide', () => {
    const s = create();
    expect(s.h).toHaveLength(H_COUNT);
    expect(s.v).toHaveLength(V_COUNT);
    expect(s.boxes).toHaveLength(BOXES);
    expect(s.scores).toEqual([0, 0]);
    expect(turn(s)).toBe(1);
  });

  it('passe la main quand aucune case n’est fermée', () => {
    const s = edge(create(), 'h', 0, 0, 1).state;
    expect(s.h[hIndex(0, 0)]).toBe(1);
    expect(turn(s)).toBe(2);
  });

  it('refuse une arête déjà posée, hors grille ou hors tour', () => {
    const s = edge(create(), 'h', 0, 0, 1).state;
    expect(edge(s, 'h', 0, 0, 2).error).toBe('ILLEGAL_MOVE');
    expect(edge(s, 'h', 4, 0, 2).error).toBe('ILLEGAL_MOVE');
    expect(edge(s, 'v', 3, 0, 2).error).toBe('ILLEGAL_MOVE');
    expect(edge(s, 'x', 0, 0, 2).error).toBe('ILLEGAL_MOVE');
    expect(edge(create(), 'h', 0, 0, 2).error).toBe('NOT_YOUR_TURN');
  });

  it('ferme une case, marque le point et rejoue', () => {
    let s = create();
    s = edge(s, 'h', 0, 0, 1).state; // haut du carré (0,0)
    s = edge(s, 'h', 1, 0, 2).state; // bas
    s = edge(s, 'v', 0, 0, 1).state; // gauche
    const res = edge(s, 'v', 0, 1, 2); // droite : la case se ferme
    expect(res.ok).toBe(true);
    expect(res.last.closed).toEqual([0]);
    expect(res.state.boxes[0]).toBe(2);
    expect(res.state.scores).toEqual([0, 1]);
    expect(turn(res.state)).toBe(2); // le joueur qui ferme rejoue
  });

  it('ne termine que quand toutes les cases sont fermées', () => {
    let s = create();
    // On ferme tout le plateau, une arête à la fois, en suivant le tour courant.
    for (let r = 0; r <= 3; r++) for (let c = 0; c < 3; c++) s = edge(s, 'h', r, c, turn(s)).state;
    for (let r = 0; r < 3; r++) for (let c = 0; c <= 3; c++) s = edge(s, 'v', r, c, turn(s)).state;
    expect(s.boxes.every((b) => b !== 0)).toBe(true);
    expect(vIndex(0, 3)).toBe(3);
    const over = result(s);
    expect(over).not.toBeNull();
    const total = s.scores[0] + s.scores[1];
    expect(total).toBe(BOXES);
    expect(over.winner).toBe(s.scores[0] === s.scores[1] ? 0 : s.scores[0] > s.scores[1] ? 1 : 2);
  });

  it('renvoie null tant que la grille n’est pas pleine', () => {
    expect(result(create())).toBeNull();
  });
});
