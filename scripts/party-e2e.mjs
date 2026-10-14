// Vérification locale de bout en bout (temporaire, non versionné) :
//   node e2e-local.mjs   (avec `npx wrangler dev` sur 127.0.0.1:8787)
import { PartySocket } from 'partysocket';

const HOST = process.env.PARTY_HOST || '127.0.0.1:8787';
const BASE = `http://${HOST}`;
const T = Number(process.env.E2E_TIMEOUT || 120000);

let failures = 0;
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, timeout = T) {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error(`timeout: ${label}`);
    await sleep(200);
  }
}

const post = async (path, body) => {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

function connect(code, clientId, name) {
  const ws = new PartySocket({
    host: HOST,
    party: 'game-room',
    room: code,
    query: { c: clientId, n: name }
  });
  ws.inbox = [];
  ws.addEventListener('message', (e) => ws.inbox.push(JSON.parse(e.data)));
  return ws;
}

const lastSync = (ws) => [...ws.inbox].reverse().find((m) => m.t === 'sync')?.room ?? null;
const lastError = (ws) => [...ws.inbox].reverse().find((m) => m.t === 'error') ?? null;
const clearErrors = (ws) => (ws.inbox = ws.inbox.filter((m) => m.t !== 'error'));

async function main() {
  // 1. API : création de salon
  const created = await post('/api/rooms', { game: 'ttt' });
  check('POST /api/rooms crée un salon', created.status === 200 && /^[A-Z2-9]{4}$/.test(created.body.code), JSON.stringify(created.body));
  const code = created.body.code;

  const info = await (await fetch(`${BASE}/api/rooms/${code}`)).json();
  check('GET /api/rooms/:code renvoie l’état', info.game === 'ttt' && info.phase === 'lobby', JSON.stringify(info));

  const unknown = await post('/api/rooms', { game: 'pas-un-jeu' });
  check('jeu inconnu refusé', unknown.status === 400 && unknown.body.error === 'unknown_game', JSON.stringify(unknown.body));

  // 2. Premier joueur
  const a = connect(code, 'client-a', 'Alice');
  const syncA = await until(() => lastSync(a), 'sync Alice');
  check('Alice prend le siège 1', syncA.you.seat === 1 && syncA.players[0].name === 'Alice', JSON.stringify(syncA.you));

  // 3. Deuxième joueur
  const b = connect(code, 'client-b', 'Bob');
  await until(() => lastSync(b)?.you.seat === 2, 'sync Bob');
  const both = await until(() => (lastSync(a)?.players[1] ? lastSync(a) : null), 'Alice voit Bob');
  check('Bob prend le siège 2 et Alice le voit', both.players[1].name === 'Bob' && both.phase === 'lobby');

  // 4. Spectateur (3e appareil)
  const c = connect(code, 'client-c', 'Carla');
  const syncC = await until(() => lastSync(c), 'sync spectateur');
  check('3e connexion = spectateur', syncC.you.seat === 0 && syncC.you.spectator === true, JSON.stringify(syncC.you));

  // 5. Prêt → démarrage
  a.send(JSON.stringify({ t: 'ready', ready: true }));
  b.send(JSON.stringify({ t: 'ready', ready: true }));
  const playing = await until(() => (lastSync(a)?.phase === 'playing' ? lastSync(a) : null), 'démarrage de la manche');
  check('la manche démarre quand les deux sont prêts', playing.turn === 1 && playing.state.board.every((v) => v === 0));

  // 6. Coup hors tour refusé
  clearErrors(b);
  b.send(JSON.stringify({ t: 'move', move: { cell: 5 } }));
  const err = await until(() => lastError(b), 'erreur hors tour');
  check('coup hors tour refusé', err.code === 'NOT_YOUR_TURN', JSON.stringify(err));

  // 7. Partie complète : J1 gagne (0, 1, 2)
  const move = async (ws, cell) => {
    ws.send(JSON.stringify({ t: 'move', move: { cell } }));
    await until(() => lastSync(ws)?.state?.board[cell] === (ws === a ? 1 : 2), `coup ${cell}`);
  };
  await move(a, 0);
  await move(b, 3);
  await move(a, 1);
  await move(b, 4);
  await move(a, 2);

  const round = await until(() => (lastSync(a)?.phase === 'round' ? lastSync(a) : null), 'fin de manche');
  check('J1 gagne la manche', round.roundWinner === 1 && round.scores[0] === 1 && round.scores[1] === 0, JSON.stringify(round.scores));

  // 8. Le spectateur a suivi la même partie
  const spec = lastSync(c);
  check('le spectateur voit la même partie', spec?.state?.board[2] === 1 && spec?.phase === 'round');

  // 9. Coup après la manche refusé
  clearErrors(a);
  a.send(JSON.stringify({ t: 'move', move: { cell: 8 } }));
  const err2 = await until(() => lastError(a), 'erreur manche finie');
  check('coup après la manche refusé', err2.code === 'NOT_READY', JSON.stringify(err2));

  // 10. Reconnexion : Alice retrouve son siège
  a.close();
  await until(() => lastSync(b)?.players[0]?.connected === false, 'Alice marquée déconnectée');
  const a2 = connect(code, 'client-a', 'Alice');
  const back = await until(() => lastSync(a2), 'resync Alice');
  check('Alice retrouve le siège 1 après reconnexion', back.you.seat === 1 && back.scores[0] === 1, JSON.stringify(back.you));

  // 11. Manche suivante
  a2.send(JSON.stringify({ t: 'rematch' }));
  b.send(JSON.stringify({ t: 'rematch' }));
  const round2 = await until(() => (lastSync(a2)?.phase === 'playing' && lastSync(a2).round === 2 ? lastSync(a2) : null), 'manche 2');
  check('la manche 2 démarre', round2.round === 2 && round2.turn === 1 && round2.scores[0] === 1);

  // 12. Dots and Boxes : pose d'arête et tour
  const dots = await post('/api/rooms', { game: 'dots' });
  check('salon dots créé', dots.status === 200, JSON.stringify(dots.body));
  const d1 = connect(dots.body.code, 'd1', 'Dora');
  const d2 = connect(dots.body.code, 'd2', 'Dan');
  await until(() => lastSync(d1)?.you.seat === 1, 'd1 assis');
  await until(() => lastSync(d2)?.you.seat === 2, 'd2 assis');
  d1.send(JSON.stringify({ t: 'ready', ready: true }));
  d2.send(JSON.stringify({ t: 'ready', ready: true }));
  const dplay = await until(() => (lastSync(d1)?.phase === 'playing' ? lastSync(d1) : null), 'dots démarrés');
  check('dots démarre', dplay.state.h.length === 12 && dplay.state.v.length === 12 && dplay.state.boxes.length === 9);
  d1.send(JSON.stringify({ t: 'move', move: { t: 'h', r: 0, c: 0 } }));
  const after = await until(() => (lastSync(d1)?.state?.h[0] === 1 ? lastSync(d1) : null), 'arête posée');
  check('arête posée et tour passé à J2', after.turn === 2 && after.last.t === 'h');

  clearErrors(d2);
  d2.send(JSON.stringify({ t: 'move', move: { t: 'h', r: 0, c: 0 } }));
  const dup = await until(() => lastError(d2), 'arête déjà posée');
  check('arête déjà posée refusée', dup.code === 'ILLEGAL_MOVE', JSON.stringify(dup));

  [a2, b, c, d1, d2].forEach((ws) => ws.close());
  await sleep(500);
  console.log(failures === 0 ? '\nTOUT EST VERT' : `\n${failures} ÉCHEC(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('ERREUR', e);
  process.exit(1);
});
