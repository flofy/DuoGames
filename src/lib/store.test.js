import { describe, it, expect } from 'vitest';
import { stats } from './store.svelte.js';

describe('stats store', () => {
  it('starts at 0 and adds points to the right player', () => {
    expect(stats.p1).toBe(0);
    expect(stats.p2).toBe(0);

    stats.add(1); // 1 point pour le joueur 1
    expect(stats.p1).toBe(1);
    expect(stats.p2).toBe(0);

    stats.add(2); // 1 point pour le joueur 2
    expect(stats.p1).toBe(1);
    expect(stats.p2).toBe(1);

    stats.add(1); // 1 point supplémentaire pour le joueur 1
    stats.add(1); // 1 point supplémentaire pour le joueur 1
    expect(stats.p1).toBe(3);
    expect(stats.p2).toBe(1);
  });

  it('resets scores', () => {
    stats.add(1);
    stats.add(2);
    stats.reset();

    expect(stats.p1).toBe(0);
    expect(stats.p2).toBe(0);
  });
});

