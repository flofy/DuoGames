// Protocole du mode multi-appareils : logique pure, partagée client/serveur.
// Aucun accès au DOM ni à Cloudflare ici : ce module est importé par le Worker
// (Cloudflare Durable Objects) et par le navigateur.

// Alphabet sans caractères ambigus (pas de I, O, 0 ni 1) : les codes de salon
// se lisent à voix haute sans erreur.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;
export const MAX_PLAYERS = 2;
export const MAX_NAME = 12;
export const DEFAULT_NAME = 'Joueur';

// Bornes de sécurité : un message ou un état plus gros est refusé.
export const MAX_MESSAGE_BYTES = 2048;
export const MAX_NAME_BYTES = 48;

// Types de messages client → serveur.
export const C2S = {
  HELLO: 'hello',
  READY: 'ready',
  MOVE: 'move',
  REMATCH: 'rematch',
  PING: 'ping'
};

// Types de messages serveur → client.
export const S2C = {
  SYNC: 'sync',
  ERROR: 'error',
  PONG: 'pong'
};

// Codes d'erreur renvoyés au client (messages affichables).
export const ERRORS = {
  BAD_MESSAGE: 'Message illisible.',
  NOT_YOUR_TURN: "Ce n'est pas ton tour.",
  ILLEGAL_MOVE: 'Coup impossible.',
  GAME_OVER: 'La manche est terminée.',
  NOT_READY: 'La partie n’a pas encore commencé.',
  SPECTATOR: 'Tu regardes la partie.'
};

export const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

// ---------------------------------------------------------------------------
// Codes de salon
// ---------------------------------------------------------------------------

// `rng` injectable pour des tests déterministes.
export function makeCode(rng = Math.random) {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return out;
}

// Nettoie une saisie (« ab-12! » → « AB12 ») : le code est insensible à la casse.
export function normalizeCode(input) {
  if (typeof input !== 'string') return '';
  return input
    .toUpperCase()
    .split('')
    .filter((c) => CODE_ALPHABET.includes(c))
    .join('')
    .slice(0, CODE_LENGTH);
}

export const isValidCode = (code) =>
  typeof code === 'string' &&
  code.length === CODE_LENGTH &&
  code.split('').every((c) => CODE_ALPHABET.includes(c));

// ---------------------------------------------------------------------------
// Pseudo
// ---------------------------------------------------------------------------

export function cleanName(input) {
  const name = typeof input === 'string' ? input.replace(/\s+/g, ' ').trim() : '';
  if (!name) return DEFAULT_NAME;
  return name.slice(0, MAX_NAME);
}

// ---------------------------------------------------------------------------
// Encodage / décodage
// ---------------------------------------------------------------------------

export const encode = (msg) => JSON.stringify(msg);

const byteLength = (text) => {
  if (typeof TextEncoder === 'undefined') return text.length;
  return new TextEncoder().encode(text).length;
};

// Renvoie l'objet message, ou null si le message est invalide.
export function decode(raw) {
  if (typeof raw !== 'string') return null;
  if (byteLength(raw) > MAX_MESSAGE_BYTES) return null;
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(msg)) return null;
  if (typeof msg.t !== 'string' || !msg.t) return null;
  return msg;
}

// ---------------------------------------------------------------------------
// Salles
// ---------------------------------------------------------------------------

export const slug = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Lien partageable vers un salon (relatif : fonctionne en local, sur Pages et
// sur le Worker). `base` est l'URL courante, sans query ni hash.
export function roomLink(base, code) {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', code);
  return url.toString();
}

// Lit un code de salon dans les paramètres d'URL (?room=AB12 ou #AB12).
export function roomFromQuery(search, hash = '') {
  const params = new URLSearchParams(search || '');
  const fromQuery = normalizeCode(params.get('room') || '');
  if (isValidCode(fromQuery)) return fromQuery;
  const fromHash = normalizeCode(hash.replace(/^#/, ''));
  return isValidCode(fromHash) ? fromHash : '';
}
