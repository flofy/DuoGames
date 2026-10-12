import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FarWest from './FarWest.svelte';

function setup(mode = '2p') {
  vi.useFakeTimers();
  const onpoint = vi.fn();
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(FarWest, { target, props: { mode, onpoint } });
  flushSync();
  const draw = (p) => target.querySelectorAll('button.draw')[p === 2 ? 0 : 1];
  const shoot = (p) => { draw(p).dispatchEvent(new Event('pointerdown', { bubbles: true })); flushSync(); };
  const wait = (ms) => { vi.advanceTimersByTime(ms); flushSync(); };
  return { app, target, onpoint, shoot, wait };
}

describe('Duel au far west', () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

  it("donne le point à l'adversaire si on tire trop tôt", () => {
    const { app, onpoint, shoot, wait } = setup();
    wait(1000); // « Prêts ? » terminé, phase d'attente
    shoot(1);
    expect(onpoint).toHaveBeenCalledWith(2);
    unmount(app);
  });

  it('donne le point au premier qui tire après le signal', () => {
    const { app, onpoint, shoot, wait } = setup();
    wait(1000 + 4600); // délai maximal dépassé : « FEU ! »
    shoot(2);
    shoot(1); // trop tard, la manche est déjà jouée
    expect(onpoint).toHaveBeenCalledTimes(1);
    expect(onpoint).toHaveBeenCalledWith(2);
    unmount(app);
  });

  it("ignore les tirs avant la fin de « Prêts ? »", () => {
    const { app, onpoint, shoot } = setup();
    shoot(1);
    expect(onpoint).not.toHaveBeenCalled();
    unmount(app);
  });
});
