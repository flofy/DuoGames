import { describe, it, expect } from 'vitest';
import {
  COLS, ROWS, GARBAGE, makeGrid, cloneGrid, randomPair, spawn, satellite, canPlace, shift, rotate,
  fall, lock, gravity, findGroups, clearGroups, chainScore, dropGarbage, spawnBlocked, settle, bestPlacements
} from './puyo.js';

const grid = (rows) => {
  // rows : tableau de chaînes, de bas en haut, ex. ['1122', '3']
  const g = makeGrid();
  rows.forEach((r, i) => [...r].forEach((c, x) => { g[ROWS - 1 - i][x] = c === '.' ? 0 : Number(c); }));
  return g;
};

describe('puyo : pièces', () => {
  it('randomPair reste dans 1..4', () => {
    expect(randomPair(() => 0)).toEqual([1, 1]);
    expect(randomPair(() => 0.999)).toEqual([4, 4]);
  });
  it('le satellite suit la rotation', () => {
    const p = { x: 2, y: 5, rot: 0 };
    expect(satellite(p)).toEqual([2, 4]);
    expect(satellite({ ...p, rot: 1 })).toEqual([3, 5]);
    expect(satellite({ ...p, rot: 2 })).toEqual([2, 6]);
    expect(satellite({ ...p, rot: 3 })).toEqual([1, 5]);
  });
  it('shift est bloqué par les murs et les blobs', () => {
    const g = makeGrid();
    let p = { x: 0, y: 5, rot: 0, a: 1, b: 2 };
    expect(shift(g, p, -1)).toBe(p);
    g[5][1] = 3;
    expect(shift(g, p, 1)).toBe(p);
    p = { x: 4, y: 5, rot: 1, a: 1, b: 2 }; // satellite en x = 5
    expect(shift(g, p, 1)).toBe(p);
  });
  it('rotate décale la pièce contre un mur', () => {
    const g = makeGrid();
    const p = { x: 5, y: 5, rot: 0, a: 1, b: 2 };
    const q = rotate(g, p, 1); // satellite à droite impossible → pivot décalé à gauche
    expect(q.rot).toBe(1);
    expect(q.x).toBe(4);
  });
  it('rotate remonte la pièce au sol', () => {
    const g = makeGrid();
    const p = { x: 2, y: ROWS - 1, rot: 1, a: 1, b: 2 };
    const q = rotate(g, p, 1); // satellite en dessous du sol impossible → pivot remonté
    expect(q.rot).toBe(2);
    expect(q.y).toBe(ROWS - 2);
    expect(canPlace(g, q)).toBe(true);
  });
  it('fall descend puis renvoie null au sol, lock pose les deux blobs', () => {
    const g = makeGrid();
    let p = spawn([1, 2]);
    let n;
    while ((n = fall(g, p))) p = n;
    expect(p.y).toBe(ROWS - 1);
    expect(lock(g, p)).toBe(true);
    expect(g[ROWS - 1][2]).toBe(1);
    expect(g[ROWS - 2][2]).toBe(2);
  });
  it('lock signale une pièce qui dépasse en haut', () => {
    const g = makeGrid();
    expect(lock(g, { x: 2, y: 0, rot: 0, a: 1, b: 2 })).toBe(false);
    expect(g[0][2]).toBe(1);
  });
});

