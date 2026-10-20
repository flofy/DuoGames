const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export function isRoomCode(value) {
  return typeof value === 'string' && ROOM_CODE_PATTERN.test(value.toUpperCase());
}

export function roomSocketUrl(baseUrl, code, role) {
  if (!isRoomCode(code)) throw new TypeError('Code de salle invalide');
  if (role !== 'display' && role !== 'controller') throw new TypeError('Rôle invalide');
  const url = new URL(`/api/rooms/${code.toUpperCase()}/ws`, baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('role', role);
  return url.toString();
}

export async function createRoom(fetcher = fetch) {
  const response = await fetcher('/api/rooms', { method: 'POST' });
  if (!response.ok) throw new Error('Impossible de créer la salle');
  const result = await response.json();
  if (!isRoomCode(result.code)) throw new Error('Réponse serveur invalide');
  return result.code;
}

export function connectRoom({ code, role, onMessage = () => {}, onStatus = () => {}, baseUrl = globalThis.location?.origin }) {
  if (!baseUrl) throw new Error('Adresse de l’application indisponible');
  const socket = new WebSocket(roomSocketUrl(baseUrl, code, role));
  socket.addEventListener('open', () => onStatus('connected'));
  socket.addEventListener('close', () => onStatus('disconnected'));
  socket.addEventListener('error', () => onStatus('error'));
  socket.addEventListener('message', (event) => {
    try { onMessage(JSON.parse(event.data)); } catch { /* Ignore malformed messages. */ }
  });

  return {
    send(message) {
      if (socket.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify(message));
      return true;
    },
    close() { socket.close(); }
  };
}
