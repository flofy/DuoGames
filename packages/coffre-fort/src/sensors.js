// Entrées du jeu : orientation, avec secours gyroscope via devicemotion puis curseurs/clavier.
// take(dt) renvoie la rotation (°) accumulée autour des axes X, Y, Z depuis le dernier appel.
import { quatFromEuler, deltaRotation } from './logic.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createSensors({ sliderRate = 150, maxStep = 60, onChange = () => {} } = {}) {
  let ok = false;
  let source = null;
  let qPrev = null;
  let acc = [0, 0, 0];
  let listening = false;
  let timer = null;
  let orientationEvents = false;
  let motionEvents = false;
  let orientationPermission = 'non-demandée';
  const sliders = [0, 0, 0];
  const keys = {};

  function diagnostics() {
    return {
      secureContext: window.isSecureContext,
      orientationApi: 'DeviceOrientationEvent' in window,
      motionApi: 'DeviceMotionEvent' in window,
      orientationEvents,
      motionEvents,
      orientationPermission
    };
  }

  function report() {
    onChange({ ok, source, ...diagnostics() });
  }

  function activate(nextSource) {
    if (source !== nextSource) {
      source = nextSource;
      qPrev = null;
      if (!ok) {
        ok = true;
        onChange({ ok: true, source: nextSource });
      }
    }
  }

  function onOri(e) {
    if (!orientationEvents) {
      orientationEvents = true;
      report();
    }
    if (e.beta == null || e.gamma == null) return;
    // Préférer l'orientation absolue lorsqu'elle est disponible : elle donne une
    // position stable. Le gyroscope reste un secours si cet événement est bloqué.
    activate('orientation');
    const q = quatFromEuler(e.alpha || 0, e.beta, e.gamma);
    if (qPrev) {
      const v = deltaRotation(qPrev, q);
      acc[0] += v[0]; acc[1] += v[1]; acc[2] += v[2];
    }
    qPrev = q;
  }

  function onMotion(e) {
    if (!motionEvents) {
      motionEvents = true;
      report();
    }
    // Certains navigateurs/appareils exposent le gyroscope sans livrer
    // deviceorientation. Ne pas mélanger les deux sources : elles n'ont pas
    // le même référentiel ni la même sémantique.
    if (source === 'orientation') return;
    const r = e.rotationRate;
    if (!r || r.alpha == null || r.beta == null || r.gamma == null) return;
    activate('motion');
    const dt = Number.isFinite(e.interval) && e.interval > 0 ? e.interval / 1000 : 1 / 60;
    // DeviceMotion.rotationRate est en degrés/seconde ; alpha/beta/gamma
    // correspondent respectivement aux axes Z/X/Y du repère d'orientation.
    acc[0] += r.beta * dt;
    acc[1] += r.gamma * dt;
    acc[2] += r.alpha * dt;
  }

  const onKeyDown = (e) => { keys[e.key.toLowerCase()] = true; };
  const onKeyUp = (e) => { keys[e.key.toLowerCase()] = false; };
  const axis = (p, m) => (keys[p] ? 1 : 0) - (keys[m] ? 1 : 0);

  // À appeler depuis un geste utilisateur (autorisation requise sur certains iOS).
  async function start() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        orientationPermission = 'en attente';
        const permission = await DeviceOrientationEvent.requestPermission();
        orientationPermission = permission === 'granted' ? 'accordée' : 'refusée';
        if (permission !== 'granted') {
          // On conserve le secours devicemotion et les contrôles manuels.
          source = null;
        }
      } else {
        orientationPermission = 'non requise par ce navigateur';
      }
    } catch {
      // Un refus d'orientation ne doit pas empêcher d'essayer le gyroscope.
      orientationPermission = 'erreur ou refus';
      source = null;
    }
    if (!listening) {
      listening = true;
      window.addEventListener('deviceorientation', onOri);
      window.addEventListener('devicemotion', onMotion);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }
    report();
    clearTimeout(timer);
    timer = setTimeout(() => { if (!ok) report(); }, 1500);
  }

  function stop() {
    clearTimeout(timer);
    if (!listening) return;
    listening = false;
    window.removeEventListener('deviceorientation', onOri);
    window.removeEventListener('devicemotion', onMotion);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

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

  return { start, stop, reset, take, setSlider, diagnostics, get ok() { return ok; } };
}
