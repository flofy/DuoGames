const ROOM_CODE = /^[A-HJ-NP-Z2-9]{8}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      return Response.json({ code: createRoomCode() }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const match = url.pathname.match(/^\/api\/rooms\/([A-HJ-NP-Z2-9]{8})\/ws$/);
    if (match && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const code = match[1];
      if (!ROOM_CODE.test(code)) return new Response('Invalid room code', { status: 400 });
      const role = url.searchParams.get('role');
      if (role !== 'display' && role !== 'controller') return new Response('Invalid room role', { status: 400 });
      return env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(code)).fetch(request);
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
  constructor(ctx) { this.ctx = ctx; }

  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket upgrade required', { status: 426 });
    }
    const role = new URL(request.url).searchParams.get('role');
    if (role !== 'display' && role !== 'controller') return new Response('Invalid room role', { status: 400 });

    for (const socket of this.ctx.getWebSockets(role)) {
      try { socket.close(4001, 'Replaced by a new connection'); } catch {}
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [role]);
    server.serializeAttachment({ role });
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
    const validReady = role === 'controller' && payload?.type === 'controller:ready';
    const validMotion = role === 'controller' && payload?.type === 'controller:motion' &&
      Array.isArray(payload.v) && payload.v.length === 3 &&
      payload.v.every((value) => Number.isFinite(value) && Math.abs(value) <= 60);
    if (!validReady && !validMotion) return;

    for (const recipient of this.ctx.getWebSockets('display')) {
      try { recipient.send(JSON.stringify(payload)); } catch {}
    }
  }

  webSocketClose(socket) { try { socket.close(); } catch {} }
  webSocketError(socket) { try { socket.close(1011, 'Socket error'); } catch {} }
}
