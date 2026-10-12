import { describe, it, expect } from 'vitest';
import { randomDelay, aiReaction, GO_MIN, GO_MAX } from './duel.js';

describe('duel', () => {
  it('randomDelay reste dans les bornes', () => {
    expect(randomDelay(() => 0)).toBe(GO_MIN);
    expect(randomDelay(() => 1)).toBe(GO_MAX);
    const v = randomDelay(() => 0.5);
    expect(v).toBeGreaterThan(GO_MIN);
    expect(v).toBeLessThan(GO_MAX);
  });
  it("aiReaction est humaine (320 à 620 ms)", () => {
    expect(aiReaction(() => 0)).toBe(320);
    expect(aiReaction(() => 1)).toBe(620);
  });
});
