import TicTacToe from './TicTacToe.svelte';
import UltimateTTT from './UltimateTTT.svelte';
import PingPong from './PingPong.svelte';
import AirHockey from './AirHockey.svelte';
import Snakes from './Snakes.svelte';
import Sumo from './Sumo.svelte';
import Billiards from './Billiards.svelte';
import MiniGolf from './MiniGolf.svelte';
import SeaBattle from './SeaBattle.svelte';
import Wheelie from './Wheelie.svelte';
import DotsBoxes from './DotsBoxes.svelte';
import Carrom from './Carrom.svelte';
import Puyo from './Puyo.svelte';
import FarWest from './FarWest.svelte';
import Marbles from './Marbles.svelte';
import SafeCrack from './SafeCrack.svelte';
import Soda from './Soda.svelte';

export const games = [
  { id: 'ttt', dom: true, name: 'Morpion', emoji: '❌', target: 3, component: TicTacToe, color: '#ff7a59', desc: 'Alignez 3 symboles' },
  { id: 'uttt', dom: true, name: 'Ultimate morpion', emoji: '🔳', target: 1, component: UltimateTTT, color: '#ff5fa2', desc: '9 grilles, un seul vainqueur' },
  { id: 'pong', name: 'Ping-pong', emoji: '🏓', target: 5, component: PingPong, color: '#19c3a3', desc: 'Glissez la raquette' },
  { id: 'hockey', name: 'Air hockey', emoji: '🥅', target: 5, component: AirHockey, color: '#4f7cff', desc: 'Marquez dans le but adverse' },
  { id: 'snakes', name: 'Serpents', emoji: '🐍', target: 3, component: Snakes, color: '#7ed321', desc: 'Ne touchez ni mur ni serpent' },
  { id: 'sumo', name: 'Sumo', emoji: '🤼', target: 3, component: Sumo, color: '#ff9f1c', desc: 'Tapez pour charger, poussez dehors' },
  { id: 'billard', name: 'Billard', emoji: '🎱', target: 1, component: Billiards, color: '#2fbf71', desc: 'Bleues contre rouges' },
  { id: 'golf', name: 'Mini-golf', emoji: '⛳', target: 3, component: MiniGolf, color: '#b6e33a', desc: '6 trous, le moins de coups gagne' },
  { id: 'navale', dom: true, name: 'Bataille navale', emoji: '🚢', target: 1, component: SeaBattle, color: '#26b5e8', desc: 'Placez et coulez la flotte' },
  { id: 'wheelie', name: 'Wheelie', emoji: '🏍️', target: 3, component: Wheelie, color: '#ffb703', desc: 'Cabrez pour aller plus vite' },
  { id: 'dots', name: 'Dots and Boxes', emoji: '🔲', target: 1, component: DotsBoxes, color: '#c77dff', desc: 'Fermez un maximum de carrés' },
  { id: 'carrom', name: 'Carrom', emoji: '🎯', target: 1, component: Carrom, color: '#e8863a', desc: "Rentrez vos pièces avant l'autre" },
  { id: 'puyo', dom: true, party: true, name: 'Flobopuyo', emoji: '🟢', target: 3, component: Puyo, color: '#4cd964', desc: 'Alignez 4 blobs, envoyez des déchets' },
  // Party : duels courts façon 1-2-Switch (moitiés d'écran face à face)
  { id: 'ouest', dom: true, party: true, half: true, name: 'Duel au far west', emoji: '🤠', target: 3, component: FarWest, color: '#e07a3f', desc: 'Dégainez après le signal' },
  { id: 'billes', dom: true, party: true, half: true, name: 'Combien de billes', emoji: '🔵', target: 3, component: Marbles, color: '#3f8fe0', desc: 'Cachez, devinez, bluffez' },
  { id: 'coffre', dom: true, party: true, half: true, name: 'Coffre-fort', emoji: '🔐', target: 3, component: SafeCrack, color: '#6c5ce7', desc: 'Tournez la molette, trouvez le code' },
  { id: 'soda', dom: true, party: true, half: true, name: 'Soda', emoji: '🥤', target: 3, component: Soda, color: '#e8484f', desc: 'Secouez sans faire exploser' }
];
