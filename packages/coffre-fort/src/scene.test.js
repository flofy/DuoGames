import { describe, it, expect, vi } from 'vitest';

// WebGL absent de jsdom : on remplace uniquement le moteur de rendu, le reste de three.js est réel
vi.mock('three', async (importOriginal) => {
  const real = await importOriginal();
  class FakeRenderer {
    constructor() { this.domElement = document.createElement('canvas'); this.renders = 0; this.disposed = false; this.size = null; }
    setPixelRatio() {}
    setSize(w, h) { this.size = [w, h]; }
    render() { this.renders++; }
    dispose() { this.disposed = true; }
  }
  return { ...real, WebGLRenderer: FakeRenderer };
});

const { createScene, PER_TURN } = await import('./scene.js');
const { createRun, advance } = await import('./logic.js');

const segs = [{ axis: 'x', dir: 1, len: 360 }, { axis: 'y', dir: -1, len: 240 }, { axis: 'z', dir: 1, len: 300 }];

describe('scène 3D', () => {
  it('ajoute le canvas, construit une hélice par tronçon et libère tout', () => {
    const host = document.createElement('div');
    const s = createScene(host);
    expect(host.querySelector('canvas')).not.toBeNull();
    s.setChain(segs);
    expect(s.helices.map((h) => h.total)).toEqual([PER_TURN, Math.round((240 / 360) * PER_TURN), Math.round((300 / 360) * PER_TURN)]);
    s.dispose();
    expect(host.querySelector('canvas')).toBeNull();
    expect(s.helices).toHaveLength(0);
  });

  it('retire les maillons au fil de la progression et masque les tronçons finis', () => {
    const s = createScene(document.createElement('div'));
    s.setChain(segs);
    const run = createRun(segs);
    const O = [1, 0, 0, 0];
    s.update({ O, door: 0, run, playing: true });
    expect(s.helices[0].instanced.count).toBe(PER_TURN);
    expect(s.helices[0].state).toBe('active');
    expect(s.helices[1].state).toBe('idle');
    advance(run, [90, 0, 0]); // 180° de chaîne = demi-tour
    s.update({ O, door: 0, run, playing: true });
    expect(s.helices[0].instanced.count).toBe(PER_TURN / 2);
    advance(run, [90, 0, 0]); // tronçon X fini
    s.update({ O, door: 0, run, playing: true });
    expect(s.helices[0].state).toBe('done');
    expect(s.helices[0].group.visible).toBe(false);
    expect(s.helices[1].state).toBe('active');
    s.dispose();
  });

  it("applique l'orientation et ouvre la porte", () => {
    const s = createScene(document.createElement('div'));
    s.setChain(segs);
    const run = createRun(segs);
    const h = Math.SQRT1_2;
    s.update({ O: [h, h, 0, 0], door: 1, run, playing: false }); // 90° autour de X
    s.render();
    s.dispose();
  });

  it('adapte la caméra au format du conteneur (recule seulement si trop étroit)', () => {
    const s = createScene(document.createElement('div'));
    const z = () => s.camera.position.z;
    s.resize(400, 400);
    const carre = z();
    s.resize(366, 480); // portrait courant : coffre + chaîne tiennent à distance normale
    expect(z()).toBeCloseTo(carre, 6);
    s.resize(200, 600); // portrait très étroit : on recule
    expect(z()).toBeGreaterThan(carre);
    s.resize(0, 0); // ignoré
    expect(z()).toBeGreaterThan(carre);
    s.dispose();
  });
});
