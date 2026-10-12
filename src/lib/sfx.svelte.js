// Effets sonores synthétisés (aucun fichier audio) + réglage son persisté
const KEY = 'jad-sound';
function load() {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
}
export const sound = $state({ on: load() });

let ac = null;
function ctx() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { ctx(); }, { passive: true });

function tone(f, d, type = 'sine', v = 0.15, to = null, delay = 0) {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + d + 0.02);
}
function noise(d, v = 0.2, freq = 1200, delay = 0) {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * d)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

const lib = {
  tap: () => tone(520, 0.07, 'square', 0.06),
  tick: () => tone(760, 0.05, 'triangle', 0.12),
  bounce: () => tone(330, 0.08, 'sine', 0.18, 200),
  clack: () => { noise(0.04, 0.25, 4000); tone(900, 0.04, 'triangle', 0.1); },
  hit: () => tone(240, 0.1, 'sawtooth', 0.1, 110),
  pocket: () => tone(420, 0.16, 'sine', 0.18, 140),
  point: () => { tone(523, 0.1, 'triangle', 0.18); tone(784, 0.16, 'triangle', 0.18, null, 0.09); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.2, null, i * 0.12)),
  crash: () => { noise(0.3, 0.3, 900); tone(140, 0.3, 'sawtooth', 0.12, 50); },
  boom: () => { noise(0.35, 0.35, 500); tone(100, 0.3, 'sine', 0.25, 40); },
  splash: () => noise(0.18, 0.18, 2500),
  whoosh: () => noise(0.14, 0.12, 1800),
  pop: () => tone(600, 0.09, 'sine', 0.2, 1000),
  bump: () => tone(160, 0.09, 'square', 0.12, 90),
  hole: () => { tone(500, 0.1, 'sine', 0.2); tone(700, 0.14, 'sine', 0.2, null, 0.1); }
};
const last = {};
export function sfx(name) {
  if (!sound.on) return;
  const now = performance.now();
  if (last[name] && now - last[name] < 45) return;
  last[name] = now;
  try { lib[name]?.(); } catch {}
}
export function toggleSound() {
  sound.on = !sound.on;
  try { localStorage.setItem(KEY, sound.on ? '1' : '0'); } catch {}
  if (sound.on) sfx('tap');
}
