import { describe, it, expect } from 'vitest';
import { judge, narrow, aiGuess, aiHide, MAX_MARBLES } from './marbles.js';

describe('marbles', () => {
  it('judge donne le bon indice', () => {
    expect(judge(3, 3)).toBe('ok');
    expect(judge(3, 1)).toBe('plus');
    expect(judge(3, 5)).toBe('moins');
  });
  it("narrow réduit l'intervalle sans le vider", () => {
    expect(narrow([0, 5], 2, 'plus')).toEqual([3, 5]);
    expect(narrow([0, 5], 4, 'moins')).toEqual([0, 3]);
    expect(narrow([3, 5], 1, 'plus')).toEqual([3, 5]);
  });
  it("l'IA reste dans l'intervalle", () => {
    expect(aiGuess([2, 4], () => 0)).toBe(2);
    expect(aiGuess([2, 4], () => 0.999)).toBe(4);
    expect(aiHide(() => 0)).toBe(0);
    expect(aiHide(() => 0.999)).toBe(MAX_MARBLES);
  });
});
