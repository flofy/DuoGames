// Salon multi-appareils : un Durable Object Cloudflare par code de salon.
// Toute la logique de jeu vit dans src/lib/net/room.js (pure et testée) ; ce
// fichier ne fait que la plomberie réseau, la persistance et la diffusion.
import { Server } from 'partyserver';
import {
  C2S,
  ERRORS,
  S2C,
  cleanName,
  decode,
  encode,
  isValidCode,
  makeCode
} from '../src/lib/net/protocol.js';
import {
  advance,
  createRoom,
  join,
  leave,
  play,
  setName,
  setReady,
  viewFor
} from '../src/lib/net/room.js';

// Un salon vide est supprimé après ce délai (hygiène du plan gratuit).
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
const STORAGE_KEY = 'room';

export class GameRoom extends Server {
  // Hibernation : les WebSockets inactifs ne consomment pas de durée facturée.
  static options = { hibernate: true };

  #room = null;

  // Appelé par partyserver à chaque démarrage à froid de l'objet : c'est ici
  // qu'on relit le salon depuis le stockage durable.
  async onStart() {
    this.#room = (await this.ctx.storage.get(STORAGE_KEY)) ?? null;
  }

  // Chargement paresseux : les appels RPC ne passent pas par fetch/websocket.
  async #load() {
    if (!this.#room) this.#room = (await this.ctx.storage.get(STORAGE_KEY)) ?? null;
    return this.#room;
  }

  async #persist() {
    if (!this.#room) return;
    this.#room.at = Date.now();
    await this.ctx.storage.put(STORAGE_KEY, this.#room);
  }

  #send(connection, msg) {
    try {
      connection.send(encode(msg));
    } catch {
      /* connexion déjà fermée */
    }
  }

  #fail(connection, code) {
    this.#send(connection, { t: S2C.ERROR, code, message: ERRORS[code] ?? ERRORS.ILLEGAL_MOVE });
  }

  #syncAll() {
    if (!this.#room) return;
    for (const connection of this.getConnections()) {
      const state = connection.state ?? {};
      this.#send(connection, {
        t: S2C.SYNC,
        room: viewFor(this.#room, state.seat ?? 0),
        serverAt: Date.now()
      });
    }
  }

  // -------------------------------------------------------------------------
  // RPC appelés par le Worker (création / interrogation d'un salon)
  // -------------------------------------------------------------------------

  // Réserve le salon pour un jeu. Renvoie false si le code est déjà pris.
  async claim(gameId) {
    await this.#load();
    if (this.#room) return false;
    const room = createRoom(gameId);
    if (!room) return false;
    this.#room = room;
    await this.#persist();
    // Filet de sécurité : un salon créé puis abandonné sans connexion est
    // quand même nettoyé plus tard.
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    return true;
  }

  async info() {
    await this.#load();
    if (!this.#room) return null;
    const room = this.#room;
    return {
      code: this.name,
      game: room.game,
      phase: room.phase,
      round: room.round,
      full: room.players.every(Boolean),
      players: room.players.filter(Boolean).map((p) => ({ name: p.name, connected: p.connected }))
    };
  }

  // -------------------------------------------------------------------------
  // Connexions
  // -------------------------------------------------------------------------

  async onConnect(connection, ctx) {
    await this.#load();
    if (!this.#room) {
      this.#send(connection, { t: S2C.ERROR, code: 'NO_ROOM', message: 'Ce salon n’existe plus.' });
      connection.close(4004, 'no room');
      return;
    }

    const url = new URL(ctx.request.url);
    const clientId = (url.searchParams.get('c') || '').slice(0, 64) || makeCode(() => Math.random()) + Date.now();
    const name = cleanName(url.searchParams.get('n') || '');
    const { seat } = join(this.#room, { clientId, name });

    connection.setState({ seat, clientId, name });
    await this.#persist();
    this.#syncAll();
  }

  async onMessage(connection, message) {
    await this.#load();
    if (!this.#room) return;

    if (typeof message !== 'string') return;
    const msg = decode(message);
    if (!msg) return this.#fail(connection, 'BAD_MESSAGE');

    const state = connection.state ?? {};
    const seat = state.seat ?? 0;

    switch (msg.t) {
      case C2S.PING:
        this.#send(connection, { t: S2C.PONG, at: Date.now() });
        break;

      case C2S.HELLO: {
        // Reprise de place (le joueur était spectateur) + mise à jour du pseudo.
        let current = seat;
        if (current === 0) {
          const res = join(this.#room, { clientId: state.clientId, name: msg.name ?? state.name });
          current = res.seat;
          connection.setState({ ...state, seat: current, name: cleanName(msg.name ?? state.name) });
        } else if (msg.name) {
          const name = cleanName(msg.name);
          setName(this.#room, current, name);
          connection.setState({ ...state, name });
        }
        await this.#persist();
        this.#syncAll();
        break;
      }

      case C2S.NAME:
        if (seat > 0 && msg.name) {
          const name = cleanName(msg.name);
          setName(this.#room, seat, name);
          connection.setState({ ...state, name });
          await this.#persist();
          this.#syncAll();
        }
        break;

      case C2S.READY:
      case C2S.REMATCH: {
        if (seat === 0) return this.#fail(connection, 'SPECTATOR');
        if (msg.t === C2S.READY && !setReady(this.#room, seat, msg.ready)) {
          return this.#fail(connection, 'NOT_READY');
        }
        if (msg.t === C2S.REMATCH) setReady(this.#room, seat, true);
        advance(this.#room);
        await this.#persist();
        this.#syncAll();
        break;
      }

      case C2S.MOVE: {
        if (seat === 0) return this.#fail(connection, 'SPECTATOR');
        const res = play(this.#room, seat, msg.move);
        if (!res.ok) return this.#fail(connection, res.error);
        await this.#persist();
        this.#syncAll();
        break;
      }

      default:
        this.#fail(connection, 'BAD_MESSAGE');
    }
  }

  async onClose(connection) {
    await this.#load();
    if (!this.#room) return;
    const state = connection.state ?? {};
    leave(this.#room, state.clientId);
    await this.#persist();
    this.#syncAll();

    // Plus personne : on programme le ménage.
    if ([...this.getConnections()].length === 0) {
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    }
  }

  async onAlarm() {
    await this.#load();
    if ([...this.getConnections()].length > 0) {
      // Quelqu'un est revenu : on repousse le ménage.
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
      return;
    }
    this.#room = null;
    await this.ctx.storage.deleteAll();
  }

  // Réponse HTTP hors WebSocket (diagnostic : /parties/game-room/<CODE>).
  async onRequest() {
    const info = await this.info();
    if (!info) return new Response('Not Found', { status: 404 });
    return new Response(JSON.stringify({ ...info, code: isValidCode(this.name) ? this.name : '' }), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
}
