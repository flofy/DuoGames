# Jeux à deux

Collection de mini-jeux pour 1 ou 2 joueurs sur le même écran (clone inspiré de « Jeux à deux : multijoueur »), en Svelte 5 + Vite, style cartoon.

**Jeux** : Morpion, Ultimate morpion, Ping-pong, Air hockey, Serpents, Sumo, Billard (2 couleurs), Mini-golf, Bataille navale (placement par glisser-déposer), Wheelie, Dots and Boxes, Carrom.

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
  games/                  un composant par jeu + index.js (liste)
```

## Ajouter un jeu

1. Créer `src/games/MonJeu.svelte` (props : `mode` = `'1p'` | `'2p'`, `onpoint(joueur)`).
2. L'inscrire dans `src/games/index.js` (nom, couleur, `target` = points pour gagner).

## Android

Emballage possible avec Capacitor : `npm i @capacitor/core @capacitor/cli @capacitor/android`, `npx cap init`, `npm run build`, `npx cap add android`, `npx cap sync`.

## GitHub Pages

Le site web est déployé automatiquement sur GitHub Pages à chaque push sur `main` (et manuellement via `workflow_dispatch`) grâce au workflow `.github/workflows/deploy-pages.yml`. Le build SvelteKit est généré dans `dist/`, packagé puis déployé. L'URL du déploiement est affichée dans l'output du workflow.

## CI

Le pipeline `Quality Checks` (`.github/workflows/ci.yml`) s'exécute à chaque push et pull request sur `main` : installation des dépendances (`npm ci`), build, puis les tests avec couverture (`npm run test:coverage`, Vitest).

## PWA et icône

L'application est prévue pour être installable (PWA) : `public/icon.svg`, `public/manifest.webmanifest`, et les favicons dans `index.html` (apple-touch-icon, theme-color). L'icône natif Android est déjà prise en charge par les ressources `mipmap` de `android/app/src/main/res` (`ic_launcher`).
