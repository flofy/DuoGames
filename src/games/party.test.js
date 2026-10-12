import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { games } from './index.js';

// Test de fumée : chaque jeu Party se monte et se démonte proprement
describe.each(games.filter((g) => g.party))('$name', (g) => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it.each(['1p', '2p'])('se monte en mode %s', (mode) => {
    vi.useFakeTimers();
    const onpoint = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    const app = mount(g.component, { target, props: { mode, onpoint } });
    flushSync();
    expect(target.querySelector('section.half')).not.toBeNull();
    vi.advanceTimersByTime(500);
    flushSync();
    unmount(app);
    expect(target.querySelector('section.half')).toBeNull();
  });
});
