# Jeux à deux

Collection de mini-jeux pour 1 ou 2 joueurs sur le même écran (clone inspiré de « Jeux à deux : multijoueur »), en Svelte 5 + Vite, style cartoon.

**Jeux** : Morpion, Ultimate morpion, Ping-pong, Air hockey, Serpents, Sumo, Billard (2 couleurs), Mini-golf, Bataille navale (placement par glisser-déposer), Wheelie, Dots and Boxes, Carrom.

**Party** (duels courts façon 1-2-Switch, joueurs face à face, chacun sa moitié d'écran) : Duel au far west, Combien de billes, Coffre-fort, Soda.

**Fonctions** : mode solo contre l'IA, score de coupe sauvegardé, bruitages synthétisés (WebAudio), menu burger (son, plein écran, recommencer, retour menu), animation de lancement, et **jeu à plusieurs appareils** (chacun sur son téléphone ou son ordinateur, via Cloudflare Workers).

## Démarrer

```bash
npm install
npm run dev      # développement
npm run build    # build statique dans dist/
npm run preview  # prévisualiser le build
```

Pour le mode multi-appareils en local, lancer le Worker à côté du serveur Vite :

```bash
npm run party:dev                        # wrangler dev sur http://localhost:8787
echo 'VITE_PARTY_HOST=localhost:8787' > .env.local
npm run dev                              # http://localhost:3000
```

`.env.local` n'est pas versionné : il indique au front quel Worker contacter. Sans lui, l'application servie par Vite ne sait pas où se trouve le salon (le mode multi n'est alors utilisable que si c'est le Worker qui sert le site).

`npm run party:e2e` (avec `npm run party:dev` actif) déroule un scénario complet de bout en bout : création de salon, deux joueurs, spectateur, coups, refus des coups illégaux, reconnexion et manche suivante.

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
    party/                logique pure des jeux Party + tests (duel, marbles, safe, soda)
    net/                  mode multi-appareils
      protocol.js         codes de salon, messages, validation (+ tests)
      room.js             machine à états du salon, sans Cloudflare (+ tests)
      games/              règles pures partagées client/serveur (+ tests)
      session.svelte.js   connexion partysocket côté navigateur
      Lobby.svelte        créer / rejoindre un salon
      RemoteGame.svelte   écran de partie en réseau
  games/                  un composant par jeu + index.js (liste)
worker/                   Worker Cloudflare : API des salons + Durable Object GameRoom
wrangler.jsonc            configuration du Worker (binding Durable Objects)
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

## Multi-appareils (Cloudflare)

Chaque joueur ouvre la même partie depuis son propre écran. Un **Durable Object Cloudflare** (`worker/game-room.js`) tient le salon : il attribue les sièges, vérifie chaque coup et rediffuse l'état, donc le serveur est autoritaire (pas de triche possible depuis la console). Le front reste statique ; seuls les échanges temps réel passent par le Worker.

Jeux disponibles pour l'instant : **Morpion** et **Dots and Boxes**. Ajouter un jeu = écrire ses règles pures dans `src/lib/net/games/` (mêmes fonctions `create` / `apply` / `result` / `turn`), l'inscrire dans `games/registry.js` et lui donner une vue `RemoteXxx.svelte`.

Fonctionnement : le premier appareil crée un salon et reçoit un **code à 4 lettres** (sans I/O/0/1). Les autres rejoignent avec le code ou le lien `?room=AB34` ; un troisième appareil devient spectateur, et un joueur qui se déconnecte retrouve son siège en revenant (identifiant conservé dans le navigateur).

### Mettre en ligne le Worker

1. Créer un compte Cloudflare et un token API (permission « Edit Cloudflare Workers »).
2. Dans le dépôt : ajouter les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`, puis la variable `PARTY_DEPLOY = true` pour activer le déploiement automatique (`.github/workflows/party.yml`).
3. Ou à la main : `npx wrangler login && npm run build && npm run party:deploy`.

Le Worker sert à la fois l'application (`dist/`) et les WebSockets, sur `https://<nom>.<compte>.workers.dev`. Si le site reste hébergé ailleurs (GitHub Pages, APK), indiquer l'adresse du Worker au build via `VITE_PARTY_HOST` (variable de dépôt `PARTY_HOST`) **et** autoriser cette origine côté Worker avec la variable `ALLOWED_ORIGINS` de `wrangler.jsonc` (par défaut, seules l'origine du Worker et localhost sont admises ; l'`Origin` est vérifiée à la mainshake WebSocket, les en-têtes CORS ne protégeant pas un handshake).

Plan gratuit : les Durable Objects *SQLite* sont inclus, avec 100 000 requêtes par jour (≈ 2 millions de messages WebSocket) — largement suffisant pour jouer entre amis. Un salon sans joueur est supprimé au bout de 12 h.

## CI

Le pipeline `Quality Checks` (`.github/workflows/ci.yml`) s'exécute à chaque push sur `main` et pull request, en quatre jobs : `check` (`npm run check`, svelte-check), `test` (`npm run test:coverage`, Vitest), `build` (`npm run build`, qui attend les deux premiers) et `worker` (bundle du Worker + `wrangler deploy --dry-run`, sans aucun secret). Le déploiement du Worker est un workflow séparé (`.github/workflows/party.yml`).

## PWA

L'application est installable et fonctionne hors-ligne (`vite-plugin-pwa`, service worker généré au build). Une nouvelle version est détectée au lancement puis toutes les heures : un bandeau propose « Mettre à jour » (stratégie `prompt`, jamais de rechargement surprise en pleine partie). La version affichée dans le menu burger permet de vérifier la mise à jour. Les icônes sont dans `public/` (`icon.svg`, PNG 192/512, maskable, apple-touch-icon). Dans l'APK, le service worker est désactivé (fichiers embarqués).
