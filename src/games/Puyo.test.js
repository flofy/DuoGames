import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Puyo from './Puyo.svelte';

// jsdom n'a pas de canvas : contexte factice qui accepte tous les appels
const fakeCtx = () =>
  new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'measureText' ? () => ({ width: 10 }) : () => {}),
    set: (t, k, v) => { t[k] = v; return true; }
  });

describe('Flobopuyo', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(fakeCtx);
    let s = 7; // aléa déterministe
    vi.spyOn(Math, 'random').mockImplementation(() => ((s = (s * 16807) % 2147483647) - 1) / 2147483646);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const setup = (mode) => {
    const onpoint = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    const app = mount(Puyo, { target, props: { mode, onpoint } });
    flushSync();
    return { onpoint, target, app };
  };

  it.each(['1p', '2p'])('se monte et se démonte en mode %s', (mode) => {
    const { target, app } = setup(mode);
    expect(target.querySelector('canvas')).not.toBeNull();
    vi.advanceTimersByTime(2000);
    unmount(app);
    expect(target.querySelector('canvas')).toBeNull();
  });

  it('en solo, un J1 inactif finit par perdre face à l\'IA', () => {
    const { onpoint, app } = setup('1p');
    vi.advanceTimersByTime(180000);
    expect(onpoint).toHaveBeenCalled();
    expect(onpoint.mock.calls[0][0]).toBe(2);
    unmount(app);
  });

  it('le clavier ne plante pas', () => {
    const { app } = setup('2p');
    vi.advanceTimersByTime(1500);
    for (const code of ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyW', 'KeyS']) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      vi.advanceTimersByTime(300);
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    }
    unmount(app);
  });
});