describe('puyo : gravité, groupes, chaînes', () => {
  it('gravity fait tomber les blobs flottants', () => {
    const g = makeGrid();
    g[3][1] = 2;
    g[5][1] = 3;
    expect(gravity(g)).toBe(true);
    expect(g[ROWS - 1][1]).toBe(3);
    expect(g[ROWS - 2][1]).toBe(2);
    expect(gravity(g)).toBe(false);
  });
  it('findGroups : 4 reliés oui, 3 non, diagonale non, déchets jamais', () => {
    expect(findGroups(grid(['111.'])).length).toBe(0);
    expect(findGroups(grid(['1111'])).length).toBe(1);
    expect(findGroups(grid(['11', '11']))[0].cells.length).toBe(4);
    expect(findGroups(grid(['1.', '.1', '1.', '.1'])).length).toBe(0);
    expect(findGroups(grid(['5555'])).length).toBe(0);
  });
  it('clearGroups efface les déchets collés au groupe, pas les autres', () => {
    // bas → haut : déchets en colonne 1 et 5, groupe de 4 au-dessus, déchet posé sur la colonne 2
    const g = grid(['.5...5', '1111', '..5']);
    expect(clearGroups(g, findGroups(g))).toBe(2);
    expect(g[ROWS - 1][1]).toBe(0); // sous le groupe
    expect(g[ROWS - 3][2]).toBe(0); // sur le groupe
    expect(g[ROWS - 1][5]).toBe(GARBAGE); // loin du groupe : intact
  });
  it('un déchet collé à un groupe disparaît', () => {
    const g = grid(['1111', '5']);
    expect(clearGroups(g, findGroups(g))).toBe(1);
    expect(g[ROWS - 2][0]).toBe(0);
  });
  it('settle enchaîne les chaînes', () => {
    // les 2 s'effacent, le 1 du dessus retombe et complète un groupe de 1
    const g = makeGrid();
    g[ROWS - 1] = [1, 1, 1, 3, 0, 0];
    g[ROWS - 2] = [2, 2, 2, 2, 0, 0];
    g[ROWS - 3] = [1, 0, 0, 0, 0, 0];
    const r = settle(g);
    expect(r.chain).toBe(2);
    expect(r.cleared).toBe(8);
    expect(g.flat().filter(Boolean)).toEqual([3]);
  });
  it('chainScore croît avec la chaîne', () => {
    const grp = [{ color: 1, cells: [[0, 0], [1, 0], [2, 0], [3, 0]] }];
    expect(chainScore(1, grp)).toBe(40); // 10 × 4 × max(1, 0)
    expect(chainScore(2, grp)).toBe(320); // 10 × 4 × 8
    expect(chainScore(3, grp)).toBe(640);
    expect(chainScore(99, grp)).toBe(10 * 4 * 512);
  });
  it('chainScore ajoute bonus de groupe et de couleurs', () => {
    const big = [{ color: 1, cells: Array(6).fill([0, 0]) }];
    expect(chainScore(1, big)).toBe(10 * 6 * 3);
    const two = [
      { color: 1, cells: Array(4).fill([0, 0]) },
      { color: 2, cells: Array(4).fill([0, 0]) }
    ];
    expect(chainScore(1, two)).toBe(10 * 8 * 3);
  });
});

describe('puyo : déchets et fin de partie', () => {
  it('dropGarbage place exactement n déchets, des lignes puis le reste', () => {
    const g = makeGrid();
    dropGarbage(g, 8);
    expect(g.flat().filter((c) => c === GARBAGE).length).toBe(8);
    for (let x = 0; x < COLS; x++) expect(g[ROWS - 1][x]).toBe(GARBAGE);
  });
  it('dropGarbage retombe sur la pile existante', () => {
    const g = makeGrid();
    g[ROWS - 1][0] = 1;
    dropGarbage(g, 6);
    expect(g[ROWS - 2][0]).toBe(GARBAGE);
    expect(g[ROWS - 1][0]).toBe(1);
    expect(g.flat().filter((c) => c === GARBAGE).length).toBe(6);
  });
  it('dropGarbage ignore ce qui dépasse en haut', () => {
    const g = makeGrid();
    dropGarbage(g, 6 * (ROWS + 2));
    expect(g.flat().filter((c) => c === GARBAGE).length).toBe(6 * ROWS);
  });
  it('spawnBlocked quand la colonne 3 est bouchée', () => {
    const g = makeGrid();
    expect(spawnBlocked(g)).toBe(false);
    g[1][2] = 1;
    expect(spawnBlocked(g)).toBe(true);
  });
});

describe('puyo : IA', () => {
  it('bestPlacements propose des positions valides, triées', () => {
    const g = makeGrid();
    const c = bestPlacements(g, [1, 2], () => 0);
    expect(c.length).toBeGreaterThan(0);
    for (let i = 1; i < c.length; i++) expect(c[i - 1].score).toBeGreaterThanOrEqual(c[i].score);
    for (const { x, rot } of c) {
      expect(canPlace(g, { x, y: 1, rot, a: 1, b: 2 })).toBe(true);
    }
  });
  it('l\'IA complète un groupe quand elle le peut', () => {
    const g = makeGrid();
    g[ROWS - 1][0] = 1;
    g[ROWS - 1][1] = 1;
    g[ROWS - 2][0] = 1;
    const before = cloneGrid(g);
    const [best] = bestPlacements(g, [1, 3], () => 0);
    const sim = cloneGrid(g);
    let p = { x: best.x, y: 1, rot: best.rot, a: 1, b: 3 };
    for (let n = fall(sim, p); n; n = fall(sim, p)) p = n;
    lock(sim, p);
    expect(settle(sim).chain).toBeGreaterThanOrEqual(1);
    expect(g).toEqual(before); // la grille d'origine n'est jamais modifiée
  });
});
