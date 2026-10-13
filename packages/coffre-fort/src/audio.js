// Sons synthétisés (aucun fichier) et vibrations. `isMuted` est relu à chaque son.
export function createAudio(isMuted = () => false) {
  let ac = null;
  const ctx = () => {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (ac.state === 'suspended' && ac.resume) ac.resume();
    return ac;
  };
  function beep(f, d = 0.08, type = 'square', v = 0.05, delay = 0) {
    if (isMuted()) return;
    const c = ctx();
    if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
      o.type = type; o.frequency.value = f;
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o.stop(t + d + 0.02);
    } catch { /* audio indisponible */ }
  }
  const vibrate = (p) => { try { if (!isMuted() && navigator.vibrate) navigator.vibrate(p); } catch { /* ignoré */ } };
  return {
    unlock: ctx, // à appeler depuis un geste utilisateur
    clink: () => beep(900 + Math.random() * 300, 0.05, 'triangle', 0.07),
    clunk: () => { beep(110, 0.2, 'sawtooth', 0.1); vibrate(25); },
    tick: () => beep(440, 0.08, 'square', 0.05),
    go: () => beep(880, 0.15, 'square', 0.07),
    fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'square', 0.06, i * 0.1)); vibrate([40, 40, 80]); }
  };
}
