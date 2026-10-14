import { describe, it, expect } from 'vitest';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  MAX_NAME,
  cleanName,
  decode,
  encode,
  isValidCode,
  makeCode,
  normalizeCode,
  roomFromQuery,
  roomLink,
  slug
} from './protocol.js';

describe('codes de salon', () => {
  it('génère des codes de 4 caractères sans ambiguïté', () => {
    // rng figé : on doit pouvoir prédire le code exact
    const code = makeCode(() => 0);
    expect(code).toBe(CODE_ALPHABET[0].repeat(CODE_LENGTH));
    expect(code).toHaveLength(CODE_LENGTH);
    expect(code).not.toMatch(/[IO01]/);
  });

  it('reste dans l’alphabet quel que soit le tirage', () => {
    for (let i = 0; i < 200; i++) {
      const code = makeCode();
      expect(isValidCode(code)).toBe(true);
    }
  });

  it('nettoie une saisie approximative', () => {
    expect(normalizeCode('ab-34!')).toBe('AB34');
    expect(normalizeCode('k 7 7 d')).toBe('K77D');
    expect(normalizeCode(null)).toBe('');
    expect(normalizeCode('OUTIL')).toBe('UTL'); // I, O, 0 et 1 ne font pas partie de l'alphabet
  });

  it('rejette les codes invalides', () => {
    expect(isValidCode('AB3')).toBe(false);
    expect(isValidCode('AB34')).toBe(true);
    expect(isValidCode('ABIO')).toBe(false);
    expect(isValidCode('AB10')).toBe(false);
    expect(isValidCode(42)).toBe(false);
  });

  it('normalise le pseudo', () => {
    expect(cleanName('  Alice   B  ')).toBe('Alice B');
    expect(cleanName('')).toBe('Joueur');
    expect(cleanName('x'.repeat(50))).toHaveLength(MAX_NAME);
  });
});

describe('encodage des messages', () => {
  it('fait un aller-retour', () => {
    const msg = { t: 'move', move: { cell: 4 } };
    expect(decode(encode(msg))).toEqual(msg);
  });

  it('refuse ce qui n’est pas un message', () => {
    expect(decode('pas du json')).toBeNull();
    expect(decode('[1,2,3]')).toBeNull();
    expect(decode('{}')).toBeNull();
    expect(decode(encode({ payload: 1 }))).toBeNull(); // pas de champ `t`
    expect(decode(new Uint8Array([1, 2]))).toBeNull();
  });

  it('refuse un message trop gros', () => {
    const huge = encode({ t: 'move', move: { blob: 'x'.repeat(5000) } });
    expect(decode(huge)).toBeNull();
  });
});

describe('liens de salon', () => {
  it('construit un lien partageable', () => {
    expect(roomLink('https://exemple.fr/jeux/?autre=1#x', 'K77D')).toBe('https://exemple.fr/jeux/?room=K77D');
  });

  it('relit un code depuis l’URL', () => {
    expect(roomFromQuery('?room=k77d')).toBe('K77D');
    expect(roomFromQuery('?room=nope')).toBe('');
    expect(roomFromQuery('', '#AB34')).toBe('AB34');
    expect(roomFromQuery('')).toBe('');
  });

  it('slugifie pour les URL', () => {
    expect(slug('Dots and Boxes')).toBe('dots-and-boxes');
  });
});
