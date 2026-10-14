import { describe, it, expect } from 'vitest';
import { advance, createRoom, join, leave, play, seatOf, setReady, viewFor, PHASES } from './room.js';
import { makeCode, normalizeCode } from './protocol.js';

// Salon prêt à jouer : deux joueurs assis et prêts.
function readyRoom(game = 'ttt') {
  const room = createRoom(game);
  join(room, { clientId: 'a', name: 'Alice' });
  join(room, { clientId: 'b', name: 'Bob' });
  setReady(room, 1, true);
  setReady(room, 2, true);
  advance(room);
  return room;
}

describe('salon multi-appareils', () => {
  it('refuse un jeu inconnu', () => {
    expect(createRoom('pas-un-jeu')).toBeNull();
    expect(createRoom('ttt')).not.toBeNull();
  });

  it('assied les joueurs dans l’ordre puis passe en spectateur', () => {
    const room = createRoom('ttt');
    expect(join(room, { clientId: 'a', name: 'Alice' }).seat).toBe(1);
    expect(join(room, { clientId: 'b', name: 'Bob' }).seat).toBe(2);
    const third = join(room, { clientId: 'c', name: 'Carla' });
    expect(third.spectator).toBe(true);
    expect(third.seat).toBe(0);
    expect(seatOf(room, 'c')).toBe(0);
  });

  it('redonne son siège à un joueur connu', () => {
    const room = createRoom('ttt');
    join(room, { clientId: 'a', name: 'Alice' });
    const again = join(room, { clientId: 'a', name: 'Alix' });
    expect(again).toEqual({ seat: 1, spectator: false, reclaimed: true });
    expect(room.players[0].name).toBe('Alix');
  });

  it('libère le siège en lobby mais le garde en partie', () => {
    const lobby = createRoom('ttt');
    join(lobby, { clientId: 'a', name: 'Alice' });
    leave(lobby, 'a');
    expect(seatOf(lobby, 'a')).toBe(0);
    expect(join(lobby, { clientId: 'x', name: 'Xav' }).seat).toBe(1);

    const started = readyRoom();
    leave(started, 'a');
    expect(started.players[0].connected).toBe(false);
    expect(seatOf(started, 'a')).toBe(1); // siège réservé pour la reconnexion
    expect(started.players[0].ready).toBe(false);
  });

  it('démarre la manche quand tout le monde est prêt', () => {
    const room = createRoom('ttt');
    join(room, { clientId: 'a', name: 'Alice' });
    setReady(room, 1, true);
    expect(advance(room)).toBe(false); // Bob n'est pas encore assis
    join(room, { clientId: 'b', name: 'Bob' });
    setReady(room, 2, true);
    expect(advance(room)).toBe(true);
    expect(room.phase).toBe(PHASES.PLAYING);
    expect(room.state.board).toHaveLength(9);
    expect(room.players.every((p) => p.ready === false)).toBe(true);
  });

  it('applique un coup et détecte la fin de manche', () => {
    const room = readyRoom();
    play(room, 1, { cell: 0 });
    play(room, 2, { cell: 3 });
    play(room, 1, { cell: 1 });
    play(room, 2, { cell: 4 });
    const res = play(room, 1, { cell: 2 });
    expect(res.over.winner).toBe(1);
    expect(room.phase).toBe(PHASES.ROUND);
    expect(room.scores).toEqual([1, 0]);
    expect(room.roundWinner).toBe(1);
  });

  it('refuse les coups hors tour et une fois la manche finie', () => {
    const room = readyRoom();
    expect(play(room, 2, { cell: 0 }).error).toBe('NOT_YOUR_TURN');
    play(room, 1, { cell: 0 });
    play(room, 2, { cell: 3 });
    play(room, 1, { cell: 1 });
    play(room, 2, { cell: 4 });
    play(room, 1, { cell: 2 });
    expect(play(room, 2, { cell: 6 }).error).toBe('NOT_READY');
    expect(setReady(room, 1, true)).toBe(true); // on peut se déclarer prêt pour la suite
  });

  it('atteint l’état « match » au score cible', () => {
    const room = readyRoom();
    for (let round = 1; round <= 3; round++) {
      play(room, 1, { cell: 0 });
      play(room, 2, { cell: 3 });
      play(room, 1, { cell: 1 });
      play(room, 2, { cell: 4 });
      play(room, 1, { cell: 2 });
      if (round < 3) {
        setReady(room, 1, true);
        setReady(room, 2, true);
        advance(room);
      }
    }
    expect(room.phase).toBe(PHASES.MATCH);
    expect(room.scores).toEqual([3, 0]);
  });

  it('remet les compteurs à zéro après un match', () => {
    const room = createRoom('dots');
    join(room, { clientId: 'a', name: 'Alice' });
    join(room, { clientId: 'b', name: 'Bob' });
    room.scores = [1, 0];
    room.phase = PHASES.MATCH;
    setReady(room, 1, true);
    setReady(room, 2, true);
    expect(advance(room)).toBe(true);
    expect(room.scores).toEqual([0, 0]);
    expect(room.round).toBe(1);
    expect(room.phase).toBe(PHASES.PLAYING);
  });

  it('personnalise la vue avec le siège du destinataire', () => {
    const room = readyRoom();
    const joueur = viewFor(room, 1);
    const spectateur = viewFor(room, 0);
    expect(joueur.you).toEqual({ seat: 1, spectator: false });
    expect(spectateur.you).toEqual({ seat: 0, spectator: true });
    expect(joueur.state).toBe(room.state);
    expect(joueur.players.map((p) => p?.name)).toEqual(['Alice', 'Bob']);
    expect(joueur.target).toBe(3);
  });

  it('normalise les codes de salon comme le protocole', () => {
    expect(normalizeCode(makeCode(() => 0.5))).toHaveLength(4);
  });
});
