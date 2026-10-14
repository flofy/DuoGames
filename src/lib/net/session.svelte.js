// Session multi-appareils côté navigateur : connexion au salon (partysocket),
// état reçu du serveur et petites préférences persistées.
import { PartySocket } from 'partysocket';
import { S2C, cleanName, encode, normalizeCode, roomFromQuery } from './protocol.js';

const ID_KEY = 'jad-net-id';
const NAME_KEY = 'jad-net-name';
const RECENT_KEY = 'jad-net-recent';

const read = (key, fallback = '') => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* navigation privée : on continue sans persister */
  }
};

export function clientId() {
  let id = read(ID_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).slice(0, 64);
    write(ID_KEY, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Hôte du Worker (Cloudflare) : même origine par défaut, configurable au build.
// ---------------------------------------------------------------------------

const viteEnv = import.meta.env ?? {};

export const partyHost = () => viteEnv.VITE_PARTY_HOST || (typeof location !== 'undefined' ? location.host : '');

const isLocalHost = (host) => /^(localhost|127\.0\.0\.1|\[::1\]|10\.|192\.168\.)/.test(host.replace(/:\d+$/, ''));

// `ws` en développement (http://localhost), `wss` partout ailleurs ;
// VITE_PARTY_PROTOCOL permet de forcer si l'installation est exotique.
const partyProtocol = () => {
  if (viteEnv.VITE_PARTY_PROTOCOL === 'ws' || viteEnv.VITE_PARTY_PROTOCOL === 'wss') return viteEnv.VITE_PARTY_PROTOCOL;
  return isLocalHost(partyHost()) ? 'ws' : 'wss';
};

const apiBase = () => {
  const host = partyHost();
  const scheme = isLocalHost(host) ? 'http' : 'https';
  return `${scheme}://${host}`;
};

export const PARTY = 'game-room';

// ---------------------------------------------------------------------------
// État réactif
// ---------------------------------------------------------------------------

export const session = $state({
  status: 'idle', // idle | connecting | online | offline | error
  error: '',
  code: '',
  game: '',
  room: null, // dernière vue « sync » du serveur
  name: read(NAME_KEY, ''),
  link: ''
});

let socket = null;
let intentionalClose = false;

export const you = () => session.room?.you ?? { seat: 0, spectator: true };
export const isSeated = () => you().seat > 0;

// Salons récents, purgés au passage des entrées trop vieilles pour être utiles.
export function recentRooms(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const list = JSON.parse(read(RECENT_KEY, '[]'));
    if (!Array.isArray(list)) return [];
    const fresh = list.filter((r) => r && typeof r.code === 'string' && Date.now() - (r.at ?? 0) < maxAgeMs);
    return fresh.slice(0, 5);
  } catch {
    return [];
  }
}

function remember(code, game) {
  try {
    const list = recentRooms().filter((r) => r.code !== code);
    list.unshift({ code, game, at: Date.now() });
    write(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
  } catch {
    /* ignore */
  }
}

export function setName(name) {
  session.name = cleanName(name);
  write(NAME_KEY, session.name);
}

// ---------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------

function handleMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  if (msg?.t === S2C.SYNC && msg.room) {
    session.room = msg.room;
    session.game = msg.room.game;
    session.status = 'online';
  } else if (msg?.t === S2C.ERROR) {
    if (msg.code === 'NO_ROOM') {
      intentionalClose = true;
      session.status = 'error';
      session.error = msg.message ?? 'Salon introuvable.';
      socket?.close();
    } else {
      session.error = msg.message ?? 'Action refusée.';
    }
  }
}

function connect(code) {
  disconnect();
  session.code = code;
  session.room = null;
  session.error = '';
  session.status = 'connecting';
  session.link = typeof location !== 'undefined' ? `${location.origin}${location.pathname}?room=${code}` : '';

  const url = new URL(session.link || 'http://localhost/');
  socket = new PartySocket({
    host: partyHost(),
    protocol: partyProtocol(),
    party: PARTY,
    room: code,
    query: { c: clientId(), n: session.name }
  });
  socket.addEventListener('open', () => {
    session.status = 'online';
  });
  socket.addEventListener('message', (event) => handleMessage(event.data));
  socket.addEventListener('close', (event) => {
    if (intentionalClose) return;
    session.status = event.code === 4004 ? 'error' : 'offline';
    if (event.code === 4004) session.error = 'Ce salon n’existe plus.';
  });
  if (url) remember(code, session.game);
}

export function disconnect() {
  intentionalClose = true;
  try {
    socket?.close();
  } catch {
    /* déjà fermé */
  }
  socket = null;
  if (session.status !== 'error') session.status = 'idle';
  session.room = null;
  session.code = '';
}

export function leave() {
  disconnect();
  session.status = 'idle';
  session.error = '';
  if (typeof history !== 'undefined' && location.search) history.replaceState(null, '', location.pathname);
}

// Crée un salon côté Worker puis s'y connecte.
export async function createRoom(game) {
  session.error = '';
  try {
    const res = await fetch(`${apiBase()}/api/rooms`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ game })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? 'Création impossible');
    session.game = game;
    connect(data.code);
  } catch (err) {
    session.status = 'error';
    session.error = 'Impossible de créer le salon (le serveur de jeu est-il joignable ?).';
    if (typeof console !== 'undefined') console.warn('[net] createRoom', err);
  }
}

export function joinRoom(code) {
  const clean = normalizeCode(code);
  if (clean.length < 4) {
    session.status = 'error';
    session.error = 'Code de salon incomplet.';
    return;
  }
  connect(clean);
}

// Code présent dans l'URL (?room=AB34) au chargement.
export const codeFromUrl = () =>
  typeof location === 'undefined' ? '' : roomFromQuery(location.search, location.hash);

// ---------------------------------------------------------------------------
// Envoi
// ---------------------------------------------------------------------------

const send = (msg) => {
  if (socket && socket.readyState === 1) socket.send(encode(msg));
};

export const ready = (value = true) => send({ t: 'ready', ready: value });
export const rematch = () => send({ t: 'rematch' });
export const move = (m) => send({ t: 'move', move: m });
export const hello = () => send({ t: 'hello', name: session.name });
