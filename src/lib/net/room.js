// Salon de jeu multi-appareils : machine à états PURE.
// Le Worker Durable Object ne fait que persister le résultat de ces fonctions,
// ce qui rend toute la logique testable sans Cloudflare.
import { getRuleSet } from './games/registry.js';
import { cleanName, MAX_PLAYERS } from './protocol.js';

// phases : 'lobby' (on attend les joueurs) → 'playing' (manche en cours)
//          → 'round' (manche finie, on attend les « prêt ») → 'match' (match fini)
export const PHASES = { LOBBY: 'lobby', PLAYING: 'playing', ROUND: 'round', MATCH: 'match' };

export const SEATS = MAX_PLAYERS;

export function createRoom(gameId) {
  if (!getRuleSet(gameId)) return null;
  return {
    game: gameId,
    phase: PHASES.LOBBY,
    round: 1,
    scores: Array(SEATS).fill(0),
    roundWinner: null,
    players: Array(SEATS).fill(null), // { clientId, name, ready, connected }
    state: null,
    last: null,
    at: 0
  };
}

export const seatOf = (room, clientId) =>
  room.players.findIndex((p) => p && p.clientId === clientId) + 1; // 0 = pas de siège

export const seatedPlayers = (room) => room.players.filter(Boolean);

// Réclamation d'un siège. Un joueur déjà assis le retrouve (reconnexion).
export function join(room, { clientId, name }) {
  const seat = seatOf(room, clientId);
  if (seat > 0) {
    const p = room.players[seat - 1];
    p.connected = true;
    if (name) p.name = cleanName(name);
    return { seat, spectator: false, reclaimed: true };
  }

  const free = room.players.findIndex((p) => p === null);
  if (free >= 0) {
    room.players[free] = { clientId, name: cleanName(name), ready: false, connected: true };
    return { seat: free + 1, spectator: false, reclaimed: false };
  }

  // Salon plein : on devient spectateur (utile pour suivre sur un autre écran).
  return { seat: 0, spectator: true, reclaimed: false };
}

// Départ : le siège est libéré tant que la partie n'a pas commencé, sinon il est
// simplement marqué déconnecté pour permettre la reconnexion.
export function leave(room, clientId) {
  const seat = seatOf(room, clientId);
  if (seat === 0) return;
  const p = room.players[seat - 1];
  if (room.phase === PHASES.LOBBY) room.players[seat - 1] = null;
  else {
    p.connected = false;
    p.ready = false;
  }
}

export function setName(room, seat, name) {
  const p = room.players[seat - 1];
  if (p) p.name = cleanName(name);
}

export function setReady(room, seat, ready) {
  const p = room.players[seat - 1];
  if (!p || room.phase === PHASES.PLAYING) return false;
  p.ready = !!ready;
  return true;
}

export const everyoneReady = (room) =>
  room.players.length === SEATS && room.players.every((p) => p && p.ready);

// Fait passer à la manche suivante si tout le monde est prêt.
function startRound(room) {
  const rules = getRuleSet(room.game);
  room.state = rules.create();
  room.last = null;
  room.roundWinner = null;
  room.phase = PHASES.PLAYING;
  room.players.forEach((p) => p && (p.ready = false));
}

// Avance la machine à états quand c'est possible ; renvoie true si ça a bougé.
export function advance(room) {
  if (room.players.some((p) => p === null) || !everyoneReady(room)) return false;
  const rules = getRuleSet(room.game);
  const target = rules.meta.target;

  if (room.phase === PHASES.LOBBY) {
    startRound(room);
    return true;
  }
  if (room.phase === PHASES.ROUND) {
    room.round += 1;
    startRound(room);
    return true;
  }
  if (room.phase === PHASES.MATCH) {
    room.scores = Array(SEATS).fill(0);
    room.round = 1;
    startRound(room);
    return true;
  }
  return false;
}

const score = (room, seat) => room.scores[seat - 1];

// Applique un coup du joueur `seat`. Le serveur est autoritaire : c'est ici que
// la légalité est vérifiée, le client ne fait qu'envoyer une intention.
export function play(room, seat, move) {
  if (room.phase !== PHASES.PLAYING || !room.state) return { ok: false, error: 'NOT_READY' };
  const rules = getRuleSet(room.game);
  const res = rules.apply(room.state, move, seat);
  if (!res.ok) return res;

  room.state = res.state;
  room.last = res.last;

  const over = rules.result(room.state);
  if (over) {
    room.roundWinner = over.winner;
    if (over.winner > 0) room.scores[over.winner - 1] += 1;
    const wonMatch = over.winner > 0 && score(room, over.winner) >= rules.meta.target;
    room.phase = wonMatch ? PHASES.MATCH : PHASES.ROUND;
    room.players.forEach((p) => p && (p.ready = false));
  }
  return { ok: true, over: over ?? null };
}

// Vue envoyée à une connexion : les deux joueurs voient la même chose (aucune
// information cachée pour l'instant), mais `you` est personnalisé.
export function viewFor(room, seat) {
  const rules = getRuleSet(room.game);
  return {
    game: room.game,
    phase: room.phase,
    round: room.round,
    scores: room.scores.slice(),
    roundWinner: room.roundWinner,
    target: rules ? rules.meta.target : 1,
    players: room.players.map((p, i) =>
      p ? { seat: i + 1, name: p.name, ready: p.ready, connected: p.connected } : null
    ),
    turn: room.state ? rules.turn(room.state) : 0,
    state: room.state ? rules.view(room.state, seat) : null,
    last: room.last,
    you: { seat, spectator: seat === 0 },
    at: room.at
  };
}
