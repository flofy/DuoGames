// Score global (coupe) persisté dans le navigateur
function load() {
  try { return JSON.parse(localStorage.getItem('jad-stats') || '{}'); } catch { return {}; }
}
const state = $state({ p1: 0, p2: 0, ...load() });
function save() {
  try { localStorage.setItem('jad-stats', JSON.stringify(state)); } catch {}
}

export const stats = {
  get p1() { return state.p1; },
  get p2() { return state.p2; },
  add(p) { state[p === 1 ? 'p1' : 'p2']++; save(); },
  reset() { state.p1 = 0; state.p2 = 0; save(); }
};
