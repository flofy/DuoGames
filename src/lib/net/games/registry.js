// Jeux jouables à distance : chaque entrée associe des métadonnées (affichage,
// cible de manches) au module de règles pures utilisé par le client ET le serveur.
import * as tictactoe from './tictactoe.js';
import * as dots from './dots.js';

const modules = [tictactoe, dots];

// Pour l'interface : { id, name, emoji, color, desc, target, rules }
export const remoteGames = modules.map((m) => ({ ...m.meta, rules: m }));

export const getRuleSet = (id) => modules.find((m) => m.meta.id === id) ?? null;

export const getRemoteGame = (id) => remoteGames.find((g) => g.id === id) ?? null;

export const isRemoteGame = (id) => getRuleSet(id) !== null;
