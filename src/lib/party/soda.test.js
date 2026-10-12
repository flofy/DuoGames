import { describe, it, expect } from 'vitest';
import { makeThreshold, shake, danger, openCan, roundWinner, aiCap } from './soda.js';

describe('soda', () => {
  it('le seuil est entre 50 et 100', () => {
    expect(makeThreshold(() => 0)).toBe(50);
    expect(makeThreshold(() => 0.999)).toBe(100);
  });
  it('shake ajoute 4 à 8', () => {
    expect(shake(10, () => 0)).toBe(14);
    expect(shake(10, () => 1)).toBe(18);
  });
  it('danger monte avec la pression', () => {
    expect(danger(10, 80)).toBe('calm');
    expect(danger(50, 80)).toBe('fizz');
    expect(danger(70, 80)).toBe('danger');
    expect(danger(81, 80)).toBe('boom');
  });
  it('openCan : explosion pire qu\'un jet nul', () => {
    expect(openCan(60, 80)).toEqual({ exploded: false, spray: 60 });
    expect(openCan(90, 80)).toEqual({ exploded: true, spray: -1 });
    expect(roundWinner(0, -1)).toBe(1);
  });
  it('roundWinner gère égalité et victoire', () => {
    expect(roundWinner(50, 50)).toBe(0);
    expect(roundWinner(-1, -1)).toBe(0);
    expect(roundWinner(70, 40)).toBe(1);
    expect(roundWinner(40, 70)).toBe(2);
  });
  it("aiCap reste raisonnable", () => {
    expect(aiCap(() => 0)).toBe(45);
    expect(aiCap(() => 1)).toBe(95);
  });
});
