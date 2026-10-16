# Jeux à deux

Collection de mini-jeux pour 1 ou 2 joueurs sur le même écran (clone inspiré de « Jeux à deux : multijoueur »), en Svelte 5 + Vite, style cartoon.

**Jeux** : Morpion, Ultimate morpion, Ping-pong, Air hockey, Serpents, Sumo, Billard (2 couleurs), Mini-golf, Bataille navale (placement par glisser-déposer), Wheelie, Dots and Boxes, Carrom, Flobopuyo (puzzle versus façon Puyo Puyo : chaînes, déchets, clavier ou tactile).

**Party** (duels courts façon 1-2-Switch, joueurs face à face, chacun sa moitié d'écran) : Duel au far west, Combien de billes, Coffre-fort, Soda.

**Fonctions** : mode solo contre l'IA, score de coupe sauvegardé, bruitages synthétisés (WebAudio), menu burger (son, plein écran, recommencer, retour menu), animation de lancement.

## Démarrer

```bash
npm install
npm run dev      # développement
npm run build    # build statique dans dist/
npm run preview  # prévisualiser le build
```

## Structure

```
src/
  App.svelte              menu + animation de lancement
  lib/
    GameShell.svelte      score, burger, écran de victoire
    Burger.svelte         menu (son, plein écran, pause)
    sfx.svelte.js         effets sonores
    canvas.js             repère 360x640 et outils de dessin cartoon
    ShipArt.svelte        dessin des bateaux (bataille navale)
    Half.svelte           moitié d'écran d'un joueur (J2 retourné à 180°)
    Dial.svelte           molette tactile (Coffre-fort)
    UpdateBanner.svelte   bandeau « Nouvelle version disponible » (PWA)
    pwa.svelte.js         enregistrement du service worker
    puyo.js               logique pure de Flobopuyo (grille, chaînes, déchets, IA) + tests
    party/                logique pure des jeux Party + tests (duel, marbles, safe, soda)
  games/                  un composant par jeu + index.js (liste)
```

## Ajouter un jeu

1. Créer `src/games/MonJeu.svelte` (props : `mode` = `'1p'` | `'2p'`, `onpoint(joueur)`).
2. L'inscrire dans `src/games/index.js` (nom, couleur, `target` = points pour gagner).

## Android (APK)

Le projet natif (`android/`) n'est pas versionné : il est régénéré par Capacitor.

En local : `npm run build && npx cap add android && npx cap sync android`, puis `cd android && ./gradlew assembleDebug` (Android SDK requis).

Via GitHub Actions (`.github/workflows/android.yml`) : un tag `vX.Y.Z` construit l'APK et l'ajoute à la release ; un lancement manuel (`workflow_dispatch`) le publie en artefact du run. `versionName` vient de `package.json`, `versionCode` du numéro de run. L'APK est signé avec la clé debug (installation en sideload) ; une signature release demandera un keystore en secrets.

## GitHub Pages

Le site web est déployé automatiquement sur GitHub Pages à chaque push sur `main` (et manuellement via `workflow_dispatch`) grâce au workflow `.github/workflows/deploy-pages.yml`. Le build est généré dans `dist/`, packagé puis déployé. L'URL du déploiement est affichée dans l'output du workflow.

## CI

Le pipeline `Quality Checks` (`.github/workflows/ci.yml`) s'exécute à chaque push sur `main` et pull request, en trois jobs : `check` (`npm run check`, svelte-check), `test` (`npm run test:coverage`, Vitest) puis `build` (`npm run build`, qui attend les deux premiers).

## PWA

L'application est installable et fonctionne hors-ligne (`vite-plugin-pwa`, service worker généré au build). Une nouvelle version est détectée au lancement puis toutes les heures : un bandeau propose « Mettre à jour » (stratégie `prompt`, jamais de rechargement surprise en pleine partie). La version affichée dans le menu burger permet de vérifier la mise à jour. Les icônes sont dans `public/` (`icon.svg`, PNG 192/512, maskable, apple-touch-icon). Dans l'APK, le service worker est désactivé (fichiers embarqués).
