import { describe, it, expect } from 'vitest';
import { norm, diff, wrapDelta, heat, level, inZone, randomTarget, TOLERANCE, SEGMENTS } from './safe.js';

describe('safe', () => {
  it('norm ramène dans 0..360', () => {
    expect(norm(370)).toBe(10);
    expect(norm(-10)).toBe(350);
    expect(norm(360)).toBe(0);
  });
  it('diff prend le chemin le plus court', () => {
    expect(diff(10, 350)).toBe(20);
    expect(diff(0, 180)).toBe(180);
    expect(diff(90, 90)).toBe(0);
  });
  it('wrapDelta évite les sauts à 360°', () => {
    expect(wrapDelta(190)).toBe(-170);
    expect(wrapDelta(-190)).toBe(170);
    expect(wrapDelta(0)).toBe(0);
    expect(wrapDelta(25)).toBe(25);
  });
  it('heat et level grimpent en approchant du code', () => {
    expect(heat(0)).toBe(1);
    expect(heat(200)).toBe(0);
    expect(level(0)).toBe(SEGMENTS);
    expect(level(150)).toBe(0);
    expect(level(20)).toBeGreaterThan(level(80));
  });
  it('inZone respecte la tolérance', () => {
    expect(inZone(100, 100 + TOLERANCE)).toBe(true);
    expect(inZone(100, 100 + TOLERANCE + 1)).toBe(false);
    expect(inZone(359, 3)).toBe(true);
  });
  it('randomTarget est loin du départ', () => {
    for (const r of [0, 0.3, 0.999]) {
      expect(diff(40, randomTarget(40, () => r))).toBeGreaterThanOrEqual(60);
    }
  });
});
