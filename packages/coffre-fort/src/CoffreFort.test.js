import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// WebGL absent de jsdom : seul le moteur de rendu est remplacé
vi.mock('three', async (importOriginal) => {
  const real = await importOriginal();
  class FakeRenderer {
    constructor() { this.domElement = document.createElement('canvas'); globalThis.__renderer = this; this.renders = 0; this.disposed = false; }
    setPixelRatio() {}
    setSize() {}
    render() { this.renders++; }
    dispose() { this.disposed = true; }
  }
  return { ...real, WebGLRenderer: FakeRenderer };
});

await import('./index.js');
const { makeChain, mulberry32, aiTime } = await import('./logic.js');

const KEYS = { x: ['w', 's'], y: ['d', 'a'], z: ['q', 'e'] }; // [+, -]
const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k }));
const TOFAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'];
const advance = (ms) => vi.advanceTimersByTimeAsync(ms);

let el, events;
async function mountEl({ mode = '1p', seed = 7 } = {}) {
  el = document.createElement('coffre-fort-3d');
  el.mode = mode;
  el.seed = seed;
  events = [];
  el.addEventListener('roundend', (e) => events.push(e.detail));
  document.body.appendChild(el);
  await advance(0);
  return el;
}
const root = () => el.shadowRoot;
const q = (s) => root().querySelector(s);
const text = () => root().textContent.replace(/\s+/g, ' ');
const clickGo = async () => { q('button.go').click(); await advance(0); };
const expectedChain = (seed, round = 1) => { const rng = mulberry32(seed * 1000 + round); return { rng, segs: makeChain(rng) }; };

// maintient la touche de l'axe actif le temps de défaire un tronçon (150 °/s de téléphone, gain ×2)
async function solve(segs, { startDelay = 0 } = {}) {
  if (startDelay) await advance(startDelay);
  for (const s of segs) {
    const k = KEYS[s.axis][s.dir > 0 ? 0 : 1];
    key(k, true);
    await advance(Math.ceil((s.len / 2 / 150) * 1000) + 60);
    key(k, false);
    await advance(40);
  }
}
async function startPlay() {
  await clickGo();               // Prêt
  await advance(2300);           // 3-2-1
}

describe('<coffre-fort-3d>', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: TOFAKE }); localStorage.clear(); });
  afterEach(() => {
    el?.remove();
    key('w', false); key('d', false); key('q', false);
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('s’enregistre, affiche l’écran Prêt et construit la scène 3D', async () => {
    await mountEl();
    expect(customElements.get('coffre-fort-3d')).toBeDefined();
    expect(q('canvas')).not.toBeNull();
    expect(text()).toContain('Toi');
    expect(text()).toContain('Prêt');
    await advance(100);
    expect(globalThis.__renderer.renders).toBeGreaterThan(0);
  });

  it('1 joueur : un tour complet bat l’IA, émet roundend et enchaîne la manche suivante', async () => {
    await mountEl({ mode: '1p', seed: 7 });
    const { segs, rng } = expectedChain(7);
    const ai = aiTime(segs, rng);
    await startPlay();
    expect(root().querySelector('.hint').textContent).toMatch(/Bascule|Tonneau|Volant/);
    await solve(segs);
    await advance(2000);
    expect(text()).toContain('Tu gagnes');
    expect(events).toHaveLength(1);
    expect(events[0].winner).toBe(1);
    expect(events[0].mode).toBe('1p');
    expect(events[0].times[1]).toBe(ai);
    expect(events[0].times[0]).toBeLessThan(ai);
    await clickGo(); // « Manche suivante » : nouvelle chaîne, retour à l'écran Prêt
    expect(text()).toContain('Prêt');
  });

  it('1 joueur : trop lent, l’IA gagne', async () => {
    await mountEl({ mode: '1p', seed: 11 });
    const { segs } = expectedChain(11);
    await startPlay();
    await solve(segs, { startDelay: 30000 });
    await advance(2000);
    expect(events[0].winner).toBe(2);
    expect(text()).toContain('L’IA gagne');
  });

  it('2 joueurs : chacun son tour sur la même chaîne, le plus rapide gagne', async () => {
    await mountEl({ mode: '2p', seed: 5 });
    const { segs } = expectedChain(5);
    expect(text()).toContain('J1');
    await startPlay();
    await solve(segs);
    await advance(2000);
    expect(text()).toContain('Passe le téléphone à J2');
    expect(events).toHaveLength(0);
    await clickGo(); // « J2 joue »
    expect(text()).toContain('J2');
    await startPlay();
    await solve(segs, { startDelay: 4000 }); // J2 traîne
    await advance(2000);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ winner: 1, mode: '2p' });
    expect(events[0].times).toHaveLength(2);
    expect(events[0].times[0]).toBeLessThan(events[0].times[1]);
    expect(text()).toContain('J1 gagne');
  });

  it('ignore le mauvais axe', async () => {
    await mountEl({ seed: 7 });
    const { segs } = expectedChain(7);
    await startPlay();
    const wrong = ['x', 'y', 'z'].find((a) => a !== segs[0].axis);
    key(KEYS[wrong][0], true);
    await advance(1500);
    key(KEYS[wrong][0], false);
    const idx = [...root().querySelectorAll('.pips i')].findIndex((i) => i.classList.contains('cur'));
    expect(idx).toBe(0);
    expect(events).toHaveLength(0);
  });

  it('propose des curseurs quand les capteurs sont indisponibles', async () => {
    await mountEl();
    await clickGo();
    await advance(1700);
    expect(q('.sliders')).not.toBeNull();
    expect(text()).toContain('Capteurs indisponibles');
  });

  it('mémorise l’inversion d’un axe', async () => {
    await mountEl();
    const chip = [...root().querySelectorAll('.inv button')].find((b) => b.textContent.includes('Y'));
    chip.click();
    await advance(0);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(localStorage.getItem('coffre3d-inv')).y).toBe(true);
  });

  it('libère la scène et les écouteurs quand on le retire de la page', async () => {
    await mountEl();
    const r = globalThis.__renderer;
    el.remove();
    await advance(10);
    expect(r.disposed).toBe(true);
    const rendersBefore = r.renders;
    await advance(200);
    expect(r.renders).toBe(rendersBefore); // plus de boucle d'animation
  });
});
