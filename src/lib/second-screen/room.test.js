import { describe, expect, it, vi } from 'vitest';
import { createRoom, isRoomCode, roomSocketUrl } from './room.js';

describe('second-screen room helpers', () => {
  it('accepts valid room codes and rejects ambiguous characters', () => {
    expect(isRoomCode('ABCD2345')).toBe(true);
    expect(isRoomCode('abcd2345')).toBe(true);
    expect(isRoomCode('ABC01234')).toBe(false);
    expect(isRoomCode('short')).toBe(false);
  });

  it('builds secure WebSocket URLs for both roles', () => {
    expect(roomSocketUrl('https://example.test', 'abcd2345', 'controller'))
      .toBe('wss://example.test/api/rooms/ABCD2345/ws?role=controller');
    expect(roomSocketUrl('http://localhost:5173', 'ABCD2345', 'display'))
      .toBe('ws://localhost:5173/api/rooms/ABCD2345/ws?role=display');
  });

  it('rejects invalid role and code', () => {
    expect(() => roomSocketUrl('https://example.test', 'bad', 'display')).toThrow();
    expect(() => roomSocketUrl('https://example.test', 'ABCD2345', 'admin')).toThrow();
  });

  it('creates a room through the API and validates the response', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'ABCD2345' })
    });
    await expect(createRoom(fetcher)).resolves.toBe('ABCD2345');
    expect(fetcher).toHaveBeenCalledWith('/api/rooms', { method: 'POST' });
  });

  it('surfaces API errors and invalid response data', async () => {
    await expect(createRoom(async () => ({ ok: false }))).rejects.toThrow('Impossible de créer la salle');
    await expect(createRoom(async () => ({ ok: true, json: async () => ({ code: 'invalid' }) })))
      .rejects.toThrow('Réponse serveur invalide');
  });
});
