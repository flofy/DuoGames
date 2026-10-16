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

// Historique des parties pour reordonner les jeux (dernier joué en premier)
function loadRecent() {
  try { return JSON.parse(localStorage.getItem('jad-recent') || '[]'); } catch { return []; }
}
const recent = $state(loadRecent());
function saveRecent() {
  try { localStorage.setItem('jad-recent', JSON.stringify(recent)); } catch {}
}
function touch(id) {
  const i = recent.indexOf(id);
  if (i >= 0) recent.splice(i, 1);
  recent.unshift(id);
  saveRecent();
}

export const recentGames = {
  get list() { return [...recent]; },
  touch,
};
