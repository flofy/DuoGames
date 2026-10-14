// Worker Cloudflare : sert l'application statique (dist/) et le mode
// multi-appareils (API de salons + WebSockets via Durable Objects).
//
//   GET    /api/health          diagnostic
//   POST   /api/rooms           crée un salon  { game }  → { code }
//   GET    /api/rooms/:code     état public d'un salon
//   WS     /parties/game-room/:code
//
// Tout le reste est servi depuis les assets statiques.
import { getServerByName, routePartykitRequest } from 'partyserver';
import { GameRoom } from './game-room.js';
import { isRemoteGame, remoteGames } from '../src/lib/net/games/registry.js';
import { isValidCode, makeCode, normalizeCode } from '../src/lib/net/protocol.js';

export { GameRoom };

const PREFIX = 'parties';
const PARTY = 'game-room'; // kebab-case du binding GameRoom (voir wrangler.jsonc)
const MAX_CODE_TRIES = 12;

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });

// ---------------------------------------------------------------------------
// Politique d'origine
// ---------------------------------------------------------------------------
// Les en-têtes CORS ne protègent pas un handshake WebSocket : on valide donc
// explicitement l'Origin des connexions temps réel.

const configuredOrigins = (env) =>
  String(env?.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

const isLocalOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin) ||
  origin === 'capacitor://localhost' ||
  origin === 'ionic://localhost';

function originAllowed(origin, url, env) {
  if (!origin) return true; // client hors navigateur (tests, outils)
  if (origin === url.origin) return true; // même origine : le cas normal
  if (isLocalOrigin(origin)) return true; // vite dev + coquille Capacitor
  return configuredOrigins(env).includes(origin.replace(/\/$/, ''));
}

function corsHeaders(origin, url, env) {
  if (!origin || !originAllowed(origin, url, env)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
}

// ---------------------------------------------------------------------------
// Création / interrogation de salon
// ---------------------------------------------------------------------------

async function createRoom(request, env) {
  let game = '';
  try {
    const body = await request.json();
    game = typeof body?.game === 'string' ? body.game : '';
  } catch {
    return json({ error: 'bad_body' }, 400);
  }
  if (!isRemoteGame(game)) return json({ error: 'unknown_game' }, 400);

  for (let i = 0; i < MAX_CODE_TRIES; i++) {
    const code = makeCode();
    const stub = await getServerByName(env.GameRoom, code);
    if (await stub.claim(game)) return json({ code, game });
  }
  return json({ error: 'no_code' }, 503);
}

async function roomInfo(code, env) {
  if (!isValidCode(code)) return json({ error: 'bad_code' }, 400);
  const stub = await getServerByName(env.GameRoom, code);
  const info = await stub.info();
  if (!info) return json({ error: 'not_found' }, 404);
  return json(info);
}

// ---------------------------------------------------------------------------
// Entrée du Worker
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (url.pathname.startsWith('/api/')) {
      if (!originAllowed(origin, url, env)) return json({ error: 'forbidden_origin' }, 403);
      const cors = corsHeaders(origin, url, env);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

      if (url.pathname === '/api/health') {
        return json(
          {
            ok: true,
            party: `${PREFIX}/${PARTY}`,
            games: remoteGames.map((g) => ({ id: g.id, name: g.name, target: g.target }))
          },
          200,
          cors
        );
      }

      if (url.pathname === '/api/rooms') {
        if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);
        const res = await createRoom(request, env);
        return new Response(res.body, { status: res.status, headers: { ...res.headers, ...cors } });
      }

      const match = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
      if (match) {
        if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);
        const res = await roomInfo(normalizeCode(decodeURIComponent(match[1])), env);
        return new Response(res.body, { status: res.status, headers: { ...res.headers, ...cors } });
      }

      return json({ error: 'not_found' }, 404, cors);
    }

    // WebSockets du salon : partyserver route /parties/game-room/<CODE>.
    const party = await routePartykitRequest(request, env, {
      prefix: PREFIX,
      onBeforeConnect(req, lobby) {
        if (!isValidCode(lobby.name)) return new Response('Bad room code', { status: 400 });
        if (!originAllowed(req.headers.get('Origin'), url, env)) {
          return new Response('Forbidden origin', { status: 403 });
        }
      }
    });
    if (party) return party;

    return env.ASSETS.fetch(request);
  }
};
