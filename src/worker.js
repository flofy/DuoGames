const ROOM_CODE = /^[A-HJ-NP-Z2-9]{8}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const code = createRoomCode();
      return Response.json({ code }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const match = url.pathname.match(/^\/api\/rooms\/([A-HJ-NP-Z2-9]{8})\/ws$/);
    if (match && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const code = match[1];
      if (!ROOM_CODE.test(code)) return new Response('Invalid room code', { status: 400 });
      const role = url.searchParams.get('role');
      if (role !== 'display' && role !== 'controller') {
        return new Response('Invalid room role', { status: 400 });
      }
      const id = env.GAME_ROOMS.idFromName(code);
      return env.GAME_ROOMS.get(id).fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};

function createRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
}

export class GameRoom {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket upgrade required', { status: 426 });
    }

    const role = new URL(request.url).searchParams.get('role');
    if (role !== 'display' && role !== 'controller') {
      return new Response('Invalid room role', { status: 400 });
    }

    // One display and one controller per room. A reconnect replaces the old socket.
    for (const socket of this.ctx.getWebSockets(role)) {
      try { socket.close(4001, 'Replaced by a new connection'); } catch {}
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [role]);
    server.serializeAttachment({ role, connectedAt: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, message) {
    if (typeof message !== 'string' || message.length > 2048) {
      socket.close(1009, 'Message too large');
      return;
    }

    let payload;
    try { payload = JSON.parse(message); } catch {
      socket.close(1007, 'Invalid JSON');
      return;
    }

    const role = socket.deserializeAttachment()?.role;
    const validControllerMessage =
      role === 'controller' &&
      payload?.type === 'controller:angle' &&
      Number.isFinite(payload.angle) &&
      payload.angle >= 0 &&
      payload.angle < 360;
    const validDisplayMessage =
      role === 'display' &&
      payload?.type === 'display:state' &&
      typeof payload.state === 'object' &&
      payload.state !== null;

    if (!validControllerMessage && !validDisplayMessage) return;

    const recipients = this.ctx.getWebSockets(role === 'controller' ? 'display' : 'controller');
    const serialized = JSON.stringify(payload);
    for (const recipient of recipients) {
      try { recipient.send(serialized); } catch {}
    }
  }

  webSocketClose(socket) {
    try { socket.close(); } catch {}
  }

  webSocketError(socket) {
    try { socket.close(1011, 'Socket error'); } catch {}
  }
}
