import '../src/index.js';

const game = document.getElementById('game');
const log = document.getElementById('log');
const buttons = { '1p': document.getElementById('m1'), '2p': document.getElementById('m2') };

for (const [mode, btn] of Object.entries(buttons)) {
  btn.addEventListener('click', () => {
    game.setAttribute('mode', mode);
    for (const [m, b] of Object.entries(buttons)) b.setAttribute('aria-pressed', String(m === mode));
  });
}
game.addEventListener('roundend', (e) => {
  const { winner, times, mode } = e.detail;
  log.textContent = `roundend → mode ${mode}, gagnant : ${winner || 'égalité'}, temps : ${times.map((t) => (t / 1000).toFixed(2) + ' s').join(' / ')}`;
});
