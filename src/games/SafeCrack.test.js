import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

// le web component (three.js) est testé dans le paquet : ici on vérifie seulement le branchement
vi.mock('@duogames/coffre-fort', () => ({ TAG: 'coffre-fort-3d' }));

// faux élément avec de vrais accesseurs (comme un web component Svelte enregistré) : Svelte pose alors des propriétés
customElements.define('coffre-fort-3d', class extends HTMLElement {
  #mode = '';
  #muted = false;
  get mode() { return this.#mode; }
  set mode(v) { this.#mode = v; }
  get muted() { return this.#muted; }
  set muted(v) { this.#muted = v; }
});

const { default: SafeCrack } = await import('./SafeCrack.svelte');
const { sound } = await import('../lib/sfx.svelte.js');

async function setup(mode = '1p') {
  const onpoint = vi.fn();
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(SafeCrack, { target, props: { mode, onpoint } });
  flushSync();
  const loading = target.textContent;
  await vi.waitFor(() => expect(target.querySelector('coffre-fort-3d')).not.toBeNull());
  flushSync();
  return { app, target, onpoint, loading, el: target.querySelector('coffre-fort-3d') };
}
const end = (el, winner) => el.dispatchEvent(new CustomEvent('roundend', { detail: { winner, times: [1, 2] }, bubbles: true }));

describe('Coffre-fort 3D (branchement DuoGames)', () => {
  afterEach(() => { document.body.innerHTML = ''; sound.on = true; });

  it('affiche un chargement puis le web component avec le mode', async () => {
    const { app, loading, el } = await setup('2p');
    expect(loading).toContain('Chargement');
    expect(el.mode).toBe('2p');
    unmount(app);
  });

  it('transmet le point du gagnant et ignore les égalités', async () => {
    const { app, el, onpoint } = await setup('1p');
    end(el, 1);
    end(el, 0);
    end(el, 2);
    expect(onpoint.mock.calls).toEqual([[1], [2]]);
    unmount(app);
  });

  it('coupe le son du composant quand le son de l’appli est coupé', async () => {
    const { app, el } = await setup();
    expect(el.muted).toBe(false);
    sound.on = false;
    flushSync();
    expect(el.muted).toBe(true);
    unmount(app);
  });

  it('ne réagit plus après démontage', async () => {
    const { app, el, onpoint } = await setup();
    unmount(app);
    end(el, 1);
    expect(onpoint).not.toHaveBeenCalled();
  });
});
