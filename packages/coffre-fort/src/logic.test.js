import { describe, it, expect } from 'vitest';
import {
  quatFromEuler, deltaRotation, rotVec, quatFromRotVec, qmul, qconj, qnorm,
  makeChain, mulberry32, axisText, createRun, advance, remainingLen, aiTime, roundWinner, GAIN, REW
} from './logic.js';

const near = (a, b, e = 1e-6) => a.every((x, i) => Math.abs(x - b[i]) < e);
const I = quatFromEuler(0, 0, 0);

describe('rotations de l’appareil', () => {
  it('sépare bascule X, tonneau Y et volant Z', () => {
    expect(near(deltaRotation(I, quatFromEuler(0, 30, 0)), [30, 0, 0])).toBe(true);
    expect(near(deltaRotation(I, quatFromEuler(0, 0, 20)), [0, 20, 0])).toBe(true);
    expect(near(deltaRotation(I, quatFromEuler(40, 0, 0)), [0, 0, 40])).toBe(true);
  });
  it('mesure dans le repère du corps (Y après X)', () => {
    expect(near(deltaRotation(quatFromEuler(0, 50, 0), quatFromEuler(0, 50, 30)), [0, 30, 0])).toBe(true);
  });
  it('supporte les grands angles (> 90°) et q = -q', () => {
    expect(near(deltaRotation(I, quatFromEuler(0, 150, 0)), [150, 0, 0], 1e-4)).toBe(true);
    expect(near(rotVec(qconj(I).map((c) => -c)), [0, 0, 0])).toBe(true);
  });
  it('rotVec et quatFromRotVec sont inverses', () => {
    expect(near(rotVec(quatFromRotVec([10, -20, 30])), [10, -20, 30], 1e-6)).toBe(true);
    expect(quatFromRotVec([0, 0, 0])).toEqual([1, 0, 0, 0]);
  });
  it('composer des petites rotations garde un quaternion unitaire', () => {
    let q = [1, 0, 0, 0];
    for (let i = 0; i < 500; i++) q = qnorm(qmul(q, quatFromRotVec([0.7, -0.4, 1.1])));
    expect(Math.hypot(...q)).toBeCloseTo(1, 9);
  });
});

describe('chaîne', () => {
  it('3 ou 4 tronçons, les 3 axes présents, jamais deux fois de suite le même', () => {
    for (let s = 1; s <= 300; s++) {
      const c = makeChain(mulberry32(s));
      expect([3, 4]).toContain(c.length);
      expect(new Set(c.map((g) => g.axis)).size).toBe(3);
      c.forEach((g, i) => {
        expect(g.len).toBeGreaterThanOrEqual(240);
        expect(g.len).toBeLessThanOrEqual(480);
        expect([1, -1]).toContain(g.dir);
        if (i) expect(g.axis).not.toBe(c[i - 1].axis);
      });
    }
  });
  it('est reproductible avec la même graine', () => {
    expect(makeChain(mulberry32(42))).toEqual(makeChain(mulberry32(42)));
  });
  it('donne une consigne par axe et par sens', () => {
    const t = new Set(['x', 'y', 'z'].flatMap((a) => [1, -1].map((d) => axisText(a, d))));
    expect(t.size).toBe(6);
  });
});

describe('progression', () => {
  const segs = [{ axis: 'x', dir: 1, len: 300 }, { axis: 'y', dir: -1, len: 240 }];
  it('ignore un mauvais axe', () => {
    const r = createRun(segs);
    advance(r, [0, 50, 0]);
    expect(r.prog).toBe(0);
  });
  it('avance dans le bon sens avec le gain', () => {
    const r = createRun(segs);
    advance(r, [10, 0, 0]);
    expect(r.prog).toBe(10 * GAIN);
  });
  it('recule (REW) dans le mauvais sens sans passer sous 0', () => {
    const r = createRun(segs);
    advance(r, [50, 0, 0]);
    const p = r.prog;
    advance(r, [-10, 0, 0]);
    expect(r.prog).toBeCloseTo(p - 10 * GAIN * REW, 6);
    advance(r, [-500, 0, 0]);
    expect(r.prog).toBe(0);
  });
  it('passe au tronçon suivant puis termine', () => {
    const r = createRun(segs);
    expect(advance(r, [200, 0, 0])).toMatchObject({ segmentDone: true, finished: false });
    expect(r.idx).toBe(1);
    expect(remainingLen(r)).toBe(240);
    expect(advance(r, [0, -200, 0])).toMatchObject({ segmentDone: true, finished: true });
    expect(r.done).toBe(true);
    expect(remainingLen(r)).toBe(0);
    expect(advance(r, [0, -50, 0])).toMatchObject({ finished: false });
  });
  it('signale un « clic » tous les 40°', () => {
    const r = createRun(segs);
    expect(advance(r, [5, 0, 0]).clink).toBe(false);
    expect(advance(r, [20, 0, 0]).clink).toBe(true);
  });
});

describe('manche', () => {
  it('le temps de l’IA reste plausible et dépend de la chaîne', () => {
    const segs = [{ axis: 'x', dir: 1, len: 300 }, { axis: 'y', dir: 1, len: 300 }, { axis: 'z', dir: 1, len: 300 }];
    expect(aiTime(segs, () => 0)).toBe(Math.round((900 / 120) * 1000 * 0.75));
    expect(aiTime(segs, () => 1)).toBe(Math.round((900 / 120) * 1000 * 1.25));
  });
  it('le plus rapide gagne, égalité = 0', () => {
    expect(roundWinner(5000, 7000)).toBe(1);
    expect(roundWinner(8000, 7000)).toBe(2);
    expect(roundWinner(6000, 6000)).toBe(0);
  });
});
