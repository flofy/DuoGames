# @duogames/coffre-fort

Coffre-fort 3D : une chaîne est enroulée autour d'un coffre, on la démêle **en tournant le téléphone sur ses 3 axes**.
Livré comme **web component** `<coffre-fort-3d>` : il fonctionne dans DuoGames (Svelte) comme dans n'importe quelle page HTML.

## Le jeu

- Le coffre en 3D suit les rotations réelles du téléphone (capteurs d'orientation).
- La chaîne a 3 ou 4 tronçons, chacun lié à un axe (les 3 axes servent toujours, jamais deux fois de suite le même) :
  **rouge = bascule (X)**, **vert = tonneau (Y)**, **bleu = volant (Z)**. Une consigne indique le sens.
- Mauvais axe : rien ne se passe. Mauvais sens : la chaîne se ré-enroule. 1° de téléphone = 2° de chaîne défaite.
- **`1p`** : on bat le temps de l'IA. **`2p`** : chacun son tour sur la même chaîne, le plus rapide gagne (on se passe le téléphone).

Repère (règle de la main droite, écran en portrait) : X vers la droite, Y vers le haut, Z vers soi.

| Axe | Sens `+` | Sens `-` |
| --- | --- | --- |
| X bascule | le haut vient vers toi | le haut s'éloigne |
| Y tonneau | l'écran tourne vers la droite | vers la gauche |
| Z volant | volant vers la gauche ↺ | vers la droite ↻ |

Le sens réel des capteurs peut varier selon l'appareil : « Réglages capteurs » permet d'inverser chaque axe (mémorisé), et trois barres X/Y/Z montrent en direct quel axe réagit.
Sans capteurs (ordinateur, webview qui les bloque), des curseurs (ou W/S, A/D, Q/E) prennent le relais.

## Utilisation

```html
<script type="module" src="coffre-fort.js"></script>   <!-- npm run build:lib -->
<coffre-fort-3d id="jeu" mode="2p"></coffre-fort-3d>
<script>
  document.getElementById('jeu').addEventListener('roundend', (e) => {
    console.log(e.detail); // { winner: 1 | 2 | 0 (égalité), times: [ms, ms], mode }
  });
</script>
```

Dans une appli Svelte du workspace : `import('@duogames/coffre-fort')` (chargement à la demande, three.js inclus) puis `<coffre-fort-3d {mode} muted={!sound.on}>`.
Voir `src/games/SafeCrack.svelte` dans DuoGames.

### Attributs / propriétés

| Nom | Type | Défaut | Rôle |
| --- | --- | --- | --- |
| `mode` | `'1p'` \| `'2p'` | `'1p'` | contre l'IA, ou chacun son tour |
| `seed` | nombre | `0` | graine de la chaîne (`0` = aléatoire) ; même graine = mêmes chaînes (utile pour deux appareils) |
| `muted` | booléen | `false` | coupe les sons et les vibrations |
| `remote` | booléen | `false` | reçoit les mouvements du téléphone via le canal temps réel DuoGames (mode écran distant) |

### Événements

| Événement | `detail` | Quand |
| --- | --- | --- |
| `roundend` | `{ winner, times, mode }` | fin d'une manche (`bubbles` et `composed`) ; le composant propose ensuite « Manche suivante » |

### Styles

Le composant utilise un Shadow DOM. Il lit les variables CSS de l'hôte, avec des valeurs par défaut :
`--ink`, `--muted`, `--p1`, `--p2`, `--font`. Il remplit son parent (`width: 100%; height: 100%`).

## Structure

```
src/
  logic.js              logique pure : quaternions, chaîne, progression, IA (sans DOM)
  sensors.js            capteurs deviceorientation + secours curseurs / clavier
  scene.js              scène three.js : coffre, porte, butin, hélices de chaîne
  audio.js              sons synthétisés et vibrations
  CoffreFort.ce.svelte  interface et déroulé des manches (compilé en custom element)
  index.js              enregistre <coffre-fort-3d> et exporte la logique
demo/ + index.html      page de démo autonome
```

Les fichiers `*.ce.svelte` sont compilés en web component grâce à `svelte-options.js`
(`vitePlugin.dynamicCompileOptions` dans `svelte.config.js`).

## Commandes

```bash
npm run dev -w @duogames/coffre-fort         # démo autonome (hot reload)
npm run build -w @duogames/coffre-fort       # démo statique dans dist/
npm run build:lib -w @duogames/coffre-fort   # dist-lib/coffre-fort.js : un module ES unique (three.js et Svelte inclus)
npm test                                     # tests, à la racine (inclut ce paquet)
```

## Extraire dans son propre dépôt

Copier `packages/coffre-fort/` dans un nouveau repo, y ajouter `svelte` et `vite` en devDependencies, puis installer en dépendance git
(`github:flofy/coffre-fort#v1.0.0`) ou publier sur npm. Rien dans le paquet ne dépend de DuoGames.

## Limites connues

- Portrait uniquement. Sur iPhone, une autorisation « mouvement et orientation » est demandée au premier « Prêt ».
- Dans une webview ou un iframe qui bloque les capteurs, on retombe sur les curseurs.
