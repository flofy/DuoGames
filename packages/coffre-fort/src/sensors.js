// Entrées du jeu : capteurs d'orientation (deviceorientation) avec secours curseurs / clavier.
// take(dt) renvoie la rotation (°) accumulée autour des axes X, Y, Z de l'appareil depuis le dernier appel.
import { quatFromEuler, deltaRotation } from './logic.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createSensors({ sliderRate = 150, maxStep = 60, onChange = () => {} } = {}) {
  let ok = false;
  let qPrev = null;
  let acc = [0, 0, 0];
  let listening = false;
  let timer = null;
  const sliders = [0, 0, 0];
  const keys = {};

  function onOri(e) {
    if (e.beta == null || e.gamma == null) return;
    if (!ok) {
      ok = true;
      onChange({ ok: true });
    }
    const q = quatFromEuler(e.alpha || 0, e.beta, e.gamma);
    if (qPrev) {
      const v = deltaRotation(qPrev, q);
      acc[0] += v[0]; acc[1] += v[1]; acc[2] += v[2];
    }
    qPrev = q;
  }
  const onKeyDown = (e) => { keys[e.key.toLowerCase()] = true; };
  const onKeyUp = (e) => { keys[e.key.toLowerCase()] = false; };
  const axis = (p, m) => (keys[p] ? 1 : 0) - (keys[m] ? 1 : 0);

  // à appeler depuis un geste utilisateur (iOS demande une autorisation)
  async function start() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        await DeviceOrientationEvent.requestPermission();
      }
    } catch { /* refusé : on bascule sur les curseurs */ }
    if (!listening) {
      listening = true;
      window.addEventListener('deviceorientation', onOri);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }
    clearTimeout(timer);
    timer = setTimeout(() => { if (!ok) onChange({ ok: false }); }, 1500);
  }

  function stop() {
    clearTimeout(timer);
    if (!listening) return;
    listening = false;
    window.removeEventListener('deviceorientation', onOri);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

  // repart de la position actuelle (appelé au « Prêt »)
  function reset() { acc = [0, 0, 0]; }

  function take(dt) {
    let v;
    if (ok) { v = acc; acc = [0, 0, 0]; }
    else {
      v = [
        (sliders[0] + axis('w', 's')) * sliderRate * dt,
        (sliders[1] + axis('d', 'a')) * sliderRate * dt,
        (sliders[2] + axis('q', 'e')) * sliderRate * dt
      ];
    }
    return v.map((c) => clamp(c, -maxStep, maxStep));
  }

  const setSlider = (i, value) => { sliders[i] = clamp(+value || 0, -1, 1); };

  return { start, stop, reset, take, setSlider, get ok() { return ok; } };
}
