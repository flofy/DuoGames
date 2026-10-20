import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSensors } from './sensors.js';

const ori = (alpha, beta, gamma) => {
  const e = new Event('deviceorientation');
  Object.assign(e, { alpha, beta, gamma });
  window.dispatchEvent(e);
};
const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k }));

describe('capteurs', () => {
  afterEach(() => vi.useRealTimers());

  it("mesure une bascule X puis un tonneau Y à partir des événements d'orientation", async () => {
    const s = createSensors();
    await s.start();
    ori(0, 0, 0);
    expect(s.ok).toBe(true);
    ori(0, 25, 0);
    ori(0, 40, 0);
    const v = s.take(0.016);
    expect(v[0]).toBeCloseTo(40, 4);
    expect(v[1]).toBeCloseTo(0, 4);
    ori(0, 40, 30); // tonneau dans le repère du corps
    const w = s.take(0.016);
    expect(w[1]).toBeCloseTo(30, 4);
    expect(w[0]).toBeCloseTo(0, 4);
    s.stop();
  });

  it('utilise le gyroscope DeviceMotion quand deviceorientation ne fournit rien', async () => {
    const onChange = vi.fn();
    const s = createSensors({ onChange });
    await s.start();
    const motion = (alpha, beta, gamma, interval = 100) => {
      const e = new Event('devicemotion');
      Object.defineProperties(e, {
        rotationRate: { value: { alpha, beta, gamma } },
        interval: { value: interval }
      });
      window.dispatchEvent(e);
    };
    motion(10, 20, 30);
    expect(s.ok).toBe(true);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      ok: true, source: 'motion', motionEvents: true
    }));
    expect(s.take(0.016)).toEqual([2, 3, 1]);
    s.stop();
  });

  it('préfère deviceorientation au gyroscope si les deux sont disponibles', async () => {
    const s = createSensors();
    await s.start();
    const motion = new Event('devicemotion');
    Object.defineProperties(motion, {
      rotationRate: { value: { alpha: 10, beta: 20, gamma: 30 } },
      interval: { value: 100 }
    });
    window.dispatchEvent(motion);
    ori(0, 0, 0);
    ori(0, 10, 0);
    expect(s.take(0.016)[0]).toBeCloseTo(10, 4);
    s.stop();
  });

  it('plafonne les sauts entre deux lectures', async () => {
    const s = createSensors({ maxStep: 60 });
    await s.start();
    ori(0, 0, 0);
    ori(170, 0, 0);
    expect(s.take(0.016)[2]).toBe(60);
    s.stop();
  });

  it('reset() repart de la position actuelle', async () => {
    const s = createSensors();
    await s.start();
    ori(0, 0, 0);
    ori(0, 30, 0);
    s.reset();
    expect(s.take(0.016)).toEqual([0, 0, 0]);
    s.stop();
  });

  it('prévient quand les capteurs sont indisponibles et passe aux curseurs / clavier', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const s = createSensors({ onChange, sliderRate: 100 });
    await s.start();
    await vi.advanceTimersByTimeAsync(1600);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      ok: false, source: null, timedOut: true, orientationEvents: false, motionEvents: false
    }));
    expect(s.ok).toBe(false);
    s.setSlider(1, 0.5);
    expect(s.take(0.1)[1]).toBeCloseTo(5, 6);
    key('w', true);
    expect(s.take(0.1)[0]).toBeCloseTo(10, 6);
    key('w', false);
    key('e', true);
    expect(s.take(0.1)[2]).toBeCloseTo(-10, 6);
    key('e', false);
    s.stop();
  });

  it('demande l’autorisation iOS quand elle existe, et ignore un refus', async () => {
    const request = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission: request });
    const s = createSensors();
    await expect(s.start()).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(1);
    s.stop();
    vi.unstubAllGlobals();
  });

  it('stop() retire les écouteurs', async () => {
    const s = createSensors();
    await s.start();
    s.stop();
    ori(0, 0, 0);
    expect(s.ok).toBe(false);
  });
});
